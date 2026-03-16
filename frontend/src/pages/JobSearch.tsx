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

  const filteredJobs = jobs.filter(j => 
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
      <SearchHeader query={query} onQueryChange={setQuery} />

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
        {currentJobs.length > 0 ? (
            currentJobs.map((job: any) => (
                <JobCard key={job.id} job={job} selectedCvId={selectedCvId} />
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
