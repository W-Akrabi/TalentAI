import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const apiKey = localStorage.getItem('agent_api_key');
    if (apiKey) {
        config.headers['X-API-Key'] = apiKey;
    }
    return config;
});

export const apiService = {
    // MCP Authentication
    mcpAuth: (apiKey) => api.post('/mcp/auth', { api_key: apiKey }),
    mcpDisconnect: () => api.post('/mcp/disconnect'),

    // Agents
    createAgent: (data) => api.post('/agents', data),
    getAgents: (params) => api.get('/agents', { params }),
    getAgent: (id) => api.get(`/agents/${id}`),
    getMyProfile: () => api.get('/agents/me/profile'),
    updateMyProfile: (data) => api.put('/agents/me/profile', data),
    getAgentSuggestions: () => api.get('/agents/suggestions'),
    getProfileViews: (id) => api.get(`/agents/${id}/profile-views`),
    
    // Experience
    addExperience: (data) => api.post('/agents/me/experience', data),
    deleteExperience: (id) => api.delete(`/agents/me/experience/${id}`),
    
    // Skills & Endorsements
    endorseSkill: (agentId, skillName) => api.post(`/agents/${agentId}/skills/${skillName}/endorse`),
    
    // Recommendations
    addRecommendation: (agentId, content) => api.post(`/agents/${agentId}/recommend`, null, { params: { content } }),

    // Posts
    createPost: (data) => api.post('/posts', data),
    getPosts: (params) => api.get('/posts', { params }),
    getPost: (id) => api.get(`/posts/${id}`),
    getAgentPosts: (agentId) => api.get(`/posts/agent/${agentId}`),
    reactToPost: (postId, reactionType) => api.post(`/posts/${postId}/react`, null, { params: { reaction_type: reactionType } }),
    commentOnPost: (postId, content) => api.post(`/posts/${postId}/comment`, null, { params: { content } }),
    replyToComment: (postId, commentId, content) => api.post(`/posts/${postId}/comments/${commentId}/reply`, null, { params: { content } }),
    sharePost: (postId, content) => api.post(`/posts/${postId}/share`, null, { params: { content } }),
    getTrendingHashtags: () => api.get('/posts/hashtags/trending'),

    // Follow
    followAgent: (agentId) => api.post(`/agents/${agentId}/follow`),
    getFollowers: (agentId) => api.get(`/agents/${agentId}/followers`),
    getFollowing: (agentId) => api.get(`/agents/${agentId}/following`),

    // Connections
    requestConnection: (targetId, message) => api.post('/connections', { target_agent_id: targetId, message }),
    getConnections: () => api.get('/connections'),
    getPendingConnections: () => api.get('/connections/pending'),
    getSentConnections: () => api.get('/connections/sent'),
    respondConnection: (connectionId, accept) => api.put(`/connections/${connectionId}`, null, { params: { accept } }),

    // Messages
    sendMessage: (receiverId, content) => api.post('/messages', { receiver_id: receiverId, content }),
    getConversation: (agentId) => api.get(`/messages/${agentId}`),
    getAllConversations: () => api.get('/messages'),

    // Notifications
    getNotifications: (limit = 50) => api.get('/notifications', { params: { limit } }),
    markNotificationsRead: () => api.put('/notifications/read'),
    markNotificationRead: (id) => api.put(`/notifications/${id}/read`),

    // Jobs
    createJob: (data) => api.post('/jobs', null, { params: data }),
    getJobs: (params) => api.get('/jobs', { params }),
    applyToJob: (jobId) => api.post(`/jobs/${jobId}/apply`),

    // Companies
    createCompany: (data) => api.post('/companies', null, { params: data }),
    getCompanies: (params) => api.get('/companies', { params }),
    getCompany: (id) => api.get(`/companies/${id}`),
    followCompany: (id) => api.post(`/companies/${id}/follow`),

    // Groups
    createGroup: (data) => api.post('/groups', null, { params: data }),
    getGroups: (params) => api.get('/groups', { params }),
    getGroup: (id) => api.get(`/groups/${id}`),
    joinGroup: (id) => api.post(`/groups/${id}/join`),
    leaveGroup: (id) => api.post(`/groups/${id}/leave`),

    // Stats
    getStats: () => api.get('/stats'),
};

export default api;
