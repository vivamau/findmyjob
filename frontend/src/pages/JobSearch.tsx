import { useState } from 'react';
import { Search, Filter, Briefcase, MapPin, DollarSign, Star } from 'lucide-react';

export default function JobSearch() {
  const [query, setQuery] = useState('');

  return (
    <div className="animate-fade-in">
      <header className="page-header flex-col items-start gap-4">
        <div>
          <h1 className="page-title text-gradient">Smart Job Search</h1>
          <p className="page-subtitle">Find roles tailored to your CV profile.</p>
        </div>
        
        <div className="w-full max-w-2xl flex gap-4 mt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              className="input-field w-full pl-10" 
              placeholder="Job title, keywords, or company..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary">Search Jobs</button>
          <button className="btn btn-secondary">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </header>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-heading">Recommended Matches</h2>
        <div className="flex gap-4">
          <span className="text-sm font-medium text-secondary">Match against:</span>
          <select className="input-field py-1 px-4 text-sm" style={{ width: 'auto' }}>
            <option>Tech CV v2 (Default)</option>
            <option>Management CV</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {[
          { 
            title: 'Frontend Engineer', 
            company: 'Vercel', 
            location: 'Remote, US', 
            salary: '$140k - $180k',
            match: 95,
            tags: ['React', 'TypeScript', 'Next.js'],
            highlight: 'Your React and TypeScript skills strongly match the core requirements.'
          },
          { 
            title: 'Senior UX/UI Developer', 
            company: 'Figma', 
            location: 'San Francisco, CA', 
            salary: '$160k - $210k',
            match: 88,
            tags: ['React', 'CSS', 'Figma API'],
            highlight: 'Your CSS knowledge is a great fit, but Figma API experience is missing.'
          },
          { 
            title: 'Software Engineer II (React)', 
            company: 'Uber', 
            location: 'Remote', 
            salary: '$130k - $160k',
            match: 82,
            tags: ['JavaScript', 'React', 'Redux'],
            highlight: 'Good general fit.'
          }
        ].map((job, idx) => (
          <div key={idx} className="glass-panel p-6 hover:border-border-focus transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[rgba(255,255,255,0.05)] flex items-center justify-center border border-white/10">
                  <Briefcase size={24} className="text-accent-tertiary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">{job.title}</h3>
                  <div className="flex gap-4 text-sm text-secondary">
                    <span className="flex items-center gap-1"><Briefcase size={14}/> {job.company}</span>
                    <span className="flex items-center gap-1"><MapPin size={14}/> {job.location}</span>
                    <span className="flex items-center gap-1 text-success"><DollarSign size={14}/> {job.salary}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="relative w-14 h-14 flex items-center justify-center rounded-full border-4" style={{ borderColor: `rgba(16,185,129, ${job.match / 100})` }}>
                  <span className="font-bold font-heading">{job.match}%</span>
                </div>
                <span className="text-xs text-secondary mt-1">CV Match</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {job.tags.map((tag, t) => (
                <span key={t} className="badge bg-[rgba(255,255,255,0.05)] border-white/10 text-white font-normal" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{tag}</span>
              ))}
            </div>

            <div className="p-3 rounded bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] text-sm mb-4">
              <div className="flex items-start gap-2">
                <Star size={16} className="text-accent-primary mt-0.5" />
                <span className="text-white/80"><strong className="text-white">AI Analysis:</strong> {job.highlight}</span>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-white/10">
              <button className="btn btn-secondary">Save for Later</button>
              <button className="btn btn-primary">Apply with Tech CV v2</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
