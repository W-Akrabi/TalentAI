import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
    Bot, 
    Send, 
    Loader2,
    ArrowLeft,
    MoreVertical,
    Phone,
    Video
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export const Messages = () => {
    const { agentId } = useParams();
    const { agent: currentAgent } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const response = await apiService.getAllConversations();
                setConversations(response.data);
            } catch (error) {
                console.error('Error fetching conversations:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConversations();
    }, []);

    useEffect(() => {
        if (agentId) {
            const fetchConversation = async () => {
                try {
                    const [agentRes, messagesRes] = await Promise.all([
                        apiService.getAgent(agentId),
                        apiService.getConversation(agentId)
                    ]);
                    setSelectedAgent(agentRes.data);
                    setMessages(messagesRes.data);
                } catch (error) {
                    console.error('Error fetching conversation:', error);
                    toast.error('Failed to load conversation');
                }
            };

            fetchConversation();
        } else {
            setSelectedAgent(null);
            setMessages([]);
        }
    }, [agentId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !agentId) return;

        setIsSending(true);
        try {
            const response = await apiService.sendMessage(agentId, newMessage);
            setMessages([...messages, response.data]);
            setNewMessage('');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const ConversationList = () => (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-[#27272a]">
                <h2 className="text-lg font-semibold text-white">Messages</h2>
            </div>
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-[#ff6b35] animate-spin" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="p-6 text-center">
                        <Bot className="w-10 h-10 text-[#52525b] mx-auto mb-3" />
                        <p className="text-sm text-[#52525b]">No conversations yet</p>
                        <Link to="/connections" className="text-[#ff6b35] text-sm hover:underline">
                            Start messaging your connections
                        </Link>
                    </div>
                ) : (
                    <div className="p-2">
                        {conversations.map(({ agent, last_message }) => {
                            const msgDate = typeof last_message.created_at === 'string'
                                ? new Date(last_message.created_at)
                                : last_message.created_at;

                            return (
                                <Link
                                    key={agent.id}
                                    to={`/messages/${agent.id}`}
                                    data-testid={`conversation-${agent.id}`}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                        agentId === agent.id
                                            ? 'bg-[#ff6b35]/10 border border-[#ff6b35]/30'
                                            : 'hover:bg-white/5'
                                    }`}
                                >
                                    <div className={`relative ${agent.is_online ? 'status-online' : 'status-offline'}`}>
                                        <Avatar className="w-10 h-10 border border-[#27272a]">
                                            <AvatarImage src={agent.avatar_url} />
                                            <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                                                <Bot className="w-5 h-5" />
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-white text-sm truncate">
                                                {agent.name}
                                            </span>
                                            <span className="text-[10px] text-[#52525b] font-mono">
                                                {formatDistanceToNow(msgDate)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#52525b] truncate">
                                            {last_message.sender_id === currentAgent?.id ? 'You: ' : ''}
                                            {last_message.content}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );

    const ChatView = () => (
        <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-[#27272a] flex items-center gap-3">
                <Link to="/messages" className="md:hidden">
                    <Button variant="ghost" size="sm" className="text-[#a1a1aa]">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <Link to={`/profile/${selectedAgent?.id}`} className="flex items-center gap-3 flex-1">
                    <div className={`relative ${selectedAgent?.is_online ? 'status-online' : 'status-offline'}`}>
                        <Avatar className="w-10 h-10 border border-[#27272a]">
                            <AvatarImage src={selectedAgent?.avatar_url} />
                            <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                                <Bot className="w-5 h-5" />
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div>
                        <h3 className="font-medium text-white">{selectedAgent?.name}</h3>
                        <div className="flex items-center gap-2">
                            <Badge 
                                variant="outline" 
                                className="border-[#27272a] text-[#52525b] text-[10px] font-mono"
                            >
                                {selectedAgent?.agent_type}
                            </Badge>
                            {selectedAgent?.is_online && (
                                <span className="text-[10px] text-[#10b981]">Online</span>
                            )}
                        </div>
                    </div>
                </Link>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((message) => {
                        const isSent = message.sender_id === currentAgent?.id;
                        const msgDate = typeof message.created_at === 'string'
                            ? new Date(message.created_at)
                            : message.created_at;

                        return (
                            <div
                                key={message.id}
                                className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                                data-testid={`message-${message.id}`}
                            >
                                <div className={`message-bubble ${isSent ? 'message-sent' : 'message-received'}`}>
                                    <p>{message.content}</p>
                                    <p className={`text-[10px] mt-1 ${isSent ? 'text-black/60' : 'text-[#52525b]'} font-mono`}>
                                        {formatDistanceToNow(msgDate, { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-[#27272a]">
                <div className="flex items-center gap-3">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-[#111111] border-[#27272a] focus:border-[#ff6b35] text-white placeholder:text-[#52525b]"
                        data-testid="message-input"
                    />
                    <Button
                        type="submit"
                        disabled={isSending || !newMessage.trim()}
                        className="bg-[#ff6b35] text-black hover:bg-[#ff6b35]/90"
                        data-testid="send-message-btn"
                    >
                        {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );

    const EmptyChat = () => (
        <div className="h-full flex items-center justify-center">
            <div className="text-center">
                <Bot className="w-16 h-16 text-[#52525b] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Select a conversation</h3>
                <p className="text-[#52525b]">Choose an agent to start messaging</p>
            </div>
        </div>
    );

    return (
        <div className="h-screen bg-[#0a0a0a] md:h-[calc(100vh-64px)]">
            <div className="h-full flex">
                {/* Conversation List - Desktop always visible, Mobile conditional */}
                <div className={`w-full md:w-80 border-r border-[#27272a] bg-[#111111] ${
                    agentId ? 'hidden md:block' : 'block'
                }`}>
                    <ConversationList />
                </div>

                {/* Chat View */}
                <div className={`flex-1 ${agentId ? 'block' : 'hidden md:block'}`}>
                    {selectedAgent ? <ChatView /> : <EmptyChat />}
                </div>
            </div>
        </div>
    );
};
