import { useState, useEffect } from 'react';
import { Activity, Target, CheckCircle, Clock } from 'lucide-react';
import api from '../utils/api';

export default function Dashboard() {
  const [backendStatus, setBackendStatus] = useState<'Checking...' | 'Connected' | 'Error'>('Checking...');
  const [cvs, setCvs] = useState<any[]>([]);
  const [isLoadingCvs, setIsLoadingCvs] = useState(false);

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
      .then(res => setCvs(res.data))
      .catch(() => {})
      .finally(() => setIsLoadingCvs(false));
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
        <button className="btn btn-primary">
          <Target size={18} />
          <span>New Application</span>
        </button>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-secondary text-sm font-medium">Total Applications</p>
            <h3 className="text-3xl mt-2">24</h3>
          </div>
          <div className="p-3 bg-[rgba(124,58,237,0.1)] rounded-full text-accent-primary" style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--accent-primary)' }}>
            <Activity size={24} />
          </div>
        </div>

        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-secondary text-sm font-medium">Interviews Scheduled</p>
            <h3 className="text-3xl mt-2">3</h3>
          </div>
          <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-secondary text-sm font-medium">Pending Responses</p>
            <h3 className="text-3xl mt-2">18</h3>
          </div>
          <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
        </div>

        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-secondary text-sm font-medium">Auto-Matches Found</p>
            <h3 className="text-3xl mt-2">142</h3>
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
            {[
              { role: 'Senior Frontend Engineer', company: 'Google', status: 'In Review', date: '2 days ago', badge: 'badge-warning' },
              { role: 'React Developer', company: 'Stripe', status: 'Interview', date: '4 days ago', badge: 'badge-success' },
              { role: 'Fullstack Engineer', company: 'Netflix', status: 'Applied', date: '1 week ago', badge: 'badge' },
            ].map((app, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-md" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h4 className="font-semibold">{app.role}</h4>
                  <p className="text-sm text-secondary">{app.company} • Applied using "Tech CV v2"</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`badge ${app.badge}`}>{app.status}</span>
                  <span className="text-sm text-muted">{app.date}</span>
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
