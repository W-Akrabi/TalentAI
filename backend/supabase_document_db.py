import json
import re
from copy import deepcopy
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote, unquote, urlsplit, urlunsplit

import asyncpg


_TABLE_NAME_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def _is_operator_dict(value: Any) -> bool:
    return isinstance(value, dict) and any(str(k).startswith("$") for k in value.keys())


def _get_field(doc: Dict[str, Any], path: str) -> Any:
    current: Any = doc
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def _set_field(doc: Dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    current = doc
    for part in parts[:-1]:
        if not isinstance(current.get(part), dict):
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value


def _apply_projection(doc: Dict[str, Any], projection: Optional[Dict[str, int]]) -> Dict[str, Any]:
    if not projection:
        return deepcopy(doc)

    include_fields = [k for k, v in projection.items() if v and k != "_id"]
    exclude_fields = [k for k, v in projection.items() if not v and k != "_id"]

    if include_fields:
        projected: Dict[str, Any] = {}
        for key in include_fields:
            value = _get_field(doc, key)
            if value is not None:
                _set_field(projected, key, deepcopy(value))
        return projected

    projected = deepcopy(doc)
    for key in exclude_fields:
        projected.pop(key, None)
    return projected


def _matches_operator(actual: Any, expected: Dict[str, Any]) -> bool:
    for op, value in expected.items():
        if op == "$options":
            continue

        if op == "$in":
            if isinstance(actual, list):
                if not any(item in value for item in actual):
                    return False
            elif actual not in value:
                return False
            continue

        if op == "$regex":
            flags = re.IGNORECASE if "i" in str(expected.get("$options", "")) else 0
            try:
                pattern = re.compile(str(value), flags)
            except re.error:
                return False
            if not pattern.search(str(actual or "")):
                return False
            continue

        return False

    return True


def _matches_query(doc: Dict[str, Any], query: Optional[Dict[str, Any]]) -> bool:
    if not query:
        return True

    for key, expected in query.items():
        if key == "$or":
            if not any(_matches_query(doc, sub_query) for sub_query in expected):
                return False
            continue

        actual = _get_field(doc, key)

        if _is_operator_dict(expected):
            if not _matches_operator(actual, expected):
                return False
            continue

        if isinstance(actual, list):
            if expected not in actual:
                return False
            continue

        if actual != expected:
            return False

    return True


def _sort_key(value: Any) -> Tuple[bool, Any]:
    if isinstance(value, (int, float, str, bool)) or value is None:
        return (value is None, value)
    return (False, str(value))


def _apply_update(doc: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    next_doc = deepcopy(doc)

    for op, payload in (update or {}).items():
        if op == "$set":
            for field, value in payload.items():
                _set_field(next_doc, field, value)
            continue

        if op == "$inc":
            for field, value in payload.items():
                current = _get_field(next_doc, field) or 0
                _set_field(next_doc, field, current + value)
            continue

        if op == "$push":
            for field, value in payload.items():
                current = _get_field(next_doc, field)
                if not isinstance(current, list):
                    current = []
                current.append(value)
                _set_field(next_doc, field, current)
            continue

        if op == "$pull":
            for field, value in payload.items():
                current = _get_field(next_doc, field)
                if not isinstance(current, list):
                    current = []
                current = [item for item in current if item != value]
                _set_field(next_doc, field, current)
            continue

    return next_doc


def _extract_upsert_base(query: Dict[str, Any]) -> Dict[str, Any]:
    base: Dict[str, Any] = {}
    for key, value in (query or {}).items():
        if key.startswith("$"):
            continue
        if _is_operator_dict(value):
            continue
        _set_field(base, key, deepcopy(value))
    return base


def _eval_expr(expr: Any, doc: Dict[str, Any]) -> Any:
    if isinstance(expr, str):
        if expr == "$$ROOT":
            return doc
        if expr.startswith("$"):
            return _get_field(doc, expr[1:])
        return expr

    if isinstance(expr, dict):
        if "$cond" in expr:
            cond_expr, true_expr, false_expr = expr["$cond"]
            return _eval_expr(true_expr, doc) if _eval_condition(cond_expr, doc) else _eval_expr(false_expr, doc)
        if "$eq" in expr:
            lhs, rhs = expr["$eq"]
            return _eval_expr(lhs, doc) == _eval_expr(rhs, doc)

    return expr


def _eval_condition(cond: Any, doc: Dict[str, Any]) -> bool:
    if isinstance(cond, dict) and "$eq" in cond:
        lhs, rhs = cond["$eq"]
        return _eval_expr(lhs, doc) == _eval_expr(rhs, doc)
    return bool(_eval_expr(cond, doc))


class SupabaseAggregateCursor:
    def __init__(self, collection: "SupabaseCollection", pipeline: List[Dict[str, Any]]):
        self._collection = collection
        self._pipeline = pipeline

    async def to_list(self, limit: int) -> List[Dict[str, Any]]:
        docs = await self._collection._aggregate_docs(self._pipeline)
        return docs[:limit]


class SupabaseCursor:
    def __init__(self, collection: "SupabaseCollection", query: Dict[str, Any], projection: Optional[Dict[str, int]]):
        self._collection = collection
        self._query = query
        self._projection = projection
        self._limit: Optional[int] = None
        self._sorts: List[Tuple[str, int]] = []

    def sort(self, field: str, direction: int) -> "SupabaseCursor":
        self._sorts.append((field, direction))
        return self

    def limit(self, n: int) -> "SupabaseCursor":
        self._limit = n
        return self

    async def to_list(self, limit: int) -> List[Dict[str, Any]]:
        docs = await self._collection._find_docs(self._query)

        for field, direction in reversed(self._sorts):
            docs.sort(key=lambda d: _sort_key(_get_field(d, field)), reverse=direction < 0)

        final_limit = self._limit if self._limit is not None else limit
        docs = docs[:final_limit]
        return [_apply_projection(doc, self._projection) for doc in docs]


class SupabaseCollection:
    def __init__(self, database: "SupabaseDocumentDB", name: str):
        self._db = database
        self._name = name

    async def _all_rows(self) -> List[Tuple[int, Dict[str, Any]]]:
        await self._db._ensure_table(self._name)
        table = self._db._safe_table(self._name)

        async with self._db.pool.acquire() as conn:
            rows = await conn.fetch(f'SELECT pk, doc FROM "{table}"')

        result: List[Tuple[int, Dict[str, Any]]] = []
        for row in rows:
            doc = row["doc"]
            if isinstance(doc, str):
                doc = json.loads(doc)
            result.append((row["pk"], doc))
        return result

    async def _find_docs(self, query: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        rows = await self._all_rows()
        return [doc for _, doc in rows if _matches_query(doc, query)]

    async def _matching_rows(self, query: Optional[Dict[str, Any]]) -> List[Tuple[int, Dict[str, Any]]]:
        rows = await self._all_rows()
        return [(pk, doc) for pk, doc in rows if _matches_query(doc, query)]

    async def _update_row(self, pk: int, doc: Dict[str, Any]) -> None:
        table = self._db._safe_table(self._name)
        payload = json.dumps(doc)
        async with self._db.pool.acquire() as conn:
            await conn.execute(f'UPDATE "{table}" SET doc = $1::jsonb WHERE pk = $2', payload, pk)

    async def _aggregate_docs(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        docs = await self._find_docs({})

        for stage in pipeline:
            if "$match" in stage:
                docs = [doc for doc in docs if _matches_query(doc, stage["$match"])]
                continue

            if "$sort" in stage:
                sort_spec = stage["$sort"]
                for field, direction in reversed(list(sort_spec.items())):
                    docs.sort(key=lambda d: _sort_key(_get_field(d, field)), reverse=direction < 0)
                continue

            if "$group" in stage:
                group_spec = stage["$group"]
                grouped: Dict[str, Dict[str, Any]] = {}

                for doc in docs:
                    key_value = _eval_expr(group_spec["_id"], doc)
                    key_hash = json.dumps(key_value, sort_keys=True, default=str)

                    if key_hash in grouped:
                        continue

                    entry: Dict[str, Any] = {"_id": key_value}
                    for out_field, accumulator in group_spec.items():
                        if out_field == "_id":
                            continue
                        if isinstance(accumulator, dict) and "$first" in accumulator:
                            entry[out_field] = _eval_expr(accumulator["$first"], doc)
                    grouped[key_hash] = entry

                docs = list(grouped.values())
                continue

            raise NotImplementedError(f"Unsupported aggregation stage: {list(stage.keys())}")

        return docs

    async def insert_one(self, doc: Dict[str, Any]) -> None:
        await self._db._ensure_table(self._name)
        table = self._db._safe_table(self._name)
        payload = json.dumps(doc)
        async with self._db.pool.acquire() as conn:
            await conn.execute(f'INSERT INTO "{table}" (doc) VALUES ($1::jsonb)', payload)

    async def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, int]] = None) -> Optional[Dict[str, Any]]:
        rows = await self._matching_rows(query)
        if not rows:
            return None
        _, doc = rows[0]
        return _apply_projection(doc, projection)

    def find(self, query: Dict[str, Any], projection: Optional[Dict[str, int]] = None) -> SupabaseCursor:
        return SupabaseCursor(self, query, projection)

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False) -> None:
        rows = await self._matching_rows(query)
        if rows:
            pk, doc = rows[0]
            await self._update_row(pk, _apply_update(doc, update))
            return

        if upsert:
            base = _extract_upsert_base(query)
            new_doc = _apply_update(base, update)
            await self.insert_one(new_doc)

    async def update_many(self, query: Dict[str, Any], update: Dict[str, Any]) -> None:
        rows = await self._matching_rows(query)
        for pk, doc in rows:
            await self._update_row(pk, _apply_update(doc, update))

    async def delete_one(self, query: Dict[str, Any]) -> None:
        rows = await self._matching_rows(query)
        if not rows:
            return
        pk, _ = rows[0]
        table = self._db._safe_table(self._name)
        async with self._db.pool.acquire() as conn:
            await conn.execute(f'DELETE FROM "{table}" WHERE pk = $1', pk)

    async def count_documents(self, query: Dict[str, Any]) -> int:
        rows = await self._matching_rows(query)
        return len(rows)

    def aggregate(self, pipeline: List[Dict[str, Any]]) -> SupabaseAggregateCursor:
        return SupabaseAggregateCursor(self, pipeline)


