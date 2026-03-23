import { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, Star, ExternalLink, Sparkles } from 'lucide-react';
import api from '../../utils/api';

interface JobCardProps {
    job: {
        id: number;
        company_name: string;
        role_title: string;
        location?: string;
        salary_range?: string;
        description: string;
        apply_link: string;
        created_at: string;
        match_score?: number;
        matching_tags?: string; // JSON Array formatted string
        summary_analysis?: string;
    };
    selectedCvId: string;
    externalScore?: number | null;
    externalTags?: string[];
    externalAnalysis?: string | null;
}

export default function JobCard({ job, selectedCvId, externalScore, externalTags, externalAnalysis }: JobCardProps) {
    const [loading, setLoading] = useState(false);
    const [score, setScore] = useState<number | null>(job.match_score !== undefined ? job.match_score : null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [tags, setTags] = useState<string[]>(() => {
        try { return JSON.parse(job.matching_tags || '[]'); } catch { return []; }
    });
    const [analysis, setAnalysis] = useState<string | null>(job.summary_analysis || null);

    // Sync external batch results when parent updates them
    useEffect(() => {
        if (externalScore !== undefined && externalScore !== null) {
            setScore(externalScore);
            setTags(externalTags || []);
            setAnalysis(externalAnalysis || null);
        }
    }, [externalScore, externalTags, externalAnalysis]);

    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        const checkSavedStatus = async () => {
            try {
                const res = await api.get('/applications');
                if (res.data && Array.isArray(res.data)) {
                    const exists = res.data.some((app: any) => app.company_name === job.company_name && app.role_title === job.role_title);
                    if (exists) setIsSaved(true);
                }
            } catch (err) {
                console.error("Check saved status error", err);
            }
        };
        checkSavedStatus();
    }, [job.company_name, job.role_title]);

    const handleRunMatch = async () => {
        if (!selectedCvId) return;
        setLoading(true);
        try {
            const res = await api.post('/ai/match', { resume_id: parseInt(selectedCvId), job_id: job.id });
            setScore(res.data.match_score);
            setTags(res.data.matching_tags || []);
            setAnalysis(res.data.summary_analysis);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleSaveForLater = async () => {
        try {
            await api.post('/applications', {
                resume_id: selectedCvId ? parseInt(selectedCvId) : null,
                company_name: job.company_name,
                role_title: job.role_title,
                status: 'Saved',
                notes: `Saved from Job Search. Match Score: ${score !== null ? score + '%' : 'N/A'}`
            });
            setIsSaved(true);
        } catch (err) {
            console.error("Save application error", err);
        }
    };

    return (
        <div className="glass-panel p-6 hover:border-border-focus transition-all duration-300 animate-fade-in mb-4">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    <div>
                        {job.created_at && (
                            <div className="text-xs text-accent-secondary/80 font-medium mb-1 tracking-wider uppercase">
                                {new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        )}
                        <h3 className="text-xl font-semibold mb-1">{job.role_title}</h3>
                        <div className="flex gap-4 text-sm text-secondary">
                            <span className="flex items-center gap-1"><Briefcase size={14}/> {job.company_name}</span>
                            <span className="flex items-center gap-1"><MapPin size={14}/> {job.location || 'Remote'}</span>
                            <span className="flex items-center gap-1 text-success"><DollarSign size={14}/> {job.salary_range || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    <div className="relative w-14 h-14 flex items-center justify-center rounded-full border-4" style={{
                        borderColor: score !== null
                            ? score >= 60 ? '#10b981'    // green - strong match
                            : score >= 30 ? '#f59e0b'    // amber - moderate
                            : '#ef4444'                  // red - weak
                            : 'rgba(255,255,255,0.1)',
                        boxShadow: score !== null ? `0 0 8px ${score >= 60 ? 'rgba(16,185,129,0.4)' : score >= 30 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.3)'}` : 'none'
                    }}>
                        <span className="font-bold font-heading text-sm" style={{ color: score !== null ? (score >= 60 ? '#10b981' : score >= 30 ? '#f59e0b' : '#ef4444') : 'inherit' }}>{score !== null ? `${score}%` : 'N/A'}</span>
                    </div>
                    <span className="text-xs text-secondary mt-1">CV Match</span>
                </div>
            </div>

            {score !== null ? (
                <>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {tags.map((tag, t) => (
                            <span key={t} className="badge bg-[rgba(255,255,255,0.05)] border-white/10 text-white font-normal" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{tag}</span>
                        ))}
                    </div>

                    <div className="p-3 rounded bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] text-sm mb-4 animate-fade-in">
                        <div className="flex items-start gap-2">
                            <Star size={16} className="text-accent-primary mt-0.5" />
                            <span className="text-white/80"><strong className="text-white">AI Analysis:</strong> {analysis}</span>
                        </div>
                    </div>
                </>
            ) : (
                <div className="mb-4">
                    <button 
                        className="btn btn-secondary w-full flex items-center justify-center gap-2 py-2 hover:bg-white/10 transition-all border-dashed" 
                        onClick={handleRunMatch}
                        disabled={loading}
                    >
                        <Sparkles size={16} className={`text-accent-secondary ${loading ? 'animate-spin' : ''}`} />
                        <span>{loading ? 'Analyzing Profile...' : 'Compute AI Match Score'}</span>
                    </button>
                </div>
            )}

            <div>
                <p className={`text-sm text-secondary mb-2 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
                    {job.description || 'No description available.'}
                </p>
                {job.description && job.description.length > 200 && (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-accent-secondary text-xs font-semibold hover:underline bg-none border-none p-0 focus:outline-none mb-4"
                    >
                        {isExpanded ? 'Show less' : 'View more'}
                    </button>
                )}
            </div>

            <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-white/10">
                <button 
                    className={`btn ${isSaved ? 'btn-primary bg-success/20 text-success border-success/30' : 'btn-secondary'}`} 
                    onClick={handleSaveForLater}
                    disabled={isSaved}
                >
                    {isSaved ? 'Saved' : 'Save for Later'}
                </button>
                <a href={job.apply_link} target="_blank" rel="noreferrer" className="btn btn-primary flex items-center gap-1">
                    <ExternalLink size={16} />
                    <span>Apply Now</span>
                </a>
            </div>
        </div>
    );
}
