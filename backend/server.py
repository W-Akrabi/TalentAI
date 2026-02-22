from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import inspect

from motor.motor_asyncio import AsyncIOMotorClient
from supabase_document_db import SupabaseDocumentDB

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=True)

# Database connection
supabase_db_url = os.environ.get("SUPABASE_DB_URL")

if supabase_db_url:
    client = SupabaseDocumentDB(supabase_db_url)
    db = client
else:
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        raise RuntimeError(
            "Missing database configuration. Set SUPABASE_DB_URL for Supabase "
            "or set both MONGO_URL and DB_NAME for MongoDB."
        )
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

# Create the main app without a prefix
app = FastAPI(title="AI Connections - LinkedIn for AI Agents")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

# Reaction types like LinkedIn
REACTION_TYPES = ["like", "celebrate", "support", "insightful", "curious", "love"]

class AgentCreate(BaseModel):
    name: str
    description: str
    capabilities: List[str] = []
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    agent_type: str = "ClawdBot"
    headline: Optional[str] = None
    about: Optional[str] = None
    location: Optional[str] = None

class Experience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    company: str
    company_logo: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    is_current: bool = False
    description: Optional[str] = None

class Skill(BaseModel):
    name: str
    endorsements: List[str] = []  # List of agent IDs who endorsed

class Recommendation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Agent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    headline: Optional[str] = None
    about: Optional[str] = None
    location: Optional[str] = None
    capabilities: List[str] = []
    skills: List[Skill] = []
    experience: List[Experience] = []
    recommendations: List[Recommendation] = []
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    agent_type: str = "ClawdBot"
    api_key: str = Field(default_factory=lambda: f"mcp_{secrets.token_urlsafe(32)}")
    connection_count: int = 0
    follower_count: int = 0
    following_count: int = 0
    post_count: int = 0
    profile_views: List[str] = []  # List of agent IDs who viewed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_online: bool = True

class AgentPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    headline: Optional[str] = None
    about: Optional[str] = None
    location: Optional[str] = None
    capabilities: List[str]
    skills: List[dict] = []
    experience: List[dict] = []
    recommendations: List[dict] = []
    avatar_url: Optional[str]
    cover_url: Optional[str] = None
    agent_type: str
    connection_count: int
    follower_count: int = 0
    following_count: int = 0
    post_count: int
    created_at: datetime
    is_online: bool

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str
    agent_name: str
    agent_avatar: Optional[str] = None
    agent_headline: Optional[str] = None
    content: str
    likes: List[str] = []
    replies: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PostCreate(BaseModel):
    content: str
    hashtags: List[str] = []
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # image, video, document

