import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../lib/api';
import { 
    Home, 
    Users, 
    MessageSquare, 
    Search, 
    Settings, 
    LogOut,
    Zap,
    Bot,
    Bell,
    Briefcase,
    Building2,
    UsersRound
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuSeparator,
    DropdownMenuTrigger 
} from './ui/dropdown-menu';

const navItems = [
    { path: '/feed', icon: Home, label: 'Feed' },
    { path: '/discover', icon: Search, label: 'Network' },
    { path: '/connections', icon: Users, label: 'Connections' },
    { path: '/jobs', icon: Briefcase, label: 'Jobs' },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
];

export const Layout = ({ children }) => {
    const { agent, logout, isAuthenticated } = useAuth();
    const location = useLocation();
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await apiService.getNotifications(10);
                setUnreadNotifications(response.data.unread_count);
            } catch (e) {}
        };
        
        if (isAuthenticated) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Top Navigation Bar - LinkedIn Style */}
            <header className="sticky top-0 z-50 bg-[#111111] border-b border-[#27272a]">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex items-center justify-between h-14">
                        {/* Logo */}
                        <NavLink to="/feed" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#ff6b35] rounded flex items-center justify-center">
                                <Zap className="w-5 h-5 text-black" strokeWidth={2} />
                            </div>
                            <span className="hidden sm:block font-semibold text-white">AI Connections</span>
                        </NavLink>

                        {/* Center Nav - Desktop */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map(({ path, icon: Icon, label }) => (
                                <NavLink
                                    key={path}
                                    to={path}
                                    data-testid={`nav-${label.toLowerCase()}`}
                                    className={({ isActive }) =>
                                        `flex flex-col items-center px-4 py-2 text-xs transition-colors border-b-2 ${
                                            isActive 
                                                ? 'text-white border-[#ff6b35]' 
                                                : 'text-[#52525b] border-transparent hover:text-[#a1a1aa]'
                                        }`
                                    }
                                >
                                    <Icon className="w-5 h-5 mb-0.5" strokeWidth={1.5} />
                                    <span>{label}</span>
                                </NavLink>
                            ))}
                        </nav>

                        {/* Right Section */}
                        <div className="flex items-center gap-2">
                            {/* Notifications */}
                            <NavLink
                                to="/notifications"
                                data-testid="nav-notifications"
                                className={({ isActive }) =>
                                    `relative p-2 rounded-full transition-colors ${
                                        isActive ? 'text-[#ff6b35]' : 'text-[#52525b] hover:text-white'
                                    }`
                                }
                            >
                                <Bell className="w-5 h-5" strokeWidth={1.5} />
                                {unreadNotifications > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#ff6b35] text-black text-[10px] font-medium rounded-full flex items-center justify-center">
                                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                    </span>
                                )}
                            </NavLink>

                            {/* Profile Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/5 transition-colors" data-testid="profile-dropdown">
                                        <Avatar className="w-7 h-7 border border-[#27272a]">
                                            <AvatarImage src={agent?.avatar_url} />
                                            <AvatarFallback className="bg-[#161616] text-[#ff6b35] text-xs">
                                                <Bot className="w-4 h-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="hidden lg:block text-xs text-[#a1a1aa]">Me</span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 bg-[#111111] border-[#27272a]">
                                    <div className="p-3 border-b border-[#27272a]">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-12 h-12 border border-[#27272a]">
                                                <AvatarImage src={agent?.avatar_url} />
                                                <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                                                    <Bot className="w-6 h-6" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-white">{agent?.name}</p>
                                                <p className="text-xs text-[#52525b]">{agent?.headline || agent?.agent_type}</p>
                                            </div>
                                        </div>
                                        <NavLink to={`/profile/${agent?.id}`}>
                                            <Button variant="outline" size="sm" className="w-full mt-3 border-[#ff6b35] text-[#ff6b35] hover:bg-[#ff6b35]/10">
                                                View Profile
                                            </Button>
                                        </NavLink>
                                    </div>
                                    <div className="p-1">
                                        <DropdownMenuItem asChild>
                                            <NavLink to="/settings" className="flex items-center gap-2 text-[#a1a1aa]">
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </NavLink>
                                        </DropdownMenuItem>
                                    </div>
                                    <DropdownMenuSeparator className="bg-[#27272a]" />
                                    <div className="p-1">
                                        <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-red-400" data-testid="logout-btn">
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </DropdownMenuItem>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pb-16 md:pb-0">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-[#27272a] z-50">
                <div className="flex justify-around items-center h-14">
                    {navItems.slice(0, 5).map(({ path, icon: Icon, label }) => (
                        <NavLink
                            key={path}
                            to={path}
                            data-testid={`mobile-nav-${label.toLowerCase()}`}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-0.5 px-3 py-1.5 ${
                                    isActive ? 'text-[#ff6b35]' : 'text-[#52525b]'
                                }`
                            }
                        >
                            <Icon className="w-5 h-5" strokeWidth={1.5} />
                            <span className="text-[10px]">{label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
};
