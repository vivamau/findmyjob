import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import JobCard from './components/JobCard';
import CustomDropdown from './components/CustomDropdown';
import Pagination from './components/Pagination';
import SearchHeader from './components/SearchHeader';

export default function JobSearch() {
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSemantic, setIsSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState<{job_id: number | string, distance: number}[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
      setCurrentPage(1);
  }, [query, selectedCvId]);

  useEffect(() => {
      const fetchJobs = async () => {
          try {
              const res = await api.get('/jobs', { params: selectedCvId ? { resume_id: selectedCvId } : {} });
              setJobs(res.data);
          } catch (err) { console.error(err); }
      };
      fetchJobs();
  }, [selectedCvId]);

  useEffect(() => {
      const fetchResumes = async () => {
          try {
              const res = await api.get('/cv');
              setResumes(res.data);
              if (res.data.length > 0 && !selectedCvId) setSelectedCvId(res.data[0].id.toString());
          } catch (err) { console.error(err); }
      };
      fetchResumes();
  }, []);

  const handleSearchSubmit = async () => {
      // If not semantic or empty, we just clear and rely on standard local filtering
      if (!isSemantic || !query.trim()) {
          setSemanticResults(null);
          setCurrentPage(1);
          return;
      }

      setIsSearching(true);
      try {
          const res = await api.post('/search/semantic', { query, limit: 50 });
          setSemanticResults(res.data.results || []);
          setCurrentPage(1);
      } catch (err) {
          console.error("Semantic Search Error", err);
          setSemanticResults([]);
      } finally {
          setIsSearching(false);
      }
  };

  const filteredJobs = isSemantic && semanticResults !== null
      ? semanticResults.map(sr => {
            const match = jobs.find(j => j.id.toString() === sr.job_id.toString());
            // Store distance internally for UI
            return match ? { ...match, semantic_distance: sr.distance } : null;
        }).filter(Boolean)
      : jobs.filter(j => 
            (j.role_title || '').toLowerCase().includes(query.toLowerCase()) ||
            (j.company_name || '').toLowerCase().includes(query.toLowerCase())
        );

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentJobs = filteredJobs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
      setCurrentPage(newPage);
      setTimeout(() => {
          topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
  };

  return (
    <div className="animate-fade-in">
      <SearchHeader 
          query={query} 
          onQueryChange={(val) => {
              setQuery(val);
              // auto-clear semantic results if user starts typing something vastly different without pressing search
              if (isSemantic && semanticResults !== null) setSemanticResults(null);
          }} 
          onSearchSubmit={handleSearchSubmit}
          isSemantic={isSemantic}
          setSemantic={(val) => {
              setIsSemantic(val);
              if (!val) setSemanticResults(null);
          }}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-heading">Recommended Matches</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-secondary">Match against:</span>
          <CustomDropdown 
            items={resumes} 
            selectedId={selectedCvId} 
            onSelect={setSelectedCvId} 
            isOpen={isDropdownOpen} 
            setIsOpen={setIsDropdownOpen} 
          />
        </div>
      </div>

      <div ref={topRef} className="pt-2" />

      <div className="flex flex-col gap-6">
        {isSearching ? (
             <p className="text-center text-primary animate-pulse">Computing AI Vectors and searching LanceDB...</p>
        ) : currentJobs.length > 0 ? (
            currentJobs.map((job: any) => (
                <div key={job.id}>
                    {job.semantic_distance !== undefined && (
                        <div className="text-xs text-secondary font-medium mb-1 pl-1">
                            Semantic Math Distance: {job.semantic_distance.toFixed(3)}
                        </div>
                    )}
                    <JobCard job={job} selectedCvId={selectedCvId} />
                </div>
            ))
        ) : (
            <p className="text-center text-muted">No jobs found loaded into database. Try running Scrapers to populate.</p>
        )}
      </div>

      {filteredJobs.length > ITEMS_PER_PAGE && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            indexOfFirstItem={indexOfFirstItem}
            indexOfLastItem={indexOfLastItem}
            totalItems={filteredJobs.length}
            onPageChange={handlePageChange}
          />
      )}
    </div>
  );
}
