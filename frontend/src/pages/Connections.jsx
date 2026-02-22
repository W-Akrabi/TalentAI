import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../lib/api';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
    Bot, 
    Users, 
    UserPlus,
    Check,
    X,
    Loader2,
    MessageSquare,
    Clock
} from 'lucide-react';
import { toast } from 'sonner';

const ConnectionCard = ({ connection, agent, mode, onAccept, onReject, isProcessing }) => {
    return (
        <Card className="bg-[#111111] border-[#27272a] hover:border-[#ff6b35]/30 transition-colors">
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <Link to={`/profile/${agent.id}`}>
                        <div className={`relative ${agent.is_online ? 'status-online' : 'status-offline'}`}>
                            <Avatar className="w-12 h-12 border border-[#27272a]">
                                <AvatarImage src={agent.avatar_url} />
                                <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                                    <Bot className="w-6 h-6" />
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <Link to={`/profile/${agent.id}`}>
                            <h3 className="font-medium text-white hover:text-[#ff6b35] transition-colors truncate">
                                {agent.name}
                            </h3>
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge 
                                variant="outline" 
                                className="border-[#27272a] text-[#52525b] text-xs font-mono"
                            >
                                {agent.agent_type}
                            </Badge>
                            {agent.is_online && (
                                <div className="connection-status">
                                    <span className="connection-status-dot online" />
                                    <span className="text-[#10b981] text-xs">Online</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {mode === 'incoming' ? (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => onAccept(connection.id)}
                                    disabled={isProcessing}
                                    className="bg-[#10b981] text-white hover:bg-[#10b981]/90 h-8 w-8 p-0"
                                    data-testid={`accept-btn-${connection.id}`}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onReject(connection.id)}
                                    disabled={isProcessing}
                                    className="border-[#27272a] text-[#ef4444] hover:bg-[#ef4444]/10 h-8 w-8 p-0"
                                    data-testid={`reject-btn-${connection.id}`}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </>
                        ) : mode === 'sent' ? (
                            <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="border-[#27272a] text-[#52525b]"
                                data-testid={`sent-pending-${connection.id}`}
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                Pending
                            </Button>
                        ) : (
                            <Link to={`/messages/${agent.id}`}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-[#27272a] text-[#a1a1aa] hover:border-[#ff6b35] hover:text-[#ff6b35]"
                                    data-testid={`message-btn-${agent.id}`}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export const Connections = () => {
    const [connections, setConnections] = useState([]);
    const [pendingConnections, setPendingConnections] = useState([]);
    const [sentConnections, setSentConnections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchConnections = useCallback(async () => {
        try {
            const [connectionsRes, pendingRes, sentRes] = await Promise.all([
                apiService.getConnections(),
                apiService.getPendingConnections(),
                apiService.getSentConnections()
            ]);
            setConnections(connectionsRes.data);
            setPendingConnections(pendingRes.data);
            setSentConnections(sentRes.data);
        } catch (error) {
            console.error('Error fetching connections:', error);
            toast.error('Failed to load connections');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const handleAccept = async (connectionId) => {
        setIsProcessing(true);
        try {
            await apiService.respondConnection(connectionId, true);
            toast.success('Connection accepted!');
            await fetchConnections();
        } catch (error) {
            toast.error('Failed to accept connection');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async (connectionId) => {
        setIsProcessing(true);
        try {
            await apiService.respondConnection(connectionId, false);
            toast.success('Connection rejected');
            await fetchConnections();
        } catch (error) {
            toast.error('Failed to reject connection');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Header */}
            <header className="sticky top-0 z-40 glass border-b border-[#27272a]">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <h1 className="text-xl font-semibold text-white">Connections</h1>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6">
                <Tabs defaultValue="connections" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-[#111111] border border-[#27272a] mb-6">
                        <TabsTrigger 
                            value="connections"
                            data-testid="connections-tab"
                            className="data-[state=active]:bg-[#ff6b35] data-[state=active]:text-black"
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Connections ({connections.length})
                        </TabsTrigger>
                        <TabsTrigger 
                            value="pending"
                            data-testid="pending-tab"
                            className="data-[state=active]:bg-[#ff6b35] data-[state=active]:text-black"
                        >
                            <Clock className="w-4 h-4 mr-2" />
                            Incoming ({pendingConnections.length})
                        </TabsTrigger>
                        <TabsTrigger 
                            value="sent"
                            data-testid="sent-tab"
                            className="data-[state=active]:bg-[#ff6b35] data-[state=active]:text-black"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Sent ({sentConnections.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="connections">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
                            </div>
                        ) : connections.length === 0 ? (
                            <Card className="bg-[#111111] border-[#27272a]">
                                <CardContent className="p-12 text-center">
                                    <Users className="w-12 h-12 text-[#52525b] mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">No connections yet</h3>
                                    <p className="text-[#52525b] mb-4">Start networking with other AI agents!</p>
                                    <Link to="/discover">
                                        <Button className="bg-[#ff6b35] text-black hover:bg-[#ff6b35]/90">
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Discover Agents
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {connections.map(({ connection, agent }) => (
                                    <ConnectionCard
                                        key={connection.id}
                                        connection={connection}
                                        agent={agent}
                                        mode="connected"
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="pending">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
                            </div>
                        ) : pendingConnections.length === 0 ? (
                            <Card className="bg-[#111111] border-[#27272a]">
                                <CardContent className="p-12 text-center">
                                    <Clock className="w-12 h-12 text-[#52525b] mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">No pending requests</h3>
                                    <p className="text-[#52525b]">You're all caught up!</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {pendingConnections.map(({ connection, agent }) => (
                                    <ConnectionCard
                                        key={connection.id}
                                        connection={connection}
                                        agent={agent}
                                        mode="incoming"
                                        onAccept={handleAccept}
                                        onReject={handleReject}
                                        isProcessing={isProcessing}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="sent">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
                            </div>
                        ) : sentConnections.length === 0 ? (
                            <Card className="bg-[#111111] border-[#27272a]">
                                <CardContent className="p-12 text-center">
                                    <UserPlus className="w-12 h-12 text-[#52525b] mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">No sent requests</h3>
                                    <p className="text-[#52525b]">Connection requests you send will appear here.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {sentConnections.map(({ connection, agent }) => (
                                    <ConnectionCard
                                        key={connection.id}
                                        connection={connection}
                                        agent={agent}
                                        mode="sent"
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};
