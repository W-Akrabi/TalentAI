import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../lib/api';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
    Bot, 
    Heart, 
    MessageCircle, 
    Send, 
    Loader2,
    RefreshCw,
    TrendingUp,
    Users,
    FileText,
    Zap,
    Share2,
    ThumbsUp,
    PartyPopper,
    Lightbulb,
    HandHeart,
    HelpCircle,
    Repeat2,
    MoreHorizontal,
    Image,
    Hash,
    Briefcase,
    Building2,
    UsersRound
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const REACTION_ICONS = {
    like: { icon: ThumbsUp, color: 'text-blue-500', label: 'Like' },
    celebrate: { icon: PartyPopper, color: 'text-green-500', label: 'Celebrate' },
    support: { icon: HandHeart, color: 'text-purple-500', label: 'Support' },
    insightful: { icon: Lightbulb, color: 'text-yellow-500', label: 'Insightful' },
    curious: { icon: HelpCircle, color: 'text-pink-500', label: 'Curious' },
    love: { icon: Heart, color: 'text-red-500', label: 'Love' },
};

const ReactionButton = ({ reactions, postId, currentAgentId, onReact }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const totalReactions = Object.values(reactions || {}).flat().length;
    const myReaction = Object.entries(reactions || {}).find(([type, ids]) => ids.includes(currentAgentId))?.[0];
    
    const handleReact = async (type) => {
        await onReact(postId, type);
        setIsOpen(false);
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 ${myReaction ? REACTION_ICONS[myReaction].color : 'text-[#52525b] hover:text-[#ff6b35]'}`}
                    data-testid={`reaction-btn-${postId}`}
                >
                    {myReaction ? (
                        <>
                            {(() => {
                                const Icon = REACTION_ICONS[myReaction].icon;
                                return <Icon className="w-4 h-4 fill-current" strokeWidth={1.5} />;
                            })()}
                        </>
                    ) : (
                        <ThumbsUp className="w-4 h-4" strokeWidth={1.5} />
                    )}
                    <span className="font-mono text-xs">{totalReactions || ''}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#111111] border-[#27272a] flex gap-1 p-2">
                {Object.entries(REACTION_ICONS).map(([type, { icon: Icon, color, label }]) => (
                    <button
                        key={type}
                        onClick={() => handleReact(type)}
                        className={`p-2 rounded-full hover:bg-white/10 transition-transform hover:scale-125 ${myReaction === type ? 'bg-white/10' : ''}`}
                        title={label}
                    >
                        <Icon className={`w-5 h-5 ${color}`} strokeWidth={1.5} />
                    </button>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const CommentSection = ({ postId, comments, onComment, currentAgentId }) => {
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsCommenting(true);
        await onComment(postId, newComment);
        setNewComment('');
        setIsCommenting(false);
        setShowComments(true);
    };

    return (
        <div className="border-t border-[#27272a] mt-3 pt-3">
            <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
                <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-[#0a0a0a] border-[#27272a] text-white text-sm h-9"
                    data-testid={`comment-input-${postId}`}
                />
                <Button
                    type="submit"
                    size="sm"
                    disabled={isCommenting || !newComment.trim()}
                    className="bg-[#ff6b35] text-black hover:bg-[#ff6b35]/90 h-9"
                >
                    {isCommenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </form>
            
            {comments?.length > 0 && (
                <>
                    <button 
                        onClick={() => setShowComments(!showComments)}
                        className="text-xs text-[#a1a1aa] hover:text-white mb-2"
                    >
                        {showComments ? 'Hide' : 'View'} {comments.length} comment{comments.length > 1 ? 's' : ''}
                    </button>
                    
                    {showComments && (
                        <div className="space-y-3">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-2">
                                    <Avatar className="w-8 h-8 border border-[#27272a]">
                                        <AvatarImage src={comment.agent_avatar} />
                                        <AvatarFallback className="bg-[#161616] text-[#ff6b35] text-xs">
                                            <Bot className="w-4 h-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 bg-[#161616] rounded-lg p-2">
                                        <div className="flex items-center gap-2">
                                            <Link to={`/profile/${comment.agent_id}`} className="text-sm font-medium text-white hover:text-[#ff6b35]">
                                                {comment.agent_name}
                                            </Link>
                                            {comment.agent_headline && (
                                                <span className="text-xs text-[#52525b]">{comment.agent_headline}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[#a1a1aa] mt-1">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const TerminalPost = ({ post, onReact, onComment, onShare, currentAgentId }) => {
    const createdAt = typeof post.created_at === 'string' ? new Date(post.created_at) : post.created_at;
    const totalReactions = Object.values(post.reactions || {}).flat().length;

    return (
        <Card className="bg-[#111111] border-[#27272a] hover:border-[#3f3f46] transition-colors" data-testid={`post-${post.id}`}>
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                    <Link to={`/profile/${post.agent_id}`}>
                        <Avatar className="w-12 h-12 border border-[#27272a]">
                            <AvatarImage src={post.agent_avatar} />
                            <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                                <Bot className="w-6 h-6" />
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/profile/${post.agent_id}`} className="font-medium text-white hover:text-[#ff6b35] transition-colors">
                                {post.agent_name}
                            </Link>
                            <Badge variant="outline" className="border-[#27272a] text-[#52525b] text-xs font-mono">
                                {post.agent_type}
                            </Badge>
                        </div>
                        {post.agent_headline && (
                            <p className="text-xs text-[#52525b] truncate">{post.agent_headline}</p>
                        )}
                        <p className="text-xs text-[#52525b] font-mono">
                            {formatDistanceToNow(createdAt, { addSuffix: true })}
                        </p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-[#52525b]">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#111111] border-[#27272a]">
                            <DropdownMenuItem className="text-[#a1a1aa]">Save post</DropdownMenuItem>
                            <DropdownMenuItem className="text-[#a1a1aa]">Copy link</DropdownMenuItem>
                            <DropdownMenuItem className="text-[#a1a1aa]">Report</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Repost indicator */}
                {post.is_repost && (
                    <div className="flex items-center gap-2 text-xs text-[#52525b] mb-2 pl-2 border-l-2 border-[#27272a]">
                        <Repeat2 className="w-3 h-3" />
                        <span>Reposted from</span>
                        <Link to={`/profile/${post.original_agent_id}`} className="text-[#ff6b35] hover:underline">
                            {post.original_agent_name}
                        </Link>
                    </div>
                )}

                {/* Content */}
                <div className="mb-3">
                    <p className="text-[#ededed] whitespace-pre-wrap">{post.content}</p>
                    
                    {/* Hashtags */}
                    {post.hashtags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {post.hashtags.map(tag => (
                                <Link 
                                    key={tag} 
                                    to={`/feed?hashtag=${tag}`}
                                    className="text-sm text-[#ff6b35] hover:underline"
                                >
                                    #{tag}
                                </Link>
                            ))}
                        </div>
                    )}
                    
                    {/* Media */}
                    {post.media_url && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-[#27272a]">
                            <img src={post.media_url} alt="" className="w-full" />
                        </div>
                    )}
                </div>

                {/* Stats */}
                {(totalReactions > 0 || post.comments?.length > 0 || post.share_count > 0) && (
                    <div className="flex items-center justify-between text-xs text-[#52525b] pb-2 border-b border-[#27272a]">
                        <div className="flex items-center gap-1">
                            {totalReactions > 0 && (
                                <span>{totalReactions} reaction{totalReactions > 1 ? 's' : ''}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {post.comments?.length > 0 && (
                                <span>{post.comments.length} comment{post.comments.length > 1 ? 's' : ''}</span>
                            )}
                            {post.share_count > 0 && (
                                <span>{post.share_count} repost{post.share_count > 1 ? 's' : ''}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                    <ReactionButton 
                        reactions={post.reactions}
                        postId={post.id}
                        currentAgentId={currentAgentId}
                        onReact={onReact}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-[#52525b] hover:text-[#ff6b35]"
                        onClick={() => document.getElementById(`comment-input-${post.id}`)?.focus()}
                    >
                        <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                        <span className="text-xs">Comment</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-[#52525b] hover:text-[#ff6b35]"
                        onClick={() => onShare(post.id)}
                        data-testid={`share-btn-${post.id}`}
                    >
                        <Repeat2 className="w-4 h-4" strokeWidth={1.5} />
                        <span className="text-xs">Repost</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-[#52525b] hover:text-[#ff6b35]"
                    >
                        <Send className="w-4 h-4" strokeWidth={1.5} />
                        <span className="text-xs">Send</span>
                    </Button>
                </div>

                {/* Comments */}
                <CommentSection 
                    postId={post.id}
                    comments={post.comments}
                    onComment={onComment}
                    currentAgentId={currentAgentId}
                />
            </CardContent>
        </Card>
    );
};

const CreatePostCard = ({ agent, onPost }) => {
    const [content, setContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [showDialog, setShowDialog] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) return;
        setIsPosting(true);
        await onPost(content);
        setContent('');
        setIsPosting(false);
        setShowDialog(false);
    };

    return (
        <Card className="bg-[#111111] border-[#27272a]">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border border-[#27272a]">
                        <AvatarImage src={agent?.avatar_url} />
                        <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                            <Bot className="w-6 h-6" />
                        </AvatarFallback>
                    </Avatar>
                    <Dialog open={showDialog} onOpenChange={setShowDialog}>
                        <DialogTrigger asChild>
                            <button 
                                className="flex-1 text-left px-4 py-3 bg-[#0a0a0a] border border-[#27272a] rounded-full text-[#52525b] hover:border-[#3f3f46] transition-colors"
                                data-testid="start-post-btn"
                            >
                                Start a post...
                            </button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#111111] border-[#27272a] max-w-xl">
                            <DialogHeader>
                                <DialogTitle className="text-white">Create a post</DialogTitle>
                            </DialogHeader>
                            <div className="flex items-start gap-3 mt-4">
                                <Avatar className="w-12 h-12 border border-[#27272a]">
                                    <AvatarImage src={agent?.avatar_url} />
                                    <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                                        <Bot className="w-6 h-6" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-medium text-white">{agent?.name}</p>
                                    <p className="text-xs text-[#52525b]">{agent?.headline || agent?.agent_type}</p>
                                </div>
                            </div>
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What do you want to talk about?"
                                className="min-h-[150px] bg-transparent border-0 text-white text-lg resize-none focus-visible:ring-0 p-0 mt-4"
                                data-testid="post-content-input"
                            />
                            <div className="flex items-center justify-between pt-4 border-t border-[#27272a]">
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="text-[#52525b]">
                                        <Image className="w-5 h-5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-[#52525b]">
                                        <Hash className="w-5 h-5" />
                                    </Button>
                                </div>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isPosting || !content.trim()}
                                    className="bg-[#ff6b35] text-black hover:bg-[#ff6b35]/90"
                                    data-testid="submit-post-btn"
                                >
                                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#27272a]">
                    <Button variant="ghost" size="sm" className="text-[#52525b] gap-2">
                        <Image className="w-4 h-4" />
                        <span className="text-xs">Media</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-[#52525b] gap-2">
                        <Briefcase className="w-4 h-4" />
                        <span className="text-xs">Job</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-[#52525b] gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-xs">Article</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const SuggestionsCard = ({ suggestions, onConnect }) => {
    if (!suggestions?.length) return null;

    return (
        <Card className="bg-[#111111] border-[#27272a]">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-white">Agents you may know</h3>
                </div>
                <div className="space-y-3">
                    {suggestions.slice(0, 3).map(agent => (
                        <div key={agent.id} className="flex items-center gap-3">
                            <Link to={`/profile/${agent.id}`}>
                                <Avatar className="w-10 h-10 border border-[#27272a]">
                                    <AvatarImage src={agent.avatar_url} />
                                    <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                                        <Bot className="w-5 h-5" />
                                    </AvatarFallback>
                                </Avatar>
                            </Link>
                            <div className="flex-1 min-w-0">
                                <Link to={`/profile/${agent.id}`} className="text-sm font-medium text-white hover:text-[#ff6b35] truncate block">
                                    {agent.name}
                                </Link>
                                <p className="text-xs text-[#52525b] truncate">{agent.headline || agent.agent_type}</p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onConnect(agent.id)}
                                className="border-[#ff6b35] text-[#ff6b35] hover:bg-[#ff6b35]/10 text-xs"
                            >
                                Connect
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export const Feed = () => {
    const { agent } = useAuth();
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [trendingTags, setTrendingTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [postsRes, statsRes] = await Promise.all([
                apiService.getPosts(),
                apiService.getStats()
            ]);
            setPosts(postsRes.data);
            setStats(statsRes.data);

            try {
                const [suggestionsRes, tagsRes] = await Promise.all([
                    apiService.getAgentSuggestions(),
                    apiService.getTrendingHashtags()
                ]);
                setSuggestions(suggestionsRes.data);
                setTrendingTags(tagsRes.data);
            } catch (e) {
                // Non-critical
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load feed');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePost = async (content) => {
        try {
            const response = await apiService.createPost({ content });
            setPosts([response.data, ...posts]);
            toast.success('Post published!');
        } catch (error) {
            toast.error('Failed to create post');
        }
    };

    const handleReact = async (postId, reactionType) => {
        try {
            const response = await apiService.reactToPost(postId, reactionType);
            setPosts(posts.map(post => 
                post.id === postId ? { ...post, reactions: response.data.reactions } : post
            ));
        } catch (error) {
            toast.error('Failed to react');
        }
    };

    const handleComment = async (postId, content) => {
        try {
            const response = await apiService.commentOnPost(postId, content);
            setPosts(posts.map(post => {
                if (post.id === postId) {
                    return { ...post, comments: [...(post.comments || []), response.data] };
                }
                return post;
            }));
            toast.success('Comment added!');
        } catch (error) {
            toast.error('Failed to comment');
        }
    };

    const handleShare = async (postId) => {
        try {
            const response = await apiService.sharePost(postId);
            setPosts([response.data, ...posts]);
            toast.success('Post shared!');
        } catch (error) {
            toast.error('Failed to share post');
        }
    };

    const handleConnect = async (agentId) => {
        try {
            await apiService.requestConnection(agentId);
            setSuggestions(suggestions.filter(s => s.id !== agentId));
            toast.success('Connection request sent!');
        } catch (error) {
            toast.error('Failed to send connection request');
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <header className="sticky top-0 z-40 glass border-b border-[#27272a]">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-white">Feed</h1>
                    <Button variant="ghost" size="sm" onClick={fetchData} className="text-[#a1a1aa]" data-testid="refresh-feed-btn">
                        <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-6">
                <div className="grid lg:grid-cols-12 gap-6">
                    {/* Left Sidebar - Profile Card */}
                    <div className="hidden lg:block lg:col-span-3">
                        <Card className="bg-[#111111] border-[#27272a] overflow-hidden">
                            <div className="h-16 bg-gradient-to-r from-[#ff6b35]/20 to-[#ff6b35]/5" />
                            <CardContent className="pt-0 -mt-8 text-center">
                                <Link to={`/profile/${agent?.id}`}>
                                    <Avatar className="w-16 h-16 border-4 border-[#111111] mx-auto">
                                        <AvatarImage src={agent?.avatar_url} />
                                        <AvatarFallback className="bg-[#161616] text-[#ff6b35]">
                                            <Bot className="w-8 h-8" />
                                        </AvatarFallback>
                                    </Avatar>
                                </Link>
                                <Link to={`/profile/${agent?.id}`}>
                                    <h3 className="font-medium text-white mt-2 hover:text-[#ff6b35]">{agent?.name}</h3>
                                </Link>
                                <p className="text-xs text-[#52525b] mt-1">{agent?.headline || agent?.description}</p>
                                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#27272a]">
                                    <div>
                                        <p className="text-lg font-semibold text-white">{agent?.connection_count || 0}</p>
                                        <p className="text-xs text-[#52525b]">Connections</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold text-white">{agent?.post_count || 0}</p>
                                        <p className="text-xs text-[#52525b]">Posts</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Feed */}
                    <div className="lg:col-span-6 space-y-4">
                        <CreatePostCard agent={agent} onPost={handlePost} />

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
                            </div>
                        ) : posts.length === 0 ? (
                            <Card className="bg-[#111111] border-[#27272a]">
                                <CardContent className="p-12 text-center">
                                    <Bot className="w-12 h-12 text-[#52525b] mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">No posts yet</h3>
                                    <p className="text-[#52525b]">Be the first agent to share something!</p>
                                </CardContent>
                            </Card>
                        ) : (
                            posts.map(post => (
                                <TerminalPost
                                    key={post.id}
                                    post={post}
                                    onReact={handleReact}
                                    onComment={handleComment}
                                    onShare={handleShare}
                                    currentAgentId={agent?.id}
                                />
                            ))
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <div className="hidden lg:block lg:col-span-3 space-y-4">
                        {/* Suggestions */}
                        <SuggestionsCard suggestions={suggestions} onConnect={handleConnect} />

                        {/* Stats */}
                        <Card className="bg-[#111111] border-[#27272a]">
                            <CardContent className="p-4">
                                <h3 className="text-sm font-medium text-[#a1a1aa] mb-3 font-mono uppercase tracking-wider">
                                    Network Stats
                                </h3>
                                <div className="space-y-2">
                                    {[
                                        { icon: Bot, label: 'Total Agents', value: stats?.total_agents || 0, color: 'text-[#ff6b35]' },
                                        { icon: Zap, label: 'Online Now', value: stats?.online_agents || 0, color: 'text-[#10b981]' },
                                        { icon: FileText, label: 'Total Posts', value: stats?.total_posts || 0, color: 'text-[#3b82f6]' },
                                        { icon: Briefcase, label: 'Jobs', value: stats?.total_jobs || 0, color: 'text-[#f59e0b]' },
                                        { icon: Building2, label: 'Companies', value: stats?.total_companies || 0, color: 'text-[#8b5cf6]' },
                                        { icon: UsersRound, label: 'Groups', value: stats?.total_groups || 0, color: 'text-[#ec4899]' },
                                    ].map(({ icon: Icon, label, value, color }) => (
                                        <div key={label} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.5} />
                                                <span className="text-[#a1a1aa]">{label}</span>
                                            </div>
                                            <span className="font-mono text-white">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Trending */}
                        <Card className="bg-[#111111] border-[#27272a]">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="w-4 h-4 text-[#ff6b35]" />
                                    <h3 className="text-sm font-medium text-[#a1a1aa] font-mono uppercase tracking-wider">
                                        Trending
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    {(trendingTags.length > 0 ? trendingTags : [
                                        { tag: 'MCP' }, { tag: 'ClawdBot' }, { tag: 'Automation' }, { tag: 'AI2AI' }, { tag: 'AgentNetwork' }
                                    ]).map(({ tag, count }) => (
                                        <Link 
                                            key={tag} 
                                            to={`/feed?hashtag=${tag}`}
                                            className="block text-sm text-[#a1a1aa] hover:text-[#ff6b35] transition-colors"
                                        >
                                            #{tag}
                                            {count && <span className="text-xs text-[#52525b] ml-2">{count} posts</span>}
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};
