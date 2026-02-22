import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../lib/api';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
    Bell, 
    Bot, 
    UserPlus, 
    Heart, 
    MessageCircle,
    Eye,
    ThumbsUp,
    Share2,
    Award,
    Briefcase,
    Check,
    Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NOTIFICATION_ICONS = {
    connection_request: { icon: UserPlus, color: 'text-blue-500' },
    connection_accepted: { icon: UserPlus, color: 'text-green-500' },
    reaction: { icon: Heart, color: 'text-red-500' },
    comment: { icon: MessageCircle, color: 'text-[#ff6b35]' },
    follow: { icon: Eye, color: 'text-purple-500' },
    endorsement: { icon: ThumbsUp, color: 'text-yellow-500' },
    share: { icon: Share2, color: 'text-blue-400' },
    recommendation: { icon: Award, color: 'text-green-400' },
    profile_view: { icon: Eye, color: 'text-[#a1a1aa]' },
    job_application: { icon: Briefcase, color: 'text-[#ff6b35]' },
};

const NotificationItem = ({ notification, onMarkRead }) => {
    const { icon: Icon, color } = NOTIFICATION_ICONS[notification.type] || { icon: Bell, color: 'text-[#a1a1aa]' };
    const createdAt = typeof notification.created_at === 'string' ? new Date(notification.created_at) : notification.created_at;

    return (
        <Link 
            to={notification.link || '#'}
            onClick={() => !notification.read && onMarkRead(notification.id)}
            className={`flex items-start gap-3 p-4 hover:bg-white/5 transition-colors ${!notification.read ? 'bg-[#ff6b35]/5' : ''}`}
        >
            <div className="relative">
                <Avatar className="w-10 h-10 border border-[#27272a]">
                    <AvatarImage src={notification.actor_avatar} />
                    <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                        <Bot className="w-5 h-5" />
                    </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#111111] flex items-center justify-center ${color}`}>
                    <Icon className="w-3 h-3" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-[#ededed]">{notification.message}</p>
                <p className="text-xs text-[#52525b] mt-1">
                    {formatDistanceToNow(createdAt, { addSuffix: true })}
                </p>
            </div>
            {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-[#ff6b35] flex-shrink-0 mt-2" />
            )}
        </Link>
    );
};

export const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const response = await apiService.getNotifications();
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unread_count);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkRead = async (id) => {
        try {
            await apiService.markNotificationRead(id);
            setNotifications(notifications.map(n => 
                n.id === id ? { ...n, read: true } : n
            ));
            setUnreadCount(Math.max(0, unreadCount - 1));
        } catch (error) {
            console.error('Error marking notification read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await apiService.markNotificationsRead();
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <header className="sticky top-0 z-40 glass border-b border-[#27272a]">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-white">Notifications</h1>
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-[#ff6b35] text-black text-xs font-medium rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllRead}
                            className="text-[#ff6b35]"
                            data-testid="mark-all-read-btn"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Mark all as read
                        </Button>
                    )}
                </div>
            </header>

            <div className="max-w-2xl mx-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <Card className="bg-[#111111] border-[#27272a] m-4">
                        <CardContent className="p-12 text-center">
                            <Bell className="w-12 h-12 text-[#52525b] mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">No notifications</h3>
                            <p className="text-[#52525b]">When you get notifications, they'll show up here</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="divide-y divide-[#27272a]">
                        {notifications.map(notification => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkRead={handleMarkRead}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
