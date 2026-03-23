import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MoreHorizontal, Plus, Filter, MessageSquare, ExternalLink, Trash2 } from 'lucide-react';
import api from '../utils/api';

export default function Tracker() {
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    const fetchApplications = async () => {
       try {
           const res = await api.get('/applications');
           setApplications(res.data.map((app: any) => ({
                id: app.id,
                role: app.role_title,
                company: app.company_name,
                status: app.status || 'Applied',
                date: app.applied_at || new Date(),
                cv: app.cv_title || 'N/A',
                link: '#'
           })));
       } catch (err) {
           console.error("Fetch applications error", err);
       }
    };
    fetchApplications();
  }, []);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Offer': return 'bg-success/20 text-success border-success/30';
      case 'Interview': return 'bg-accent-tertiary/20 text-accent-tertiary border-accent-tertiary/30';
      case 'In Review': return 'bg-warning/20 text-warning border-warning/30';
      case 'Applied': return 'bg-white/10 text-white border-white/20';
      case 'Saved': return 'bg-accent-secondary/20 text-accent-secondary border-accent-secondary/30';
      case 'Rejected': return 'bg-error/20 text-error border-error/30';
      default: return 'bg-white/10 text-white';
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [appToDelete, setAppToDelete] = useState<number | null>(null);
  const [newApp, setNewApp] = useState({ company: '', role: '', status: 'Applied', notes: '' });

  const location = useLocation();

  useEffect(() => {
     if (location.state?.openAddModal) {
         setShowAddModal(true);
     }
  }, [location.state]);

  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const res = await api.post('/applications', {
             company_name: newApp.company,
             role_title: newApp.role,
             status: newApp.status,
             notes: newApp.notes
        });
        setApplications(prev => [{
             id: res.data.id,
             company: newApp.company,
             role: newApp.role,
             status: newApp.status,
             date: new Date().toISOString(),
             cv: 'N/A',
             link: '#'
        }, ...prev]);
        setShowAddModal(false);
        setNewApp({ company: '', role: '', status: 'Applied', notes: '' });
    } catch (err) {
        alert("Failed to create application flawlessly Loaded");
    }
  };

  const handleDelete = (id: number) => {
      setAppToDelete(id);
      setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!appToDelete) return;
    try {
        await api.delete(`/applications/${appToDelete}`);
        setApplications(prev => prev.filter(app => app.id !== appToDelete));
    } catch (err) {
        console.error("Delete application error", err);
    } finally {
        setShowDeleteModal(false);
        setAppToDelete(null);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
        await api.put(`/applications/${id}`, { status: newStatus });
        setApplications(prev => prev.map(app => app.id === id ? { ...app, status: newStatus, date: new Date().toISOString() } : app));
    } catch (err) {
        console.error("Update status error", err);
    }
  };

  return (
    <>
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
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
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
                    <select 
                      value={app.status || 'Applied'} 
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border clickable-select bg-transparent cursor-pointer focus:outline-none ${getStatusColor(app.status)}`}
                      style={{
                        backgroundColor: app.status === 'Offer' ? 'rgba(16,185,129,0.1)' : 
                                        app.status === 'Interview' ? 'rgba(59,130,246,0.1)' :
                                        app.status === 'In Review' ? 'rgba(245,158,11,0.1)' :
                                        app.status === 'Applied' ? 'rgba(255,255,255,0.05)' :
                                        'rgba(139,92,246,0.1)', // Absolute violet for Saved setup Loaded flaws
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
                      }}
                    >
                      <option value="Saved">Saved</option>
                      <option value="Applied">Applied</option>
                      <option value="In Review">In Review</option>
                      <option value="Interview">Interview</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                    </select>
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
                      <button className="hover:text-error transition-colors" title="Delete Application" onClick={() => handleDelete(app.id)}>
                        <Trash2 size={18} />
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

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowDeleteModal(false)} />
          <div className="glass-panel p-6 rounded-xl max-w-sm w-full relative z-10 animate-scale-in">
             <h3 className="text-xl font-semibold mb-2 text-white font-heading">Confirm Deletion</h3>
             <p className="text-secondary text-sm mb-6">Are you sure you want to remove this application from your tracker? This action cannot be undone.</p>
             <div className="flex justify-end gap-3">
                <button className="btn btn-secondary px-4 py-2" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn btn-primary bg-error border-error px-4 py-2 hover:bg-error/80" onClick={confirmDelete}>Delete</button>
             </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <div className="glass-panel p-6 rounded-xl max-w-md w-full relative z-10 animate-scale-in">
             <h3 className="text-xl font-semibold mb-4 text-white font-heading">Add Application Manually</h3>
             <form onSubmit={handleAddApplication}>
                <div className="mb-4">
                   <label className="block text-sm text-secondary mb-1">Company Name</label>
                   <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-accent-primary" value={newApp.company} onChange={e => setNewApp({...newApp, company: e.target.value})} />
                </div>
                <div className="mb-4">
                   <label className="block text-sm text-secondary mb-1">Role/Title</label>
                   <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-accent-primary" value={newApp.role} onChange={e => setNewApp({...newApp, role: e.target.value})} />
                </div>
                <div className="mb-4">
                   <label className="block text-sm text-secondary mb-1">Status</label>
                   <select className="w-full bg-white/5 border border-white/10 rounded-lg p-2 style-select text-white focus:outline-none focus:border-accent-primary bg-black/40" value={newApp.status} onChange={e => setNewApp({...newApp, status: e.target.value})} >
                       <option className="bg-slate-900" value="Saved">Saved</option>
                       <option className="bg-slate-900" value="Applied">Applied</option>
                       <option className="bg-slate-900" value="In Review">In Review</option>
                       <option className="bg-slate-900" value="Interview">Interview</option>
                       <option className="bg-slate-900" value="Offer">Offer</option>
                       <option className="bg-slate-900" value="Rejected">Rejected</option>
                   </select>
                </div>
                <div className="mb-6">
                   <label className="block text-sm text-secondary mb-1">Notes</label>
                   <textarea className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-accent-primary" value={newApp.notes || ''} onChange={e => setNewApp({...newApp, notes: e.target.value})} />
                </div>
                <div className="flex justify-end gap-3">
                   <button type="button" className="btn btn-secondary px-4 py-2" onClick={() => setShowAddModal(false)}>Cancel</button>
                   <button type="submit" className="btn btn-primary px-4 py-2">Save</button>
                </div>
             </form>
          </div>
        </div>
      )}

    </>
  );
}
