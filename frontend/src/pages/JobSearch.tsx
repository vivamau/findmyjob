import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
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

  // Batch AI match state: keyed by job_id
  const [batchScores, setBatchScores] = useState<Record<string, { match_score: number, matching_tags: string[], summary_analysis: string }>>({});
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const autoRunRef = useRef<string>(''); // tracks last "cvId|jobCount" so we don't re-run duplicates

  // Sort state
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'title'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const topRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
      setCurrentPage(1);
  }, [query, selectedCvId]);

  // Clear batch scores and reset auto-run ref when CV changes
  useEffect(() => {
      setBatchScores({});
      autoRunRef.current = ''; // allow auto-run to fire for the new CV
  }, [selectedCvId]);

  useEffect(() => {
      const fetchJobs = async () => {
          if (!selectedCvId) return;
          try {
              const res = await api.get('/jobs', { params: { resume_id: selectedCvId } });
              setJobs(res.data);
          } catch (err) { console.error(err); }
      };
      fetchJobs();
  }, [selectedCvId]);

  useEffect(() => {
      let retryCount = 0;
      const fetchResumes = async () => {
          try {
              const res = await api.get('/cv');
              if (Array.isArray(res.data)) {
                  setResumes(res.data);
                  if (res.data.length > 0 && !selectedCvId) setSelectedCvId(res.data[0].id.toString());
              }
          } catch (err) {
              console.error('Fetch resumes failed, retrying...', err);
              if (retryCount < 3) {
                  retryCount++;
                  setTimeout(fetchResumes, 2000); // Wait 2s before retry
              }
          }
      };
      fetchResumes();
  }, [selectedCvId]);

  // Auto-run batch match for ALL jobs whenever the job list or selected CV changes
  useEffect(() => {
      if (!selectedCvId || jobs.length === 0) return;
      const key = `${selectedCvId}|${jobs.length}`;
      if (autoRunRef.current === key) return; // already fired for this combination
      autoRunRef.current = key;

      const runAutoMatch = async () => {
          setIsBatchRunning(true);
          setBatchScores({});
          try {
              const job_ids = jobs.map((j: any) => j.id);
              const res = await api.post('/ai/match-batch', {
                  resume_id: parseInt(selectedCvId),
                  job_ids
              });
              if (res.data.results) setBatchScores(res.data.results);
          } catch (err) {
              console.error('Auto batch match error:', err);
          } finally {
              setIsBatchRunning(false);
          }
      };
      runAutoMatch();
  }, [jobs, selectedCvId]);

  const handleSearchSubmit = async () => {
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
            return match ? { ...match, semantic_distance: sr.distance } : null;
        }).filter(Boolean)
      : jobs.filter(j =>
            (j.role_title || '').toLowerCase().includes(query.toLowerCase()) ||
            (j.company_name || '').toLowerCase().includes(query.toLowerCase())
        );

  const sortedJobs = [...filteredJobs].sort((a: any, b: any) => {
      let valA: any = '';
      let valB: any = '';

      if (sortBy === 'score') {
          valA = batchScores[String(a.id)]?.match_score ?? 0;
          valB = batchScores[String(b.id)]?.match_score ?? 0;
      } else if (sortBy === 'date') {
          valA = new Date(a.created_at || a.updated_at || 0).getTime();
          valB = new Date(b.created_at || b.updated_at || 0).getTime();
      } else if (sortBy === 'title') {
          valA = (a.role_title || '').toLowerCase();
          valB = (b.role_title || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
  });

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentJobs = sortedJobs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedJobs.length / ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
      setCurrentPage(newPage);
      setTimeout(() => {
          topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
  };

  const handleRunBatchMatch = async () => {
      if (!selectedCvId || currentJobs.length === 0) return;
      setIsBatchRunning(true);
      try {
          const job_ids = currentJobs.map((j: any) => j.id);
          const res = await api.post('/ai/match-batch', {
              resume_id: parseInt(selectedCvId),
              job_ids
          });
          if (res.data.results) {
              setBatchScores(prev => ({ ...prev, ...res.data.results }));
          }
      } catch (err) {
          console.error("Batch match error", err);
      } finally {
          setIsBatchRunning(false);
      }
  };

  return (
    <div className="animate-fade-in">
      <SearchHeader 
          query={query} 
          onQueryChange={(val) => {
              setQuery(val);
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
          {selectedCvId && currentJobs.length > 0 && (
              <button
                  onClick={handleRunBatchMatch}
                  disabled={isBatchRunning}
                  className="btn btn-secondary flex items-center gap-2 text-sm"
                  title={`Run AI match for all ${currentJobs.length} jobs on this page`}
              >
                  <Sparkles size={14} className={isBatchRunning ? 'animate-spin text-accent-secondary' : 'text-accent-secondary'} />
                  {isBatchRunning
                      ? `Analyzing ${currentJobs.length} jobs...`
                      : `AI Match All (${currentJobs.length})`}
              </button>
          )}
        </div>
      </div>

      <div className="flex justify-end items-center gap-3 mb-4 mt-2">
        <span className="text-xs font-medium text-secondary">Sort by:</span>
        <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-black/40 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg text-sm transition-all focus:outline-none backdrop-blur-md text-primary cursor-pointer"
        >
            <option value="score">CV Match Score</option>
            <option value="date">Publish Date</option>
            <option value="title">Job Title</option>
        </select>
        <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-black/40 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg text-sm transition-all focus:outline-none backdrop-blur-md text-primary cursor-pointer"
        >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
        </select>
      </div>

      <div ref={topRef} className="pt-2" />

      <div className="flex flex-col gap-6">
        {isSearching ? (
             <p className="text-center text-primary animate-pulse">Computing AI Vectors and searching LanceDB...</p>
        ) : currentJobs.length > 0 ? (
            currentJobs.map((job: any) => {
                const batchResult = batchScores[String(job.id)];
                return (
                    <div key={job.id}>
                        {job.semantic_distance !== undefined && (
                            <div className="text-xs text-secondary font-medium mb-1 pl-1">
                                Semantic Distance: {job.semantic_distance.toFixed(3)}
                            </div>
                        )}
                        <JobCard
                            job={job}
                            selectedCvId={selectedCvId}
                            externalScore={batchResult?.match_score ?? undefined}
                            externalTags={batchResult?.matching_tags}
                            externalAnalysis={batchResult?.summary_analysis}
                        />
                    </div>
                );
            })
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

