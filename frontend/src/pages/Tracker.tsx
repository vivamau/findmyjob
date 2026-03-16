import { MoreHorizontal, Plus, Filter, MessageSquare, ExternalLink } from 'lucide-react';

export default function Tracker() {
  const applications = [
    { id: 1, role: 'Senior React Developer', company: 'Stripe', status: 'In Review', date: '2023-11-01', cv: 'Tech CV v2', link: '#' },
    { id: 2, role: 'Frontend Engineer', company: 'Vercel', status: 'Interview', date: '2023-10-25', cv: 'Tech CV v2', link: '#' },
    { id: 3, role: 'Software Engineer', company: 'Netflix', status: 'Applied', date: '2023-10-18', cv: 'Management CV', link: '#' },
    { id: 4, role: 'Full Stack Developer', company: 'Airbnb', status: 'Rejected', date: '2023-10-10', cv: 'Tech CV v2', link: '#' },
    { id: 5, role: 'UI Engineer', company: 'Apple', status: 'Offer', date: '2023-09-30', cv: 'Tech CV v2', link: '#' },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Offer': return 'bg-success/20 text-success border-success/30';
      case 'Interview': return 'bg-accent-tertiary/20 text-accent-tertiary border-accent-tertiary/30';
      case 'In Review': return 'bg-warning/20 text-warning border-warning/30';
      case 'Applied': return 'bg-white/10 text-white border-white/20';
      case 'Rejected': return 'bg-error/20 text-error border-error/30';
      default: return 'bg-white/10 text-white';
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header flex justify-between items-end mb-8">
        <div>
          <h1 className="page-title text-gradient">Application Tracker</h1>
          <p className="page-subtitle">Manage your job search progress, CV versions used, and interview stages.</p>
        </div>
        <div className="flex gap-4">
          <button className="btn btn-secondary flex items-center gap-2">
            <Filter size={18} /> Filters
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Manually
          </button>
        </div>
      </header>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto w-full border-b border-white/5 pb-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4 font-semibold text-sm text-secondary">Company</th>
                <th className="p-4 font-semibold text-sm text-secondary">Role</th>
                <th className="p-4 font-semibold text-sm text-secondary">Status</th>
                <th className="p-4 font-semibold text-sm text-secondary">Date Applied</th>
                <th className="p-4 font-semibold text-sm text-secondary">CV Version</th>
                <th className="p-4 font-semibold text-sm text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className={`border-b border-white/5 transition-colors hover:bg-white/5`}>
                  <td className="p-4 font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-accent-primary">
                      {app.company.charAt(0)}
                    </div>
                    {app.company}
                  </td>
                  <td className="p-4">{app.role}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(app.status)}`} style={{
                      backgroundColor: app.status === 'Offer' ? 'rgba(16,185,129,0.1)' : 
                                      app.status === 'Interview' ? 'rgba(59,130,246,0.1)' :
                                      app.status === 'In Review' ? 'rgba(245,158,11,0.1)' :
                                      app.status === 'Applied' ? 'rgba(255,255,255,0.05)' :
                                      'rgba(239,68,68,0.1)',
                      color: app.status === 'Offer' ? 'var(--success)' : 
                             app.status === 'Interview' ? 'var(--accent-tertiary)' :
                             app.status === 'In Review' ? 'var(--warning)' :
                             app.status === 'Applied' ? 'white' :
                             'var(--error)',
                      borderColor: app.status === 'Offer' ? 'rgba(16,185,129,0.2)' : 
                                   app.status === 'Interview' ? 'rgba(59,130,246,0.2)' :
                                   app.status === 'In Review' ? 'rgba(245,158,11,0.2)' :
                                   app.status === 'Applied' ? 'rgba(255,255,255,0.1)' :
                                   'rgba(239,68,68,0.2)',
                    }}>
                      {app.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-secondary">{new Date(app.date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm text-secondary">{app.cv}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3 text-secondary">
                      <button className="hover:text-accent-tertiary transition-colors" title="View Job Post">
                        <ExternalLink size={18} />
                      </button>
                      <button className="hover:text-success transition-colors" title="Contact Email / Notes">
                        <MessageSquare size={18} />
                      </button>
                      <button className="hover:text-white transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 text-center text-sm text-secondary bg-white/5">
          Showing {applications.length} applications
        </div>
      </div>
    </div>
  );
}
