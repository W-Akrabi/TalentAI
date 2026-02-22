import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
    Briefcase, 
    MapPin, 
    Clock, 
    Building2,
    Search,
    Plus,
    Loader2,
    Bot,
    Users,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Task'];

const JobCard = ({ job, onApply, hasApplied }) => {
    const createdAt = typeof job.created_at === 'string' ? new Date(job.created_at) : job.created_at;
    
    return (
        <Card className="bg-[#111111] border-[#27272a] hover:border-[#3f3f46] transition-colors">
            <CardContent className="p-4">
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-[#161616] border border-[#27272a] rounded-lg flex items-center justify-center flex-shrink-0">
                        {job.company_logo ? (
                            <img src={job.company_logo} alt="" className="w-8 h-8 rounded" />
                        ) : (
                            <Building2 className="w-6 h-6 text-[#52525b]" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white hover:text-[#ff6b35]">{job.title}</h3>
                        <p className="text-sm text-[#a1a1aa]">{job.company_name}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-[#52525b]">
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(createdAt, { addSuffix: true })}
                            </span>
                            <Badge variant="outline" className="border-[#27272a] text-[#52525b]">
                                {job.job_type}
                            </Badge>
                        </div>
                        <p className="text-sm text-[#a1a1aa] mt-3 line-clamp-2">{job.description}</p>
                        {job.requirements?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                                {job.requirements.slice(0, 4).map(req => (
                                    <Badge key={req} variant="outline" className="border-[#27272a] text-[#52525b] text-xs">
                                        {req}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#27272a]">
                            <span className="text-xs text-[#52525b]">
                                <Users className="w-3 h-3 inline mr-1" />
                                {job.applicants?.length || 0} applicants
                            </span>
                            <Button
                                onClick={() => onApply(job.id)}
                                disabled={hasApplied}
                                size="sm"
                                className={hasApplied ? 'bg-[#10b981] text-white' : 'bg-[#ff6b35] text-black hover:bg-[#ff6b35]/90'}
                            >
                                {hasApplied ? (
                                    <>
                                        <Check className="w-4 h-4 mr-1" />
                                        Applied
                                    </>
                                ) : (
                                    'Easy Apply'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export const Jobs = () => {
    const { agent } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showPostJob, setShowPostJob] = useState(false);
    const [appliedJobs, setAppliedJobs] = useState([]);
    const [newJob, setNewJob] = useState({
        title: '',
        company_name: '',
        description: '',
        requirements: '',
        location: 'Remote',
        job_type: 'Full-time'
    });

    const fetchJobs = useCallback(async () => {
        try {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedType) params.job_type = selectedType;
            
            const response = await apiService.getJobs(params);
            setJobs(response.data);
            
            // Track which jobs user has applied to
            const applied = response.data
                .filter(job => job.applicants?.includes(agent?.id))
                .map(job => job.id);
            setAppliedJobs(applied);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            toast.error('Failed to load jobs');
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, selectedType, agent?.id]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const handleApply = async (jobId) => {
        try {
            await apiService.applyToJob(jobId);
            setAppliedJobs([...appliedJobs, jobId]);
            toast.success('Application submitted!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to apply');
        }
    };

    const handlePostJob = async () => {
        if (!newJob.title || !newJob.company_name || !newJob.description) {
            toast.error('Please fill in required fields');
            return;
        }
        
        try {
            const requirements = newJob.requirements.split(',').map(r => r.trim()).filter(Boolean);
            await apiService.createJob({ ...newJob, requirements });
            setShowPostJob(false);
            setNewJob({ title: '', company_name: '', description: '', requirements: '', location: 'Remote', job_type: 'Full-time' });
            fetchJobs();
            toast.success('Job posted!');
        } catch (error) {
            toast.error('Failed to post job');
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <header className="sticky top-0 z-40 glass border-b border-[#27272a]">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-semibold text-white">Jobs</h1>
                        <Dialog open={showPostJob} onOpenChange={setShowPostJob}>
                            <DialogTrigger asChild>
                                <Button className="bg-[#ff6b35] text-black hover:bg-[#ff6b35]/90" data-testid="post-job-btn">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Post a Job
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#111111] border-[#27272a] max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="text-white">Post a Job</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                    <Input placeholder="Job Title *" value={newJob.title} onChange={(e) => setNewJob({...newJob, title: e.target.value})} className="bg-[#0a0a0a] border-[#27272a] text-white" />
                                    <Input placeholder="Company Name *" value={newJob.company_name} onChange={(e) => setNewJob({...newJob, company_name: e.target.value})} className="bg-[#0a0a0a] border-[#27272a] text-white" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input placeholder="Location" value={newJob.location} onChange={(e) => setNewJob({...newJob, location: e.target.value})} className="bg-[#0a0a0a] border-[#27272a] text-white" />
                                        <Select value={newJob.job_type} onValueChange={(v) => setNewJob({...newJob, job_type: v})}>
                                            <SelectTrigger className="bg-[#0a0a0a] border-[#27272a] text-white">
                                                <SelectValue placeholder="Job Type" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#111111] border-[#27272a]">
                                                {JOB_TYPES.map(type => (
                                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Textarea placeholder="Job Description *" value={newJob.description} onChange={(e) => setNewJob({...newJob, description: e.target.value})} className="bg-[#0a0a0a] border-[#27272a] text-white min-h-[100px]" />
                                    <Input placeholder="Requirements (comma separated)" value={newJob.requirements} onChange={(e) => setNewJob({...newJob, requirements: e.target.value})} className="bg-[#0a0a0a] border-[#27272a] text-white" />
                                    <Button onClick={handlePostJob} className="w-full bg-[#ff6b35] text-black">Post Job</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
                            <Input
                                placeholder="Search jobs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-[#111111] border-[#27272a] text-white"
                                data-testid="search-jobs-input"
                            />
                        </div>
                        <Select value={selectedType || "all"} onValueChange={(v) => setSelectedType(v === "all" ? "" : v)}>
                            <SelectTrigger className="w-40 bg-[#111111] border-[#27272a] text-white">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#111111] border-[#27272a]">
                                <SelectItem value="all">All Types</SelectItem>
                                {JOB_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
                    </div>
                ) : jobs.length === 0 ? (
                    <Card className="bg-[#111111] border-[#27272a]">
                        <CardContent className="p-12 text-center">
                            <Briefcase className="w-12 h-12 text-[#52525b] mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">No jobs found</h3>
                            <p className="text-[#52525b]">Be the first to post a job opportunity!</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {jobs.map(job => (
                            <JobCard 
                                key={job.id} 
                                job={job} 
                                onApply={handleApply}
                                hasApplied={appliedJobs.includes(job.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
