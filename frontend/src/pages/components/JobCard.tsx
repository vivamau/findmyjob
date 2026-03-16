import { useState } from 'react';
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
}

export default function JobCard({ job, selectedCvId }: JobCardProps) {
    const [loading, setLoading] = useState(false);
    const [score, setScore] = useState<number | null>(job.match_score !== undefined ? job.match_score : null);
    const [tags, setTags] = useState<string[]>(() => {
        try { return JSON.parse(job.matching_tags || '[]'); } catch { return []; }
    });
    const [analysis, setAnalysis] = useState<string | null>(job.summary_analysis || null);

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

    return (
        <div className="glass-panel p-6 hover:border-border-focus transition-all duration-300 animate-fade-in mb-4">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[rgba(255,255,255,0.05)] flex items-center justify-center border border-white/10">
                        <Briefcase size={24} className="text-accent-tertiary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-1">{job.role_title}</h3>
                        <div className="flex gap-4 text-sm text-secondary">
                            <span className="flex items-center gap-1"><Briefcase size={14}/> {job.company_name}</span>
                            <span className="flex items-center gap-1"><MapPin size={14}/> {job.location || 'Remote'}</span>
                            <span className="flex items-center gap-1 text-success"><DollarSign size={14}/> {job.salary_range || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    <div className="relative w-14 h-14 flex items-center justify-center rounded-full border-4" style={{ borderColor: score !== null ? `rgba(16,185,129, ${score / 100})` : 'rgba(255,255,255,0.1)' }}>
                        <span className="font-bold font-heading">{score !== null ? `${score}%` : 'N/A'}</span>
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

            <p className="text-sm text-secondary line-clamp-2 mb-4">
                {job.description}
            </p>

            <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-white/10">
                <button className="btn btn-secondary">Save for Later</button>
                <a href={job.apply_link} target="_blank" rel="noreferrer" className="btn btn-primary flex items-center gap-1">
                    <ExternalLink size={16} />
                    <span>Apply Now</span>
                </a>
            </div>
        </div>
    );
}