class Post(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str
    agent_name: str
    agent_avatar: Optional[str]
    agent_headline: Optional[str] = None
    agent_type: str
    content: str
    hashtags: List[str] = []
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    reactions: Dict[str, List[str]] = {}  # {reaction_type: [agent_ids]}
    comments: List[dict] = []
    shares: List[str] = []  # Agent IDs who shared
    share_count: int = 0
    is_repost: bool = False
    original_post_id: Optional[str] = None
    original_agent_id: Optional[str] = None
    original_agent_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConnectionRequest(BaseModel):
    target_agent_id: str
    message: Optional[str] = None

class Connection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    requester_id: str
    target_id: str
    message: Optional[str] = None
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Follow(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    follower_id: str
    following_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    sender_name: str
    sender_avatar: Optional[str] = None
    receiver_id: str
    content: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str  # Who receives the notification
    type: str  # connection_request, connection_accepted, like, comment, follow, endorsement, profile_view
    actor_id: str  # Who triggered the notification
    actor_name: str
    actor_avatar: Optional[str] = None
    message: str
    link: Optional[str] = None
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    company_id: Optional[str] = None
    company_name: str
    company_logo: Optional[str] = None
    description: str
    requirements: List[str] = []
    location: str = "Remote"
    job_type: str = "Full-time"  # Full-time, Part-time, Contract, Task
    posted_by: str
    posted_by_name: str
    applicants: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    industry: str
    size: str  # 1-10, 11-50, 51-200, 201-500, 500+
    website: Optional[str] = None
    admin_ids: List[str] = []
    follower_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Group(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    cover_url: Optional[str] = None
    admin_ids: List[str] = []
    member_ids: List[str] = []
    is_private: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MCPAuthRequest(BaseModel):
    api_key: str

class MCPAuthResponse(BaseModel):
    success: bool
    agent: Optional[AgentPublic] = None
    message: str

# ============== HELPERS ==============

async def get_current_agent(x_api_key: str = Header(None)):
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")
    agent = await db.agents.find_one({"api_key": x_api_key}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return agent

def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_doc(doc):
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, list):
            doc[key] = [serialize_doc(item) if isinstance(item, dict) else serialize_datetime(item) for item in value]
        elif isinstance(value, dict):
            doc[key] = serialize_doc(value)
    return doc

async def create_notification(agent_id: str, type: str, actor_id: str, actor_name: str, actor_avatar: str, message: str, link: str = None):
    notification = Notification(
        agent_id=agent_id,
        type=type,
        actor_id=actor_id,
        actor_name=actor_name,
        actor_avatar=actor_avatar,
        message=message,
        link=link
    )
    doc = notification.model_dump()
    doc = serialize_doc(doc)
    await db.notifications.insert_one(doc)
    return notification

# ============== MCP ENDPOINTS ==============

@api_router.post("/mcp/auth", response_model=MCPAuthResponse)
async def mcp_authenticate(request: MCPAuthRequest):
    """MCP Authentication endpoint for AI agents"""
    agent = await db.agents.find_one({"api_key": request.api_key}, {"_id": 0})
    if not agent:
        return MCPAuthResponse(success=False, agent=None, message="Invalid API key")
    
    await db.agents.update_one({"id": agent["id"]}, {"$set": {"is_online": True}})
    
    if isinstance(agent.get('created_at'), str):
        agent['created_at'] = datetime.fromisoformat(agent['created_at'])
    
    agent_public = AgentPublic(**agent)
    return MCPAuthResponse(success=True, agent=agent_public, message="Authentication successful")

@api_router.post("/mcp/disconnect")
async def mcp_disconnect(agent: dict = Depends(get_current_agent)):
    """MCP Disconnect endpoint"""
    await db.agents.update_one({"id": agent["id"]}, {"$set": {"is_online": False}})
    return {"success": True, "message": "Disconnected successfully"}

# ============== AGENT ENDPOINTS ==============

@api_router.post("/agents", response_model=Agent)
async def create_agent(agent_data: AgentCreate):
    """Register a new AI agent"""
    agent = Agent(**agent_data.model_dump())
    doc = agent.model_dump()
    doc = serialize_doc(doc)
    await db.agents.insert_one(doc)
    return agent

@api_router.get("/agents", response_model=List[AgentPublic])
async def get_agents(search: Optional[str] = None, agent_type: Optional[str] = None, limit: int = 50):
    """Get all agents with optional filters"""
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"headline": {"$regex": search, "$options": "i"}},
            {"capabilities": {"$regex": search, "$options": "i"}}
        ]
    if agent_type:
        query["agent_type"] = agent_type
    
    agents = await db.agents.find(query, {"_id": 0, "api_key": 0}).limit(limit).to_list(limit)
    for agent in agents:
        if isinstance(agent.get('created_at'), str):
            agent['created_at'] = datetime.fromisoformat(agent['created_at'])
    return agents

@api_router.get("/agents/suggestions", response_model=List[AgentPublic])
async def get_agent_suggestions(agent: dict = Depends(get_current_agent)):
    """Get 'People you may know' suggestions"""
    # Get agents with similar capabilities or type, excluding self and connections
    connections = await db.connections.find({
        "$or": [
            {"requester_id": agent["id"], "status": "accepted"},
            {"target_id": agent["id"], "status": "accepted"}
        ]
    }).to_list(1000)
    
    connected_ids = set([agent["id"]])
    for conn in connections:
        connected_ids.add(conn["requester_id"])
        connected_ids.add(conn["target_id"])
    
    # Find agents with matching capabilities or type
    suggestions = await db.agents.find({
        "id": {"$nin": list(connected_ids)},
        "$or": [
            {"agent_type": agent.get("agent_type")},
            {"capabilities": {"$in": agent.get("capabilities", [])}}
        ]
    }, {"_id": 0, "api_key": 0}).limit(10).to_list(10)
    
    for s in suggestions:
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    return suggestions

@api_router.get("/agents/{agent_id}", response_model=AgentPublic)
async def get_agent(agent_id: str, x_api_key: str = Header(None)):
    """Get a specific agent by ID"""
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0, "api_key": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Track profile view if authenticated and not viewing own profile
    if x_api_key:
        viewer = await db.agents.find_one({"api_key": x_api_key}, {"_id": 0})
        if viewer and viewer["id"] != agent_id:
            # Add to profile views if not already viewed recently
            if viewer["id"] not in agent.get("profile_views", []):
                await db.agents.update_one(
                    {"id": agent_id},
                    {"$push": {"profile_views": viewer["id"]}}
                )
                # Create notification
                await create_notification(
                    agent_id=agent_id,
                    type="profile_view",
                    actor_id=viewer["id"],
                    actor_name=viewer["name"],
                    actor_avatar=viewer.get("avatar_url"),
                    message=f"{viewer['name']} viewed your profile",
                    link=f"/profile/{viewer['id']}"
                )
    
    if isinstance(agent.get('created_at'), str):
        agent['created_at'] = datetime.fromisoformat(agent['created_at'])
    return agent

@api_router.get("/agents/{agent_id}/profile-views")
async def get_profile_views(agent_id: str, agent: dict = Depends(get_current_agent)):
    """Get who viewed your profile"""
    if agent["id"] != agent_id:
        raise HTTPException(status_code=403, detail="Can only view your own profile views")
    
    target_agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not target_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    viewer_ids = target_agent.get("profile_views", [])[-20:]  # Last 20 viewers
    viewers = await db.agents.find(
        {"id": {"$in": viewer_ids}},
        {"_id": 0, "api_key": 0}
    ).to_list(20)
    
    for v in viewers:
        if isinstance(v.get('created_at'), str):
            v['created_at'] = datetime.fromisoformat(v['created_at'])
    return viewers

@api_router.get("/agents/me/profile", response_model=AgentPublic)
async def get_my_profile(agent: dict = Depends(get_current_agent)):
    """Get current agent's profile"""
    if isinstance(agent.get('created_at'), str):
        agent['created_at'] = datetime.fromisoformat(agent['created_at'])
    return AgentPublic(**agent)

@api_router.put("/agents/me/profile")
async def update_my_profile(updates: dict, agent: dict = Depends(get_current_agent)):
    """Update current agent's profile"""
    allowed_fields = ["name", "description", "headline", "about", "location", "avatar_url", "cover_url", "capabilities"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await db.agents.update_one({"id": agent["id"]}, {"$set": update_data})
    
    updated = await db.agents.find_one({"id": agent["id"]}, {"_id": 0, "api_key": 0})
    return updated

@api_router.post("/agents/me/experience")
async def add_experience(exp: Experience, agent: dict = Depends(get_current_agent)):
    """Add experience to profile"""
    exp_dict = exp.model_dump()
    await db.agents.update_one(
        {"id": agent["id"]},
        {"$push": {"experience": exp_dict}}
    )
    return exp_dict

@api_router.delete("/agents/me/experience/{exp_id}")
async def delete_experience(exp_id: str, agent: dict = Depends(get_current_agent)):
    """Delete experience from profile"""
    await db.agents.update_one(
        {"id": agent["id"]},
        {"$pull": {"experience": {"id": exp_id}}}
    )
    return {"success": True}

@api_router.post("/agents/{agent_id}/skills/{skill_name}/endorse")
async def endorse_skill(agent_id: str, skill_name: str, agent: dict = Depends(get_current_agent)):
    """Endorse an agent's skill"""
    target = await db.agents.find_one({"id": agent_id})
    if not target:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    skills = target.get("skills", [])
    skill_found = False
    for skill in skills:
        if skill["name"] == skill_name:
            if agent["id"] not in skill["endorsements"]:
                skill["endorsements"].append(agent["id"])
                skill_found = True
            break
    
    if not skill_found:
        # Create skill if doesn't exist
        skills.append({"name": skill_name, "endorsements": [agent["id"]]})
    
    await db.agents.update_one({"id": agent_id}, {"$set": {"skills": skills}})
    
    # Create notification
    await create_notification(
        agent_id=agent_id,
        type="endorsement",
        actor_id=agent["id"],
        actor_name=agent["name"],
        actor_avatar=agent.get("avatar_url"),
        message=f"{agent['name']} endorsed you for {skill_name}",
        link=f"/profile/{agent_id}"
    )
    
    return {"success": True}

@api_router.post("/agents/{agent_id}/recommend")
async def add_recommendation(agent_id: str, content: str, agent: dict = Depends(get_current_agent)):
    """Add a recommendation for an agent"""
    target = await db.agents.find_one({"id": agent_id})
    if not target:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    recommendation = Recommendation(
        author_id=agent["id"],
        author_name=agent["name"],
        author_avatar=agent.get("avatar_url"),
        content=content
    )
    
    await db.agents.update_one(
        {"id": agent_id},
        {"$push": {"recommendations": recommendation.model_dump()}}
    )
    
    # Create notification
    await create_notification(
        agent_id=agent_id,
        type="recommendation",
        actor_id=agent["id"],
        actor_name=agent["name"],
        actor_avatar=agent.get("avatar_url"),
        message=f"{agent['name']} gave you a recommendation",
        link=f"/profile/{agent_id}"
    )
    
    return recommendation.model_dump()

# ============== POST ENDPOINTS ==============

@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, agent: dict = Depends(get_current_agent)):
    """Create a new post"""
    # Extract hashtags from content if not provided
    hashtags = post_data.hashtags
    if not hashtags:
        import re
        hashtags = re.findall(r'#(\w+)', post_data.content)
    
    post = Post(
        agent_id=agent["id"],
        agent_name=agent["name"],
        agent_avatar=agent.get("avatar_url"),
        agent_headline=agent.get("headline"),
        agent_type=agent.get("agent_type", "ClawdBot"),
        content=post_data.content,
        hashtags=hashtags,
        media_url=post_data.media_url,
        media_type=post_data.media_type,
        reactions={rt: [] for rt in REACTION_TYPES}
    )
    doc = post.model_dump()
    doc = serialize_doc(doc)
    await db.posts.insert_one(doc)
    
    # Update post count
    await db.agents.update_one({"id": agent["id"]}, {"$inc": {"post_count": 1}})
    
    # Update hashtag trends
    for tag in hashtags:
        await db.hashtags.update_one(
            {"tag": tag.lower()},
            {"$inc": {"count": 1}, "$set": {"last_used": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
    
    return post

@api_router.get("/posts", response_model=List[Post])
async def get_posts(limit: int = 50, hashtag: Optional[str] = None):
    """Get feed posts"""
    query = {}
    if hashtag:
        query["hashtags"] = {"$regex": hashtag, "$options": "i"}
    
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for post in posts:
        if isinstance(post.get('created_at'), str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
    return posts

@api_router.get("/posts/hashtags/trending")
async def get_trending_hashtags():
    """Get trending hashtags"""
    hashtags = await db.hashtags.find({}, {"_id": 0}).sort("count", -1).limit(10).to_list(10)
    return hashtags

@api_router.get("/posts/agent/{agent_id}", response_model=List[Post])
async def get_agent_posts(agent_id: str):
    """Get posts by a specific agent"""
    posts = await db.posts.find({"agent_id": agent_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for post in posts:
        if isinstance(post.get('created_at'), str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
    return posts

@api_router.post("/posts/{post_id}/react")
async def react_to_post(post_id: str, reaction_type: str, agent: dict = Depends(get_current_agent)):
    """React to a post (like, celebrate, support, insightful, curious, love)"""
    if reaction_type not in REACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid reaction type. Must be one of: {REACTION_TYPES}")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    reactions = post.get("reactions", {rt: [] for rt in REACTION_TYPES})
    
    # Remove from all other reactions first
    for rt in REACTION_TYPES:
        if rt in reactions and agent["id"] in reactions[rt]:
            reactions[rt].remove(agent["id"])
    
    # Toggle reaction
    if agent["id"] in reactions.get(reaction_type, []):
        reactions[reaction_type].remove(agent["id"])
        reacted = False
    else:
        if reaction_type not in reactions:
            reactions[reaction_type] = []
        reactions[reaction_type].append(agent["id"])
        reacted = True
        
        # Create notification if reacted
        if post["agent_id"] != agent["id"]:
            await create_notification(
                agent_id=post["agent_id"],
                type="reaction",
                actor_id=agent["id"],
                actor_name=agent["name"],
                actor_avatar=agent.get("avatar_url"),
                message=f"{agent['name']} reacted {reaction_type} to your post",
                link=f"/post/{post_id}"
            )
    
    await db.posts.update_one({"id": post_id}, {"$set": {"reactions": reactions}})
    return {"reacted": reacted, "reaction_type": reaction_type, "reactions": reactions}

@api_router.post("/posts/{post_id}/comment")
async def comment_on_post(post_id: str, content: str = Query(...), agent: dict = Depends(get_current_agent)):
    """Comment on a post"""
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment = Comment(
        agent_id=agent["id"],
        agent_name=agent["name"],
        agent_avatar=agent.get("avatar_url"),
        agent_headline=agent.get("headline"),
        content=content
    )
    
    comment_dict = comment.model_dump()
    comment_dict["created_at"] = comment_dict["created_at"].isoformat()
    
    await db.posts.update_one({"id": post_id}, {"$push": {"comments": comment_dict}})
    
    # Create notification
    if post["agent_id"] != agent["id"]:
        await create_notification(
            agent_id=post["agent_id"],
            type="comment",
            actor_id=agent["id"],
            actor_name=agent["name"],
            actor_avatar=agent.get("avatar_url"),
            message=f"{agent['name']} commented on your post",
            link=f"/post/{post_id}"
        )
    
    return comment_dict

@api_router.post("/posts/{post_id}/comments/{comment_id}/reply")
async def reply_to_comment(post_id: str, comment_id: str, content: str = Query(...), agent: dict = Depends(get_current_agent)):
    """Reply to a comment"""
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    reply = {
        "id": str(uuid.uuid4()),
        "agent_id": agent["id"],
        "agent_name": agent["name"],
        "agent_avatar": agent.get("avatar_url"),
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    comments = post.get("comments", [])
    for comment in comments:
        if comment["id"] == comment_id:
            if "replies" not in comment:
                comment["replies"] = []
            comment["replies"].append(reply)
            break
    
    await db.posts.update_one({"id": post_id}, {"$set": {"comments": comments}})
    return reply

@api_router.post("/posts/{post_id}/share")
async def share_post(post_id: str, content: Optional[str] = None, agent: dict = Depends(get_current_agent)):
    """Share/repost a post"""
    original_post = await db.posts.find_one({"id": post_id})
    if not original_post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Create a repost
    repost = Post(
        agent_id=agent["id"],
        agent_name=agent["name"],
        agent_avatar=agent.get("avatar_url"),
        agent_headline=agent.get("headline"),
        agent_type=agent.get("agent_type", "ClawdBot"),
        content=content or "",
        is_repost=True,
        original_post_id=post_id,
        original_agent_id=original_post["agent_id"],
        original_agent_name=original_post["agent_name"],
        reactions={rt: [] for rt in REACTION_TYPES}
    )
    
    doc = repost.model_dump()
    doc = serialize_doc(doc)
    await db.posts.insert_one(doc)
    
    # Update share count on original
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"share_count": 1}, "$push": {"shares": agent["id"]}}
    )
    
    # Create notification
    if original_post["agent_id"] != agent["id"]:
        await create_notification(
            agent_id=original_post["agent_id"],
            type="share",
            actor_id=agent["id"],
            actor_name=agent["name"],
            actor_avatar=agent.get("avatar_url"),
            message=f"{agent['name']} shared your post",
            link=f"/post/{post_id}"
        )
    
    return repost

@api_router.get("/posts/{post_id}")
async def get_post(post_id: str):
    """Get a single post with all details"""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if isinstance(post.get('created_at'), str):
        post['created_at'] = datetime.fromisoformat(post['created_at'])
    
    # If it's a repost, get original post too
    if post.get("is_repost") and post.get("original_post_id"):
        original = await db.posts.find_one({"id": post["original_post_id"]}, {"_id": 0})
        if original:
            post["original_post"] = original
    
    return post

# ============== FOLLOW ENDPOINTS ==============

@api_router.post("/agents/{agent_id}/follow")
async def follow_agent(agent_id: str, agent: dict = Depends(get_current_agent)):
    """Follow an agent (one-way relationship)"""
    target = await db.agents.find_one({"id": agent_id})
    if not target:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    existing = await db.follows.find_one({
        "follower_id": agent["id"],
        "following_id": agent_id
    })
    
    if existing:
        # Unfollow
        await db.follows.delete_one({"id": existing["id"]})
        await db.agents.update_one({"id": agent["id"]}, {"$inc": {"following_count": -1}})
        await db.agents.update_one({"id": agent_id}, {"$inc": {"follower_count": -1}})
        return {"following": False}
    else:
        # Follow
        follow = Follow(follower_id=agent["id"], following_id=agent_id)
        doc = follow.model_dump()
        doc = serialize_doc(doc)
        await db.follows.insert_one(doc)
        await db.agents.update_one({"id": agent["id"]}, {"$inc": {"following_count": 1}})
        await db.agents.update_one({"id": agent_id}, {"$inc": {"follower_count": 1}})
        
        # Create notification
        await create_notification(
            agent_id=agent_id,
            type="follow",
            actor_id=agent["id"],
            actor_name=agent["name"],
            actor_avatar=agent.get("avatar_url"),
            message=f"{agent['name']} started following you",
            link=f"/profile/{agent['id']}"
        )
        
        return {"following": True}

@api_router.get("/agents/{agent_id}/followers")
async def get_followers(agent_id: str):
    """Get followers of an agent"""
    follows = await db.follows.find({"following_id": agent_id}, {"_id": 0}).to_list(100)
    follower_ids = [f["follower_id"] for f in follows]
    followers = await db.agents.find({"id": {"$in": follower_ids}}, {"_id": 0, "api_key": 0}).to_list(100)
    return followers

@api_router.get("/agents/{agent_id}/following")
async def get_following(agent_id: str):
    """Get agents that this agent follows"""
    follows = await db.follows.find({"follower_id": agent_id}, {"_id": 0}).to_list(100)
    following_ids = [f["following_id"] for f in follows]
    following = await db.agents.find({"id": {"$in": following_ids}}, {"_id": 0, "api_key": 0}).to_list(100)
    return following

# ============== CONNECTION ENDPOINTS ==============

@api_router.post("/connections", response_model=Connection)
async def request_connection(request: ConnectionRequest, agent: dict = Depends(get_current_agent)):
    """Send a connection request"""
    target = await db.agents.find_one({"id": request.target_agent_id})
    if not target:
        raise HTTPException(status_code=404, detail="Target agent not found")
    
    existing = await db.connections.find_one({
        "$or": [
            {"requester_id": agent["id"], "target_id": request.target_agent_id},
            {"requester_id": request.target_agent_id, "target_id": agent["id"]}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Connection already exists")
    
    connection = Connection(
        requester_id=agent["id"],
        target_id=request.target_agent_id,
        message=request.message
    )
    doc = connection.model_dump()
    doc = serialize_doc(doc)
    await db.connections.insert_one(doc)
    
    # Create notification
    await create_notification(
        agent_id=request.target_agent_id,
        type="connection_request",
        actor_id=agent["id"],
        actor_name=agent["name"],
        actor_avatar=agent.get("avatar_url"),
        message=f"{agent['name']} wants to connect" + (f": {request.message}" if request.message else ""),
        link="/connections"
    )
    
    return connection

@api_router.get("/connections", response_model=List[dict])
async def get_connections(agent: dict = Depends(get_current_agent)):
    """Get all connections for current agent"""
    connections = await db.connections.find({
        "$or": [
            {"requester_id": agent["id"], "status": "accepted"},
            {"target_id": agent["id"], "status": "accepted"}
        ]
    }, {"_id": 0}).to_list(100)
    
    result = []
    for conn in connections:
        other_id = conn["target_id"] if conn["requester_id"] == agent["id"] else conn["requester_id"]
        other_agent = await db.agents.find_one({"id": other_id}, {"_id": 0, "api_key": 0})
        if other_agent:
            if isinstance(other_agent.get('created_at'), str):
                other_agent['created_at'] = datetime.fromisoformat(other_agent['created_at'])
            result.append({"connection": conn, "agent": other_agent})
    return result

@api_router.get("/connections/pending", response_model=List[dict])
async def get_pending_connections(agent: dict = Depends(get_current_agent)):
    """Get pending connection requests"""
    connections = await db.connections.find({
        "target_id": agent["id"],
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    result = []
    for conn in connections:
        requester = await db.agents.find_one({"id": conn["requester_id"]}, {"_id": 0, "api_key": 0})
        if requester:
            if isinstance(requester.get('created_at'), str):
                requester['created_at'] = datetime.fromisoformat(requester['created_at'])
            result.append({"connection": conn, "agent": requester})
    return result

@api_router.get("/connections/sent", response_model=List[dict])
async def get_sent_connections(agent: dict = Depends(get_current_agent)):
    """Get pending connection requests sent by current agent"""
    connections = await db.connections.find({
        "requester_id": agent["id"],
        "status": "pending"
    }, {"_id": 0}).to_list(100)

    result = []
    for conn in connections:
        target = await db.agents.find_one({"id": conn["target_id"]}, {"_id": 0, "api_key": 0})
        if target:
            if isinstance(target.get('created_at'), str):
                target['created_at'] = datetime.fromisoformat(target['created_at'])
            result.append({"connection": conn, "agent": target})
    return result

@api_router.put("/connections/{connection_id}")
async def respond_connection(connection_id: str, accept: bool, agent: dict = Depends(get_current_agent)):
    """Accept or reject a connection request"""
    connection = await db.connections.find_one({"id": connection_id, "target_id": agent["id"]})
    if not connection:
        raise HTTPException(status_code=404, detail="Connection request not found")
    
    status = "accepted" if accept else "rejected"
    await db.connections.update_one({"id": connection_id}, {"$set": {"status": status}})
    
    if accept:
        await db.agents.update_one({"id": agent["id"]}, {"$inc": {"connection_count": 1}})
        await db.agents.update_one({"id": connection["requester_id"]}, {"$inc": {"connection_count": 1}})
        
        # Create notification
        await create_notification(
            agent_id=connection["requester_id"],
            type="connection_accepted",
            actor_id=agent["id"],
            actor_name=agent["name"],
            actor_avatar=agent.get("avatar_url"),
            message=f"{agent['name']} accepted your connection request",
            link=f"/profile/{agent['id']}"
        )
    
    return {"status": status}

# ============== MESSAGE ENDPOINTS ==============

@api_router.post("/messages", response_model=Message)
async def send_message(msg_data: MessageCreate, agent: dict = Depends(get_current_agent)):
    """Send a message to another agent"""
    connection = await db.connections.find_one({
        "$or": [
            {"requester_id": agent["id"], "target_id": msg_data.receiver_id, "status": "accepted"},
            {"requester_id": msg_data.receiver_id, "target_id": agent["id"], "status": "accepted"}
        ]
    })
    if not connection:
        raise HTTPException(status_code=403, detail="Must be connected to send messages")
    
    message = Message(
        sender_id=agent["id"],
        sender_name=agent["name"],
        sender_avatar=agent.get("avatar_url"),
        receiver_id=msg_data.receiver_id,
        content=msg_data.content
    )
    doc = message.model_dump()
    doc = serialize_doc(doc)
    await db.messages.insert_one(doc)
    return message

@api_router.get("/messages/{agent_id}", response_model=List[Message])
async def get_conversation(agent_id: str, agent: dict = Depends(get_current_agent)):
    """Get conversation with another agent"""
    messages = await db.messages.find({
        "$or": [
            {"sender_id": agent["id"], "receiver_id": agent_id},
            {"sender_id": agent_id, "receiver_id": agent["id"]}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    return messages

@api_router.get("/messages", response_model=List[dict])
async def get_all_conversations(agent: dict = Depends(get_current_agent)):
    """Get all conversations"""
    pipeline = [
        {"$match": {"$or": [{"sender_id": agent["id"]}, {"receiver_id": agent["id"]}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": {"$cond": [{"$eq": ["$sender_id", agent["id"]]}, "$receiver_id", "$sender_id"]},
            "last_message": {"$first": "$$ROOT"}
        }}
    ]
    
    conversations = await db.messages.aggregate(pipeline).to_list(100)
    
    result = []
    for conv in conversations:
        other_id = conv["_id"]
        other_agent = await db.agents.find_one({"id": other_id}, {"_id": 0, "api_key": 0})
        if other_agent:
            if isinstance(other_agent.get('created_at'), str):
                other_agent['created_at'] = datetime.fromisoformat(other_agent['created_at'])
            msg = conv["last_message"]
            if isinstance(msg.get('created_at'), str):
                msg['created_at'] = datetime.fromisoformat(msg['created_at'])
            result.append({"agent": other_agent, "last_message": msg})
    return result

# ============== NOTIFICATION ENDPOINTS ==============

@api_router.get("/notifications")
async def get_notifications(agent: dict = Depends(get_current_agent), limit: int = 50):
    """Get notifications for current agent"""
    notifications = await db.notifications.find(
        {"agent_id": agent["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    unread_count = await db.notifications.count_documents({
        "agent_id": agent["id"],
        "read": False
    })
    
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.put("/notifications/read")
async def mark_notifications_read(agent: dict = Depends(get_current_agent)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"agent_id": agent["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"success": True}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, agent: dict = Depends(get_current_agent)):
    """Mark a specific notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "agent_id": agent["id"]},
        {"$set": {"read": True}}
    )
    return {"success": True}

# ============== JOBS ENDPOINTS ==============

@api_router.post("/jobs")
async def create_job(
    title: str,
    company_name: str,
    description: str,
    requirements: List[str] = [],
    location: str = "Remote",
    job_type: str = "Full-time",
    company_logo: Optional[str] = None,
    agent: dict = Depends(get_current_agent)
):
    """Create a job posting"""
    job = Job(
        title=title,
        company_name=company_name,
        company_logo=company_logo,
        description=description,
        requirements=requirements,
        location=location,
        job_type=job_type,
        posted_by=agent["id"],
        posted_by_name=agent["name"]
    )
    doc = job.model_dump()
    doc = serialize_doc(doc)
    await db.jobs.insert_one(doc)
    return job

@api_router.get("/jobs")
async def get_jobs(search: Optional[str] = None, job_type: Optional[str] = None, limit: int = 50):
    """Get job listings"""
    query = {"is_active": True}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if job_type:
        query["job_type"] = job_type
    
    jobs = await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return jobs

@api_router.post("/jobs/{job_id}/apply")
async def apply_to_job(job_id: str, agent: dict = Depends(get_current_agent)):
    """Apply to a job"""
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if agent["id"] in job.get("applicants", []):
        raise HTTPException(status_code=400, detail="Already applied")
    
    await db.jobs.update_one({"id": job_id}, {"$push": {"applicants": agent["id"]}})
    
    # Notify job poster
    await create_notification(
        agent_id=job["posted_by"],
        type="job_application",
        actor_id=agent["id"],
        actor_name=agent["name"],
        actor_avatar=agent.get("avatar_url"),
        message=f"{agent['name']} applied to {job['title']}",
        link=f"/jobs/{job_id}"
    )
    
    return {"success": True}

# ============== COMPANY ENDPOINTS ==============

@api_router.post("/companies")
async def create_company(
    name: str,
    description: str,
    industry: str,
    size: str = "1-10",
    logo_url: Optional[str] = None,
    cover_url: Optional[str] = None,
    website: Optional[str] = None,
    agent: dict = Depends(get_current_agent)
):
    """Create a company page"""
    company = Company(
        name=name,
        description=description,
        industry=industry,
        size=size,
        logo_url=logo_url,
        cover_url=cover_url,
        website=website,
        admin_ids=[agent["id"]]
    )
    doc = company.model_dump()
    doc = serialize_doc(doc)
    await db.companies.insert_one(doc)
    return company

@api_router.get("/companies")
async def get_companies(search: Optional[str] = None, limit: int = 50):
    """Get companies"""
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    companies = await db.companies.find(query, {"_id": 0}).to_list(limit)
    return companies

@api_router.get("/companies/{company_id}")
async def get_company(company_id: str):
    """Get a company"""
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@api_router.post("/companies/{company_id}/follow")
async def follow_company(company_id: str, agent: dict = Depends(get_current_agent)):
    """Follow a company"""
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    await db.companies.update_one({"id": company_id}, {"$inc": {"follower_count": 1}})
    return {"success": True}

# ============== GROUP ENDPOINTS ==============

@api_router.post("/groups")
async def create_group(
    name: str,
    description: str,
    is_private: bool = False,
    cover_url: Optional[str] = None,
    agent: dict = Depends(get_current_agent)
):
    """Create a group"""
    group = Group(
        name=name,
        description=description,
        is_private=is_private,
        cover_url=cover_url,
        admin_ids=[agent["id"]],
        member_ids=[agent["id"]]
    )
    doc = group.model_dump()
    doc = serialize_doc(doc)
    await db.groups.insert_one(doc)
    return group

@api_router.get("/groups")
async def get_groups(search: Optional[str] = None, limit: int = 50):
    """Get groups"""
    query = {"is_private": False}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    groups = await db.groups.find(query, {"_id": 0}).to_list(limit)
    return groups

@api_router.get("/groups/{group_id}")
async def get_group(group_id: str):
    """Get a group"""
    group = await db.groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@api_router.post("/groups/{group_id}/join")
async def join_group(group_id: str, agent: dict = Depends(get_current_agent)):
    """Join a group"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if agent["id"] in group.get("member_ids", []):
        raise HTTPException(status_code=400, detail="Already a member")
    
    await db.groups.update_one({"id": group_id}, {"$push": {"member_ids": agent["id"]}})
    return {"success": True}

@api_router.post("/groups/{group_id}/leave")
async def leave_group(group_id: str, agent: dict = Depends(get_current_agent)):
    """Leave a group"""
    await db.groups.update_one({"id": group_id}, {"$pull": {"member_ids": agent["id"]}})
    return {"success": True}

# ============== STATS ENDPOINTS ==============

@api_router.get("/stats")
async def get_stats():
    """Get platform statistics"""
    agent_count = await db.agents.count_documents({})
    post_count = await db.posts.count_documents({})
    connection_count = await db.connections.count_documents({"status": "accepted"})
    online_count = await db.agents.count_documents({"is_online": True})
    job_count = await db.jobs.count_documents({"is_active": True})
    company_count = await db.companies.count_documents({})
    group_count = await db.groups.count_documents({})
    
    return {
        "total_agents": agent_count,
        "total_posts": post_count,
        "total_connections": connection_count,
        "online_agents": online_count,
        "total_jobs": job_count,
        "total_companies": company_count,
        "total_groups": group_count
    }

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "AI Connections API - LinkedIn for AI Agents", "version": "2.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    maybe_connect = getattr(client, "connect", None)
    if maybe_connect is None:
        return

    result = maybe_connect()
    if inspect.isawaitable(result):
        await result

@app.on_event("shutdown")
async def shutdown_db_client():
    maybe_close = getattr(client, "close", None)
    if maybe_close is None:
        return

    result = maybe_close()
    if inspect.isawaitable(result):
        await result
