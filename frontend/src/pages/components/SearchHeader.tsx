import { Search } from 'lucide-react';

interface SearchHeaderProps {
    query: string;
    onQueryChange: (query: string) => void;
    onSearchSubmit: () => void;
    isSemantic: boolean;
    setSemantic: (val: boolean) => void;
}

export default function SearchHeader({ query, onQueryChange, onSearchSubmit, isSemantic, setSemantic }: SearchHeaderProps) {
    return (
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
                        onChange={(e) => onQueryChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                    />
                </div>
                <button className="btn btn-primary" onClick={onSearchSubmit}>Search Jobs</button>
                <div className="flex items-center gap-2 ml-4 mr-2">
                    <label className="text-sm font-medium text-secondary whitespace-nowrap cursor-pointer flex items-center gap-2">
                        <input type="checkbox" className="accent-primary w-4 h-4" checked={isSemantic} onChange={(e) => setSemantic(e.target.checked)} />
                        AI Semantic Match
                    </label>
                </div>
            </div>
        </header>
    );
}
