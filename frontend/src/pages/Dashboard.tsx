import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Target, CheckCircle, Clock } from 'lucide-react';
import api from '../utils/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState<'Checking...' | 'Connected' | 'Error'>('Checking...');
  const [cvs, setCvs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoadingCvs, setIsLoadingCvs] = useState(false);
  const [autoMatchCount, setAutoMatchCount] = useState<number>(0);

  const formatDate = (dateString: string, includeTime = false) => {
      if (!dateString) return 'Never';
      try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return dateString;
          const day = String(date.getDate()).padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          let base = `${day} ${month} ${year}`;
          if (includeTime) {
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              base += ` ${hours}:${minutes}`;
          }
          return base;
      } catch { return dateString; }
  };

  useEffect(() => {
    setIsLoadingCvs(true);
    api.get('/health')
      .then((res) => {
        if (res.data && res.data.status === 'ok') {
            setBackendStatus('Connected');
        } else {
            setBackendStatus('Error');
        }
      })
      .catch(() => setBackendStatus('Error'));

    api.get('/cv')
      .then(res => {
          setCvs(res.data);
          const primaryCv = res.data.find((c: any) => c.is_primary === 1) || res.data[0];
          if (primaryCv) {
              api.get(`/jobs?resume_id=${primaryCv.id}`)
                 .then(jobsRes => {
                     if (jobsRes.data && Array.isArray(jobsRes.data)) {
                         const count = jobsRes.data.filter((j: any) => (j.match_score || 0) >= 60).length;
                         setAutoMatchCount(count);
                     }
                 })
                 .catch(() => {});
          }
      })
      .catch(() => {})
      .finally(() => setIsLoadingCvs(false));

    api.get('/applications')
      .then(res => setApplications(res.data))
      .catch(() => {});
  }, []);
  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title text-gradient">Dashboard</h1>
          <p className="page-subtitle">Welcome back. Here is your application activity overview.</p>
          <div className="mt-2 text-xs flex items-center gap-1">
             <span className={`w-2 h-2 rounded-full ${backendStatus === 'Connected' ? 'bg-success' : backendStatus === 'Error' ? 'bg-error' : 'bg-warning'}`} />
             <span className="text-secondary">Backend: {backendStatus}</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/applications', { state: { openAddModal: true } })}>
          <Target size={18} />
          <span>New Application</span>
        </button>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-secondary text-sm font-medium">Total Applications</p>
            <h3 className="text-3xl mt-2">{applications.length}</h3>
          </div>
          <div className="p-3 bg-[rgba(124,58,237,0.1)] rounded-full text-accent-primary" style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--accent-primary)' }}>
            <Activity size={24} />
          </div>
        </div>

        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-secondary text-sm font-medium">Interviews Scheduled</p>
            <h3 className="text-3xl mt-2">{applications.filter(a => a.status === 'Interview').length}</h3>
          </div>
          <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-secondary text-sm font-medium">Pending Responses</p>
            <h3 className="text-3xl mt-2">{applications.filter(a => a.status === 'Applied' || a.status === 'In Review').length}</h3>
          </div>
          <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
        </div>

        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-secondary text-sm font-medium">Auto-Matches Found</p>
            <h3 className="text-3xl mt-2">{autoMatchCount}</h3>
          </div>
          <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--accent-tertiary)' }}>
            <Target size={24} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-panel lg:col-span-2 p-6">
          <h3 className="text-xl mb-4 font-heading">Recent Application Activity</h3>
          <div className="flex flex-col gap-4">
            {applications.slice(0, 5).map((app: any, i: number) => (
              <div key={app.id || i} className="flex items-center justify-between p-4 rounded-md" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h4 className="font-semibold">{app.role_title}</h4>
                  <p className="text-sm text-secondary">{app.company_name} • Applied using CV</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium border" style={{
                      backgroundColor: app.status === 'Offer' ? 'rgba(16,185,129,0.1)' : 
                                      app.status === 'Interview' ? 'rgba(59,130,246,0.1)' :
                                      app.status === 'In Review' ? 'rgba(245,158,11,0.1)' :
                                      app.status === 'Applied' ? 'rgba(255,255,255,0.05)' :
                                      'rgba(139,92,246,0.1)',
                      color: app.status === 'Offer' ? 'var(--success)' : 
                             app.status === 'Interview' ? 'var(--accent-tertiary)' :
                             app.status === 'In Review' ? 'var(--warning)' :
                             app.status === 'Applied' ? 'white' :
                             'var(--accent-secondary)',
                      borderColor: app.status === 'Offer' ? 'rgba(16,185,129,0.2)' : 
                                   app.status === 'Interview' ? 'rgba(59,130,246,0.2)' :
                                   app.status === 'In Review' ? 'rgba(245,158,11,0.2)' :
                                   app.status === 'Applied' ? 'rgba(255,255,255,0.1)' :
                                   'rgba(139,92,246,0.2)',
                  }}>{app.status}</span>
                  <span className="text-sm text-muted">{formatDate(app.updated_at || app.applied_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-xl mb-4 font-heading">Active Resumes</h3>
          <div className="flex flex-col gap-4">
            {isLoadingCvs ? (
              <p className="text-sm text-secondary">Loading resumes...</p>
            ) : cvs.length === 0 ? (
              <p className="text-sm text-muted">No uploaded resumes found.</p>
            ) : (
              cvs.map((cv: any, i: any) => (
                <div key={cv.id || i} className="glass-card p-4">
                  <h4 className="font-semibold mb-1">{cv.title} {cv.is_primary === 1 && <span className="badge badge-success ml-2 text-xs">Primary</span>}</h4>
                  <p className="text-xs text-secondary">Uploaded: {formatDate(cv.created_at)}</p>
                  <div className="mt-3 flex justify-between items-center text-xs">
                    <span className="text-muted">Last Parse: {cv.last_parse_at ? formatDate(cv.last_parse_at, true) : 'Never'}</span>
                    {cv.parse_model && <span className="text-accent-tertiary">({cv.parse_model})</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
