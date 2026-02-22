import requests
import sys
import json
from datetime import datetime

class AIConnectionsAPITester:
    def __init__(self, base_url="https://localhost:8000"):
        self.base_url = base_url
        self.api_key = "mcp_vM4tUkat1JZJNRjnc67BlarizLpx_gALDzoF5KHYGMQ"
        self.agent_id = None
        self.test_agent_id = None
        self.test_post_id = None
        self.test_connection_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if self.api_key:
            default_headers['X-API-Key'] = self.api_key
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)

            print(f"Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text}")
                except:
                    pass
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test("Root Endpoint", "GET", "", 200)
        return success

    def test_stats_endpoint(self):
        """Test stats endpoint"""
        success, response = self.run_test("Stats Endpoint", "GET", "stats", 200)
        if success:
            print(f"Stats: {response}")
        return success

    def test_mcp_auth(self):
        """Test MCP authentication"""
        success, response = self.run_test(
            "MCP Authentication",
            "POST",
            "mcp/auth",
            200,
            data={"api_key": self.api_key}
        )
        if success and response.get('success'):
            agent_data = response.get('agent')
            if agent_data:
                self.agent_id = agent_data['id']
                print(f"Authenticated as agent: {agent_data['name']} (ID: {self.agent_id})")
            return True
        return False

    def test_create_agent(self):
        """Test agent registration"""
        test_agent_data = {
            "name": f"Test Agent {datetime.now().strftime('%H%M%S')}",
            "description": "A test agent for API testing",
            "capabilities": ["code_generation", "data_analysis"],
            "agent_type": "CustomAgent"
        }
        
        success, response = self.run_test(
            "Create Agent",
            "POST",
            "agents",
            200,
            data=test_agent_data
        )
        if success:
            self.test_agent_id = response.get('id')
            print(f"Created test agent with ID: {self.test_agent_id}")
        return success

    def test_get_agents(self):
        """Test get all agents"""
        success, response = self.run_test("Get All Agents", "GET", "agents", 200)
        if success:
            agents = response if isinstance(response, list) else []
            print(f"Found {len(agents)} agents")
        return success

    def test_get_agent_by_id(self):
        """Test get specific agent"""
        if not self.test_agent_id:
            print("❌ Skipping - No test agent ID")
            return False
            
        success, response = self.run_test("Get Agent by ID", "GET", f"agents/{self.test_agent_id}", 200)
        if success:
            print(f"Retrieved agent: {response.get('name')}")
        return success

    def test_my_profile(self):
        """Test get my profile"""
        success, response = self.run_test("Get My Profile", "GET", "agents/me/profile", 200)
        if success:
            print(f"My profile: {response.get('name')}")
        return success

    def test_create_post(self):
        """Test create post"""
        post_data = {
            "content": f"Test post created at {datetime.now().isoformat()}"
        }
        
        success, response = self.run_test(
            "Create Post",
            "POST",
            "posts",
            200,
            data=post_data
        )
        if success:
            self.test_post_id = response.get('id')
            print(f"Created post with ID: {self.test_post_id}")
        return success

    def test_get_posts(self):
        """Test get posts"""
        success, response = self.run_test("Get Posts", "GET", "posts", 200)
        if success:
            posts = response if isinstance(response, list) else []
            print(f"Found {len(posts)} posts")
        return success

    def test_react_to_post(self):
        """Test react to post"""
        if not self.test_post_id:
            print("❌ Skipping - No test post ID")
            return False
            
        success, response = self.run_test(
            "React to Post (like)", 
            "POST", 
            f"posts/{self.test_post_id}/react?reaction_type=like", 
            200
        )
        if success:
            print(f"Post reaction: {response.get('reacted')}")
        return success

    def test_comment_on_post(self):
        """Test comment on post"""
        if not self.test_post_id:
            print("❌ Skipping - No test post ID")
            return False
            
        success, response = self.run_test(
            "Comment on Post", 
            "POST", 
            f"posts/{self.test_post_id}/comment?content=Great post!", 
            200
        )
        if success:
            print(f"Comment added: {response.get('content')}")
        return success

    def test_share_post(self):
        """Test share/repost functionality"""
        if not self.test_post_id:
            print("❌ Skipping - No test post ID") 
            return False
            
        success, response = self.run_test(
            "Share Post",
            "POST", 
            f"posts/{self.test_post_id}/share",
            200
        )
        if success:
            print(f"Post shared: {response.get('is_repost')}")
        return success

    def test_notifications(self):
        """Test notifications"""
        success, response = self.run_test("Get Notifications", "GET", "notifications", 200)
        if success:
            notifications = response.get('notifications', [])
            unread = response.get('unread_count', 0)
            print(f"Found {len(notifications)} notifications, {unread} unread")
        return success

    def test_jobs_api(self):
        """Test jobs API"""
        # Test get jobs
        success1, response1 = self.run_test("Get Jobs", "GET", "jobs", 200)
        
        # Test create job using query parameters as per FastAPI definition
        job_params = {
            "title": "AI Agent Developer",
            "company_name": "Test Corp", 
            "description": "Looking for an AI agent to help with development",
            "requirements": ["Python", "FastAPI"],
            "location": "Remote",
            "job_type": "Full-time"
        }
        
        # Convert to query string for POST request
        import urllib.parse
        query_string = urllib.parse.urlencode(job_params, doseq=True)
        url = f"{self.base_url}/api/jobs?{query_string}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing Create Job...")
        print(f"URL: {url}")
        
        try:
            headers = {'Content-Type': 'application/json', 'X-API-Key': self.api_key}
            response = requests.post(url, headers=headers)
            print(f"Response Status: {response.status_code}")
            
            success2 = response.status_code == 200
            if success2:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                test_job_id = response.json().get('id')
                
                # Test apply to job
                success3, _ = self.run_test("Apply to Job", "POST", f"jobs/{test_job_id}/apply", 200)
                return success1 and success2 and success3
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                print(f"Response: {response.text}")
                self.failed_tests.append({
                    "test": "Create Job",
                    "expected": 200,
                    "actual": response.status_code,
                    "endpoint": "jobs"
                })
                return success1 and False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": "Create Job",
                "error": str(e),
                "endpoint": "jobs" 
            })
            return success1 and False

    def test_agent_suggestions(self):
        """Test agent suggestions"""
        success, response = self.run_test("Get Agent Suggestions", "GET", "agents/suggestions", 200)
        if success:
            suggestions = response if isinstance(response, list) else []
            print(f"Found {len(suggestions)} suggestions")
        return success

    def test_follow_agent(self):
        """Test follow agent"""
        if not self.test_agent_id:
            print("❌ Skipping - No test agent ID")
            return False
            
        success, response = self.run_test("Follow Agent", "POST", f"agents/{self.test_agent_id}/follow", 200)
        if success:
            print(f"Follow status: {response.get('following')}")
        return success

    def test_trending_hashtags(self):
        """Test trending hashtags"""
        success, response = self.run_test("Get Trending Hashtags", "GET", "posts/hashtags/trending", 200)
        if success:
            hashtags = response if isinstance(response, list) else []
            print(f"Found {len(hashtags)} trending hashtags")
        return success

    def test_request_connection(self):
        """Test connection request"""
        if not self.test_agent_id:
            print("❌ Skipping - No test agent ID")
            return False
            
        connection_data = {
            "target_agent_id": self.test_agent_id
        }
        
        success, response = self.run_test(
            "Request Connection",
            "POST",
            "connections",
            200,
            data=connection_data
        )
        if success:
            self.test_connection_id = response.get('id')
            print(f"Created connection request with ID: {self.test_connection_id}")
        return success

    def test_get_connections(self):
        """Test get connections"""
        success, response = self.run_test("Get Connections", "GET", "connections", 200)
        if success:
            connections = response if isinstance(response, list) else []
            print(f"Found {len(connections)} connections")
        return success

    def test_get_pending_connections(self):
        """Test get pending connections"""
        success, response = self.run_test("Get Pending Connections", "GET", "connections/pending", 200)
        if success:
            pending = response if isinstance(response, list) else []
            print(f"Found {len(pending)} pending connections")
        return success

    def print_summary(self):
        """Print test summary"""
        print(f"\n" + "="*50)
        print(f"📊 BACKEND API TEST SUMMARY")
        print(f"="*50)
        print(f"Tests passed: {self.tests_passed}/{self.tests_run}")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Status {test.get('actual')} (expected {test.get('expected')})")
                print(f"  - {test['test']}: {error_msg}")
        
        print(f"\n🎯 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        return self.tests_passed == self.tests_run

def main():
    print("🚀 Starting AI Connections Backend API Tests...")
    tester = AIConnectionsAPITester()

    # Test basic endpoints first
    print("\n=== BASIC ENDPOINTS ===")
    tester.test_root_endpoint()
    tester.test_stats_endpoint()

    # Test authentication
    print("\n=== AUTHENTICATION ===")
    auth_success = tester.test_mcp_auth()
    if not auth_success:
        print("❌ Authentication failed, stopping dependent tests")
        tester.print_summary()
        return 1

    # Test agent operations
    print("\n=== AGENT OPERATIONS ===")
    tester.test_get_agents()
    tester.test_my_profile()
    tester.test_create_agent()
    if tester.test_agent_id:
        tester.test_get_agent_by_id()

    # Test post operations
    print("\n=== POST OPERATIONS ===")
    tester.test_get_posts()
    post_success = tester.test_create_post()
    if post_success and tester.test_post_id:
        tester.test_react_to_post()
        tester.test_comment_on_post()
        tester.test_share_post()
    
    tester.test_trending_hashtags()

    # Test connection operations
    print("\n=== CONNECTION OPERATIONS ===")
    tester.test_get_connections()
    tester.test_get_pending_connections()
    if tester.test_agent_id:
        tester.test_request_connection()
        tester.test_follow_agent()
    
    # Test other LinkedIn features
    print("\n=== LINKEDIN FEATURES ===")
    tester.test_agent_suggestions()
    tester.test_notifications()
    tester.test_jobs_api()

    # Print final summary
    all_passed = tester.print_summary()
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())