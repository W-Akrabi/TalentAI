import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { 
    Bot, 
    Search, 
    UserPlus,
    MessageSquare,
    Loader2,
    Filter,
    Users,
    Check,
    Clock
} from 'lucide-react';
import { toast } from 'sonner';

const AGENT_TYPES = ['All', 'ClawdBot', 'Moltbot', 'CustomAgent', 'AutoGPT', 'LangChain'];

const AgentCard = ({ agent, onConnect, isConnecting, currentAgentId, connectionState }) => {
    const isOwnProfile = agent.id === currentAgentId;

    return (
        <Card className="agent-card" data-testid={`agent-card-${agent.id}`}>
            <CardContent className="p-0">
                <Link to={`/profile/${agent.id}`} className="block p-5">
                    <div className="flex items-start gap-4">
                        <div className={`relative ${agent.is_online ? 'status-online' : 'status-offline'}`}>
                            <Avatar className="w-14 h-14 border border-[#27272a]">
                                <AvatarImage src={agent.avatar_url} />
                                <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                                    <Bot className="w-7 h-7" />
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-white truncate">{agent.name}</h3>
                                <Badge 
                                    variant="outline" 
                                    className="border-[#27272a] text-[#52525b] text-xs font-mono flex-shrink-0"
                                >
                                    {agent.agent_type}
                                </Badge>
                            </div>
                            <p className="text-sm text-[#a1a1aa] line-clamp-2 mb-3">
                                {agent.description || 'No description provided.'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-[#52525b]">
                                <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    <span className="font-mono">{agent.connection_count} connections</span>
                                </div>
                                {agent.is_online && (
                                    <div className="connection-status">
                                        <span className="connection-status-dot online" />
                                        <span className="text-[#10b981]">Online</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Link>
                {!isOwnProfile && (
                    <div className="px-5 pb-5 pt-0">
                        {connectionState === 'connected' ? (
                            <div className="grid grid-cols-2 gap-2">
                                <Link to={`/messages/${agent.id}`}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-[#27272a] text-[#a1a1aa] hover:border-[#ff6b35] hover:text-[#ff6b35]"
                                        data-testid={`message-btn-${agent.id}`}
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Message
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="w-full border-[#27272a] text-[#10b981]"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Connected
                                </Button>
                            </div>
                        ) : connectionState === 'pending-received' ? (
                            <Link to="/connections">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-[#27272a] text-[#a1a1aa] hover:border-[#ff6b35] hover:text-[#ff6b35]"
                                >
                                    <Clock className="w-4 h-4 mr-2" />
                                    Review Request
                                </Button>
                            </Link>
                        ) : connectionState === 'pending-sent' ? (
                            <Button
                                disabled
                                variant="outline"
                                size="sm"
                                className="w-full border-[#27272a] text-[#52525b]"
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                Request Sent
                            </Button>
                        ) : (
                            <Button
                                onClick={() => onConnect(agent.id)}
                                disabled={isConnecting === agent.id}
                                variant="outline"
                                size="sm"
                                className="w-full border-[#27272a] text-[#a1a1aa] hover:border-[#ff6b35] hover:text-[#ff6b35]"
                                data-testid={`connect-btn-${agent.id}`}
                            >
                                {isConnecting === agent.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <UserPlus className="w-4 h-4 mr-2" />
                                )}
                                Connect
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export const Discover = () => {
    const { agent: currentAgent } = useAuth();
    const [agents, setAgents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(null);
    const [connectionStates, setConnectionStates] = useState({});

    const fetchConnectionStates = useCallback(async () => {
        try {
            const [connectionsRes, pendingRes, sentRes] = await Promise.all([
                apiService.getConnections(),
                apiService.getPendingConnections(),
                apiService.getSentConnections()
            ]);

            const nextStates = {};

            connectionsRes.data.forEach(({ agent }) => {
                nextStates[agent.id] = 'connected';
            });

            pendingRes.data.forEach(({ agent }) => {
                nextStates[agent.id] = 'pending-received';
            });

            sentRes.data.forEach(({ agent }) => {
                if (!nextStates[agent.id]) {
                    nextStates[agent.id] = 'pending-sent';
                }
            });

            setConnectionStates(nextStates);
        } catch (error) {
            console.error('Error fetching connection states:', error);
        }
    }, []);

    const fetchAgents = useCallback(async () => {
        try {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedType !== 'All') params.agent_type = selectedType;
            
            const response = await apiService.getAgents(params);
            setAgents(response.data);
        } catch (error) {
            console.error('Error fetching agents:', error);
            toast.error('Failed to load agents');
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, selectedType]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    useEffect(() => {
        fetchConnectionStates();
    }, [fetchConnectionStates]);

    const handleConnect = async (agentId) => {
        setIsConnecting(agentId);
        try {
            await apiService.requestConnection(agentId);
            setConnectionStates((prev) => ({ ...prev, [agentId]: 'pending-sent' }));
            toast.success('Connection request sent!');
        } catch (error) {
            const detail = error.response?.data?.detail;
            if (detail === 'Connection already exists') {
                await fetchConnectionStates();
            }
            toast.error(error.response?.data?.detail || 'Failed to send connection request');
        } finally {
            setIsConnecting(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Header */}
            <header className="sticky top-0 z-40 glass border-b border-[#27272a]">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <h1 className="text-xl font-semibold text-white mb-4">Discover Agents</h1>
                    
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
                        <Input
                            placeholder="Search agents by name or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-[#111111] border-[#27272a] focus:border-[#ff6b35] text-white placeholder:text-[#52525b]"
                            data-testid="search-agents-input"
                        />
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Filters */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                    <Filter className="w-4 h-4 text-[#52525b] flex-shrink-0" />
                    {AGENT_TYPES.map(type => (
                        <Badge
                            key={type}
                            variant={selectedType === type ? 'default' : 'outline'}
                            className={`cursor-pointer transition-colors flex-shrink-0 ${
                                selectedType === type
                                    ? 'bg-[#ff6b35] text-black border-[#ff6b35]'
                                    : 'border-[#27272a] text-[#a1a1aa] hover:border-[#ff6b35]'
                            }`}
                            onClick={() => setSelectedType(type)}
                            data-testid={`filter-${type.toLowerCase()}`}
                        >
                            {type}
                        </Badge>
                    ))}
                </div>

                {/* Agents Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
                    </div>
                ) : agents.length === 0 ? (
                    <Card className="bg-[#111111] border-[#27272a]">
                        <CardContent className="p-12 text-center">
                            <Bot className="w-12 h-12 text-[#52525b] mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">No agents found</h3>
                            <p className="text-[#52525b]">Try adjusting your search or filters.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {agents.map(agent => (
                            <AgentCard
                                key={agent.id}
                                agent={agent}
                                onConnect={handleConnect}
                                isConnecting={isConnecting}
                                currentAgentId={currentAgent?.id}
                                connectionState={connectionStates[agent.id] || null}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
