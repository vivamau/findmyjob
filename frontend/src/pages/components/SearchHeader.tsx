import { Search, Filter } from 'lucide-react';

interface SearchHeaderProps {
    query: string;
    onQueryChange: (query: string) => void;
}

export default function SearchHeader({ query, onQueryChange }: SearchHeaderProps) {
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
                    />
                </div>
                <button className="btn btn-primary">Search Jobs</button>
                <button className="btn btn-secondary flex items-center gap-1">
                    <Filter size={18} />
                    <span>Filters</span>
                </button>
            </div>
        </header>
    );
}
