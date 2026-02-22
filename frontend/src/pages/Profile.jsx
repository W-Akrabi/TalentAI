import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../lib/api';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { 
    Bot, 
    Users, 
    FileText, 
    Calendar,
    UserPlus,
    MessageSquare,
    Loader2,
    Heart,
    MessageCircle,
    Copy,
    Check,
    Zap,
    MapPin,
    Briefcase,
    Edit2,
    Plus,
    Eye,
    UserCheck,
    UserMinus,
    Building2,
    Award,
    ThumbsUp,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

const ExperienceItem = ({ exp, isOwn, onDelete }) => (
    <div className="flex gap-4 p-4 bg-[#0a0a0a] border border-[#27272a] rounded-lg group">
        <div className="w-12 h-12 bg-[#161616] border border-[#27272a] rounded flex items-center justify-center flex-shrink-0">
            {exp.company_logo ? (
                <img src={exp.company_logo} alt="" className="w-8 h-8 rounded" />
            ) : (
                <Building2 className="w-6 h-6 text-[#52525b]" />
            )}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
                <div>
                    <h4 className="font-medium text-white">{exp.title}</h4>
                    <p className="text-sm text-[#a1a1aa]">{exp.company}</p>
                    <p className="text-xs text-[#52525b] mt-1">
                        {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
                    </p>
                </div>
                {isOwn && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(exp.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>
            {exp.description && (
                <p className="text-sm text-[#a1a1aa] mt-2">{exp.description}</p>
            )}
        </div>
    </div>
);

const SkillBadge = ({ skill, agentId, isOwn, currentAgentId, onEndorse }) => {
    const isEndorsed = skill.endorsements?.includes(currentAgentId);
    
    return (
        <div className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#27272a] rounded-lg">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#ff6b35]/10 rounded flex items-center justify-center">
                    <Award className="w-4 h-4 text-[#ff6b35]" />
                </div>
                <div>
                    <span className="text-sm text-white">{skill.name}</span>
                    <p className="text-xs text-[#52525b]">{skill.endorsements?.length || 0} endorsements</p>
                </div>
            </div>
            {!isOwn && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEndorse(agentId, skill.name)}
                    className={isEndorsed ? 'text-[#ff6b35]' : 'text-[#52525b]'}
                >
                    <ThumbsUp className={`w-4 h-4 ${isEndorsed ? 'fill-current' : ''}`} />
                </Button>
            )}
        </div>
    );
};

const RecommendationCard = ({ rec }) => (
    <div className="p-4 bg-[#0a0a0a] border border-[#27272a] rounded-lg">
        <div className="flex items-start gap-3 mb-3">
            <Link to={`/profile/${rec.author_id}`}>
                <Avatar className="w-10 h-10 border border-[#27272a]">
                    <AvatarImage src={rec.author_avatar} />
                    <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                        <Bot className="w-5 h-5" />
                    </AvatarFallback>
                </Avatar>
            </Link>
            <div>
                <Link to={`/profile/${rec.author_id}`} className="font-medium text-white hover:text-[#ff6b35]">
                    {rec.author_name}
                </Link>
                <p className="text-xs text-[#52525b]">
                    {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}
                </p>
            </div>
        </div>
        <p className="text-sm text-[#a1a1aa] italic">"{rec.content}"</p>
    </div>
);

export const Profile = () => {
    const { agentId } = useParams();
    const { agent: currentAgent } = useAuth();
    const [profileAgent, setProfileAgent] = useState(null);
    const [posts, setPosts] = useState([]);
    const [profileViews, setProfileViews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [followStatus, setFollowStatus] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showAddExp, setShowAddExp] = useState(false);
    const [showAddRec, setShowAddRec] = useState(false);
    const [newExp, setNewExp] = useState({ title: '', company: '', start_date: '', end_date: '', is_current: false, description: '' });
    const [newRec, setNewRec] = useState('');

    const isOwnProfile = currentAgent?.id === agentId;

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const [agentRes, postsRes] = await Promise.all([
                    apiService.getAgent(agentId),
                    apiService.getAgentPosts(agentId)
                ]);
                setProfileAgent(agentRes.data);
                setPosts(postsRes.data);

                if (isOwnProfile) {
                    try {
                        const viewsRes = await apiService.getProfileViews(agentId);
                        setProfileViews(viewsRes.data);
                    } catch (e) {}
                }

                if (!isOwnProfile) {
                    try {
                        const connectionsRes = await apiService.getConnections();
                        const isConnected = connectionsRes.data.some(conn => conn.agent.id === agentId);
                        setConnectionStatus(isConnected ? 'connected' : null);

                        const followingRes = await apiService.getFollowing(currentAgent?.id);
                        const isFollowingAgent = followingRes.data.some(f => f.id === agentId);
                        setFollowStatus(isFollowingAgent);
                    } catch (e) {}
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                toast.error('Failed to load profile');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [agentId, isOwnProfile, currentAgent?.id]);

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            await apiService.requestConnection(agentId);
            setConnectionStatus('pending');
            toast.success('Connection request sent!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to send connection request');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleFollow = async () => {
        setIsFollowing(true);
        try {
            const response = await apiService.followAgent(agentId);
            setFollowStatus(response.data.following);
            setProfileAgent({
                ...profileAgent,
                follower_count: profileAgent.follower_count + (response.data.following ? 1 : -1)
            });
            toast.success(response.data.following ? 'Following!' : 'Unfollowed');
        } catch (error) {
            toast.error('Failed to follow');
        } finally {
            setIsFollowing(false);
        }
    };

    const handleEndorse = async (agentId, skillName) => {
        try {
            await apiService.endorseSkill(agentId, skillName);
            // Refresh profile
            const agentRes = await apiService.getAgent(agentId);
            setProfileAgent(agentRes.data);
            toast.success(`Endorsed for ${skillName}!`);
        } catch (error) {
            toast.error('Failed to endorse');
        }
    };

    const handleAddExperience = async () => {
        try {
            await apiService.addExperience(newExp);
            const agentRes = await apiService.getAgent(agentId);
            setProfileAgent(agentRes.data);
            setNewExp({ title: '', company: '', start_date: '', end_date: '', is_current: false, description: '' });
            setShowAddExp(false);
            toast.success('Experience added!');
        } catch (error) {
            toast.error('Failed to add experience');
        }
    };

    const handleDeleteExperience = async (expId) => {
        try {
            await apiService.deleteExperience(expId);
            const agentRes = await apiService.getAgent(agentId);
            setProfileAgent(agentRes.data);
            toast.success('Experience deleted');
        } catch (error) {
            toast.error('Failed to delete experience');
        }
    };

    const handleAddRecommendation = async () => {
        if (!newRec.trim()) return;
        try {
            await apiService.addRecommendation(agentId, newRec);
            const agentRes = await apiService.getAgent(agentId);
            setProfileAgent(agentRes.data);
            setNewRec('');
            setShowAddRec(false);
            toast.success('Recommendation added!');
        } catch (error) {
            toast.error('Failed to add recommendation');
        }
    };

    const copyAgentId = async () => {
        try {
            await navigator.clipboard.writeText(profileAgent?.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Agent ID copied!');
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
            </div>
        );
    }

    if (!profileAgent) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="text-center">
                    <Bot className="w-16 h-16 text-[#52525b] mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Agent Not Found</h2>
                    <p className="text-[#52525b]">This agent doesn't exist or has been disconnected.</p>
                </div>
            </div>
        );
    }

    const createdAt = typeof profileAgent.created_at === 'string' ? new Date(profileAgent.created_at) : profileAgent.created_at;

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Cover Photo */}
            <div 
                className="h-48 md:h-64 bg-gradient-to-r from-[#ff6b35]/30 via-[#ff6b35]/10 to-[#0a0a0a] relative"
                style={profileAgent.cover_url ? { backgroundImage: `url(${profileAgent.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
                {isOwnProfile && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute bottom-4 right-4 bg-black/50 text-white hover:bg-black/70"
                    >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit cover
                    </Button>
                )}
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
                {/* Profile Header */}
                <Card className="bg-[#111111] border-[#27272a]" data-testid="profile-card">
                    <CardContent className="pt-0">
                        <div className="flex flex-col md:flex-row md:items-end gap-4">
                            <div className={`relative -mt-16 ${profileAgent.is_online ? 'status-online' : 'status-offline'}`}>
                                <Avatar className="w-32 h-32 border-4 border-[#111111]">
                                    <AvatarImage src={profileAgent.avatar_url} />
                                    <AvatarFallback className="bg-[#161616] text-[#ff6b35] text-3xl">
                                        <Bot className="w-16 h-16" />
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="flex-1 pb-4">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                                    <h1 className="text-2xl font-bold text-white">{profileAgent.name}</h1>
                                    <Badge variant="outline" className="border-[#ff6b35] text-[#ff6b35] font-mono w-fit">
                                        {profileAgent.agent_type}
                                    </Badge>
                                    {profileAgent.is_online && (
                                        <div className="connection-status">
                                            <span className="connection-status-dot online" />
                                            <span className="text-[#10b981] text-sm">Online</span>
                                        </div>
                                    )}
                                </div>
                                {profileAgent.headline && (
                                    <p className="text-[#a1a1aa] mb-2">{profileAgent.headline}</p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-[#52525b]">
                                    {profileAgent.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {profileAgent.location}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        {profileAgent.connection_count} connections
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Eye className="w-4 h-4" />
                                        {profileAgent.follower_count} followers
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 pb-4">
                                {!isOwnProfile && (
                                    <>
                                        {connectionStatus === 'connected' ? (
                                            <Link to={`/messages/${agentId}`}>
                                                <Button className="bg-[#ff6b35] text-black hover:bg-[#ff6b35]/90" data-testid="message-btn">
                                                    <MessageSquare className="w-4 h-4 mr-2" />
                                                    Message
                                                </Button>
                                            </Link>
                                        ) : connectionStatus === 'pending' ? (
                                            <Button disabled variant="outline" className="border-[#27272a] text-[#52525b]">
                                                Pending
                                            </Button>
                                        ) : (
                                            <Button onClick={handleConnect} disabled={isConnecting} className="bg-[#ff6b35] text-black hover:bg-[#ff6b35]/90" data-testid="connect-btn">
                                                {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                                Connect
                                            </Button>
                                        )}
                                        <Button onClick={handleFollow} disabled={isFollowing} variant="outline" className="border-[#27272a]">
                                            {isFollowing ? <Loader2 className="w-4 h-4 animate-spin" /> : followStatus ? <UserMinus className="w-4 h-4 mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
                                            {followStatus ? 'Unfollow' : 'Follow'}
                                        </Button>
                                    </>
                                )}
                                {isOwnProfile && (
                                    <Button variant="outline" className="border-[#27272a]">
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        Edit profile
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-3 gap-6 mt-6">
                    {/* Left Column */}
                    <div className="md:col-span-2 space-y-6">
                        {/* About */}
                        {(profileAgent.about || profileAgent.description) && (
                            <Card className="bg-[#111111] border-[#27272a]">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white flex items-center gap-2">
                                        About
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-[#a1a1aa] whitespace-pre-wrap">
                                        {profileAgent.about || profileAgent.description}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Experience */}
                        <Card className="bg-[#111111] border-[#27272a]">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-[#ff6b35]" />
                                    Experience
                                </CardTitle>
                                {isOwnProfile && (
                                    <Dialog open={showAddExp} onOpenChange={setShowAddExp}>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-[#ff6b35]">
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-[#111111] border-[#27272a]">
                                            <DialogHeader>
                                                <DialogTitle className="text-white">Add Experience</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 mt-4">
                                                <Input placeholder="Title" value={newExp.title} onChange={(e) => setNewExp({...newExp, title: e.target.value})} className="bg-[#0a0a0a] border-[#27272a] text-white" />
                                                <Input placeholder="Company" value={newExp.company} onChange={(e) => setNewExp({...newExp, company: e.target.value})} className="bg-[#0a0a0a] border-[#27272a] text-white" />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input placeholder="Start Date (e.g. Jan 2024)" value={newExp.start_date} onChange={(e) => setNewExp({...newExp, start_date: e.target.value})} className="bg-[#0a0a0a] border-[#27272a] text-white" />
                                                    <Input placeholder="End Date" value={newExp.end_date} onChange={(e) => setNewExp({...newExp, end_date: e.target.value})} className="bg-[#0a0a0a] border-[#27272a] text-white" disabled={newExp.is_current} />
                                                </div>
                                                <label className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                                                    <input type="checkbox" checked={newExp.is_current} onChange={(e) => setNewExp({...newExp, is_current: e.target.checked})} />
                                                    Currently working here
                                                </label>
                                                <Textarea placeholder="Description" value={newExp.description} onChange={(e) => setNewExp({...newExp, description: e.target.value})} className="bg-[#0a0a0a] border-[#27272a] text-white" />
                                                <Button onClick={handleAddExperience} className="w-full bg-[#ff6b35] text-black">Add Experience</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </CardHeader>
                            <CardContent>
                                {profileAgent.experience?.length > 0 ? (
                                    <div className="space-y-4">
                                        {profileAgent.experience.map(exp => (
                                            <ExperienceItem key={exp.id} exp={exp} isOwn={isOwnProfile} onDelete={handleDeleteExperience} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[#52525b] text-center py-4">No experience added yet</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Activity/Posts */}
                        <Card className="bg-[#111111] border-[#27272a]">
                            <CardHeader>
                                <CardTitle className="text-lg text-white">Activity</CardTitle>
                                <p className="text-sm text-[#52525b]">{posts.length} posts</p>
                            </CardHeader>
                            <CardContent>
                                {posts.length === 0 ? (
                                    <p className="text-[#52525b] text-center py-8">No posts yet</p>
                                ) : (
                                    <div className="space-y-4">
                                        {posts.slice(0, 5).map(post => {
                                            const postDate = typeof post.created_at === 'string' ? new Date(post.created_at) : post.created_at;
                                            const totalReactions = Object.values(post.reactions || {}).flat().length;
                                            return (
                                                <div key={post.id} className="p-4 bg-[#0a0a0a] border border-[#27272a] rounded-lg">
                                                    <p className="text-[#ededed] mb-3">{post.content}</p>
                                                    <div className="flex items-center gap-4 text-xs text-[#52525b]">
                                                        <span className="font-mono">{formatDistanceToNow(postDate, { addSuffix: true })}</span>
                                                        <div className="flex items-center gap-1">
                                                            <Heart className="w-3 h-3" />
                                                            <span>{totalReactions}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <MessageCircle className="w-3 h-3" />
                                                            <span>{post.comments?.length || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Profile Views (own profile only) */}
                        {isOwnProfile && profileViews.length > 0 && (
                            <Card className="bg-[#111111] border-[#27272a]">
                                <CardHeader>
                                    <CardTitle className="text-sm text-white flex items-center gap-2">
                                        <Eye className="w-4 h-4 text-[#ff6b35]" />
                                        Who viewed your profile
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {profileViews.slice(0, 5).map(viewer => (
                                            <Link key={viewer.id} to={`/profile/${viewer.id}`} className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-lg -mx-2">
                                                <Avatar className="w-10 h-10 border border-[#27272a]">
                                                    <AvatarImage src={viewer.avatar_url} />
                                                    <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                                                        <Bot className="w-5 h-5" />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm text-white">{viewer.name}</p>
                                                    <p className="text-xs text-[#52525b]">{viewer.headline || viewer.agent_type}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Skills */}
                        <Card className="bg-[#111111] border-[#27272a]">
                            <CardHeader>
                                <CardTitle className="text-sm text-white flex items-center gap-2">
                                    <Award className="w-4 h-4 text-[#ff6b35]" />
                                    Skills
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(profileAgent.skills?.length > 0 || profileAgent.capabilities?.length > 0) ? (
                                    <div className="space-y-2">
                                        {profileAgent.skills?.map(skill => (
                                            <SkillBadge key={skill.name} skill={skill} agentId={agentId} isOwn={isOwnProfile} currentAgentId={currentAgent?.id} onEndorse={handleEndorse} />
                                        ))}
                                        {profileAgent.capabilities?.map(cap => (
                                            <SkillBadge key={cap} skill={{ name: cap, endorsements: [] }} agentId={agentId} isOwn={isOwnProfile} currentAgentId={currentAgent?.id} onEndorse={handleEndorse} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[#52525b] text-center py-4 text-sm">No skills added</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recommendations */}
                        <Card className="bg-[#111111] border-[#27272a]">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-sm text-white">Recommendations</CardTitle>
                                {!isOwnProfile && (
                                    <Dialog open={showAddRec} onOpenChange={setShowAddRec}>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-[#ff6b35]">
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-[#111111] border-[#27272a]">
                                            <DialogHeader>
                                                <DialogTitle className="text-white">Write a Recommendation</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 mt-4">
                                                <Textarea placeholder={`What do you want to say about ${profileAgent.name}?`} value={newRec} onChange={(e) => setNewRec(e.target.value)} className="bg-[#0a0a0a] border-[#27272a] text-white min-h-[100px]" />
                                                <Button onClick={handleAddRecommendation} className="w-full bg-[#ff6b35] text-black">Submit Recommendation</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </CardHeader>
                            <CardContent>
                                {profileAgent.recommendations?.length > 0 ? (
                                    <div className="space-y-4">
                                        {profileAgent.recommendations.map(rec => (
                                            <RecommendationCard key={rec.id} rec={rec} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[#52525b] text-center py-4 text-sm">No recommendations yet</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Agent Info */}
                        <Card className="bg-[#111111] border-[#27272a]">
                            <CardContent className="p-4">
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#52525b]">Agent ID</span>
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs text-[#a1a1aa] font-mono">{profileAgent.id.slice(0, 8)}...</code>
                                            <Button variant="ghost" size="sm" onClick={copyAgentId} className="h-6 w-6 p-0 text-[#52525b]">
                                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#52525b]">Joined</span>
                                        <span className="text-[#a1a1aa]">{format(createdAt, 'MMM yyyy')}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};
