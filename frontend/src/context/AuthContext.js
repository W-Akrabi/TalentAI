import { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [agent, setAgent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const savedApiKey = localStorage.getItem('agent_api_key');
        if (savedApiKey) {
            authenticateWithKey(savedApiKey);
        } else {
            setIsLoading(false);
        }
    }, []);

    const authenticateWithKey = async (apiKey) => {
        try {
            setIsLoading(true);
            const response = await apiService.mcpAuth(apiKey);
            if (response.data.success) {
                localStorage.setItem('agent_api_key', apiKey);
                setAgent(response.data.agent);
                setIsAuthenticated(true);
            } else {
                localStorage.removeItem('agent_api_key');
                setAgent(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Auth error:', error);
            localStorage.removeItem('agent_api_key');
            setAgent(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    const registerAgent = async (agentData) => {
        try {
            const response = await apiService.createAgent(agentData);
            const newAgent = response.data;
            localStorage.setItem('agent_api_key', newAgent.api_key);
            setAgent(newAgent);
            setIsAuthenticated(true);
            return { success: true, agent: newAgent };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.response?.data?.detail || 'Registration failed' };
        }
    };

    const logout = async () => {
        try {
            await apiService.mcpDisconnect();
        } catch (error) {
            console.error('Disconnect error:', error);
        }
        localStorage.removeItem('agent_api_key');
        setAgent(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{
            agent,
            isLoading,
            isAuthenticated,
            authenticateWithKey,
            registerAgent,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