class SupabaseDocumentDB:
    def __init__(self, dsn: str):
        self._dsn = dsn
        self._pool: Optional[asyncpg.Pool] = None
        self._ensured_tables: set[str] = set()

    @property
    def pool(self) -> asyncpg.Pool:
        if self._pool is None:
            raise RuntimeError("Supabase pool not initialized")
        return self._pool

    def _safe_table(self, name: str) -> str:
        if not _TABLE_NAME_RE.match(name):
            raise ValueError(f"Invalid table name: {name}")
        return name

    async def _ensure_pool(self) -> None:
        if self._pool is not None:
            return
        if self._dsn.startswith("postgresql://") and "@" not in self._dsn:
            raise ValueError(
                "SUPABASE_DB_URL appears truncated (missing '@'). "
                "If your password contains '#', quote the full URL in .env."
            )
        dsn = self._sanitize_dsn(self._dsn)
        self._pool = await asyncpg.create_pool(dsn=dsn, min_size=1, max_size=10)

    @staticmethod
    def _sanitize_dsn(dsn: str) -> str:
        """
        Ensure username/password segments are URL-encoded for asyncpg parsing.
        This prevents failures when the password contains reserved URI chars
        like ':' or '@' and the user pasted a raw connection string.
        """
        if not dsn or "://" not in dsn or "@" not in dsn:
            return dsn

        parts = urlsplit(dsn)
        if not parts.netloc or "@" not in parts.netloc:
            return dsn

        userinfo, hostinfo = parts.netloc.rsplit("@", 1)
        if ":" in userinfo:
            username, password = userinfo.split(":", 1)
            safe_user = quote(unquote(username), safe="")
            safe_pass = quote(unquote(password), safe="")
            safe_netloc = f"{safe_user}:{safe_pass}@{hostinfo}"
        else:
            safe_user = quote(unquote(userinfo), safe="")
            safe_netloc = f"{safe_user}@{hostinfo}"

        return urlunsplit((parts.scheme, safe_netloc, parts.path, parts.query, parts.fragment))

    async def _ensure_table(self, table_name: str) -> None:
        await self._ensure_pool()
        table = self._safe_table(table_name)
        if table in self._ensured_tables:
            return

        async with self.pool.acquire() as conn:
            await conn.execute(
                f'''
                CREATE TABLE IF NOT EXISTS "{table}" (
                    pk BIGSERIAL PRIMARY KEY,
                    doc JSONB NOT NULL
                )
                '''
            )
            await conn.execute(
                f'''
                CREATE UNIQUE INDEX IF NOT EXISTS "uq_{table}_id"
                ON "{table}" ((doc->>'id'))
                WHERE doc ? 'id'
                '''
            )
            await conn.execute(
                f'''
                CREATE INDEX IF NOT EXISTS "idx_{table}_created_at"
                ON "{table}" ((doc->>'created_at'))
                '''
            )

        self._ensured_tables.add(table)

    async def connect(self) -> None:
        await self._ensure_pool()

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
            self._ensured_tables.clear()

    def __getattr__(self, item: str) -> SupabaseCollection:
        return SupabaseCollection(self, item)
