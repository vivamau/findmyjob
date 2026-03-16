import { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import CustomDropdown from './components/CustomDropdown';
import { UploadCloud, FileText, Edit3, Trash2, Plus, ArrowRight, Loader2, GraduationCap, Globe, Cpu } from 'lucide-react';

const formatDate = (dateString: string, includeTime = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate().toString().padStart(2, '0');
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
};

export default function CVManager() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'upload'
  const [cvs, setCvs] = useState<any[]>([]);
  const [isLoadingCvs, setIsLoadingCvs] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCv, setSelectedCv] = useState<any | null>(null);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [educations, setEducations] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);

  const [isLoadingExperiences, setIsLoadingExperiences] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseTime, setParseTime] = useState(0);

  const [providers, setProviders] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [cvToDelete, setCvToDelete] = useState<number | null>(null);

  // Edit Inline States
  const [editingExpId, setEditingExpId] = useState<number | null>(null);
  const [editingEduId, setEditingEduId] = useState<number | null>(null);
  const [editingLangId, setEditingLangId] = useState<number | null>(null);

  const [editingCvId, setEditingCvId] = useState<number | null>(null);
  const [editCvData, setEditCvData] = useState<any>({});
  const [showParseConfirm, setShowParseConfirm] = useState<boolean>(false);

  const [editExpData, setEditExpData] = useState<any>({});
  const [editEduData, setEditEduData] = useState<any>({});
  const [editLangData, setEditLangData] = useState<any>({});

  useEffect(() => {
    if (activeTab === 'list') {
        setIsLoadingCvs(true);
        api.get('/cv')
            .then(res => setCvs(res.data))
            .catch(err => console.error(err))
            .finally(() => setIsLoadingCvs(false));
    }
  }, [activeTab]);

  useEffect(() => {
      api.get('/ai/providers')
         .then(res => {
             setProviders(res.data);
             const active = res.data.find((p: any) => p.is_active === 1);
             if (active) setSelectedModel(`${active.provider_id}|${active.default_model}`);
             else if (res.data.length > 0) setSelectedModel(`${res.data[0].provider_id}|${res.data[0].default_model}`);
         })
         .catch(() => {});
  }, []);

  useEffect(() => {
      if (selectedCv) {
          setIsLoadingExperiences(true);
          
          const loadAll = async () => {
              try {
                  const [exp, edu, lang] = await Promise.all([
                      api.get(`/cv/${selectedCv.id}/experiences`),
                      api.get(`/cv/${selectedCv.id}/educations`),
                      api.get(`/cv/${selectedCv.id}/languages`)
                  ]);
                  setExperiences(exp.data);
                  setEducations(edu.data);
                  setLanguages(lang.data);
              } catch (err) {
                  console.error(err);
              } finally {
                  setIsLoadingExperiences(false);
              }
          };

          loadAll();
      } else {
          setExperiences([]);
          setEducations([]);
          setLanguages([]);
      }
  }, [selectedCv]);

  const handleAiParse = async (cvId: number) => {
      setIsParsing(true);
      setParseTime(0);
      const interval = setInterval(() => {
          setParseTime(prev => prev + 1);
      }, 1000);

      try {
          const [pId, modelName] = selectedModel.split('|');
          await api.post(`/cv/${cvId}/parse`, { model: modelName || selectedModel, provider_id: pId });
          
          const [exp, edu, lang] = await Promise.all([
              api.get(`/cv/${cvId}/experiences`),
              api.get(`/cv/${cvId}/educations`),
              api.get(`/cv/${cvId}/languages`)
          ]);
          setExperiences(exp.data);
          setEducations(edu.data);
          setLanguages(lang.data);
           const now = new Date().toISOString();
           setCvs(prev => prev.map(c => c.id === cvId ? { ...c, last_parse_at: now, parse_model: selectedModel } : c));
           setSelectedCv((prev: any) => prev && prev.id === cvId ? { ...prev, last_parse_at: now, parse_model: selectedModel } : prev);
      } catch (err: any) {
          alert(`AI parsing failed: ${err.response?.data?.error || err.message}`);
      } finally {
          setIsParsing(false);
          clearInterval(interval);
      }
  };

  const handleDeleteCv = (cvId: number) => {
      setCvToDelete(cvId);
  };

  const confirmDelete = async () => {
      if (!cvToDelete) return;

      try {
          await api.delete(`/cv/${cvToDelete}`);
          
          setCvs(prev => prev.filter(c => c.id !== cvToDelete));
          if (selectedCv?.id === cvToDelete) {
              setSelectedCv(null);
          }
      } catch (err: any) {
          alert(`Failed to delete CV: ${err.message}`);
      } finally {
          setCvToDelete(null);
      }
  };

  const handleSaveExperience = async (id: number) => {
      try {
          await api.put(`/cv/experiences/${id}`, editExpData);
          setExperiences(prev => prev.map(e => e.id === id ? { ...e, ...editExpData } : e));
          setEditingExpId(null);
      } catch (err: any) { alert(`Failed to save: ${err.message}`); }
  };

  const handleSaveEducation = async (id: number) => {
      try {
          await api.put(`/cv/educations/${id}`, editEduData);
          setEducations(prev => prev.map(e => e.id === id ? { ...e, ...editEduData } : e));
          setEditingEduId(null);
      } catch (err: any) { alert(`Failed to save: ${err.message}`); }
  };

  const handleSaveLanguage = async (id: number) => {
      try {
          await api.put(`/cv/languages/${id}`, editLangData);
          setLanguages(prev => prev.map(e => e.id === id ? { ...e, ...editLangData } : e));
          setEditingLangId(null);
      } catch (err: any) { alert(`Failed to save: ${err.message}`); }
  };

  const handleSaveCvMetadata = async (id: number) => {
      try {
          await api.put(`/cv/${id}`, editCvData);
          setCvs(prev => prev.map(c => {
               if (c.id === id) {
                   return { ...c, ...editCvData };
               }
               if (editCvData.is_primary === 1 && c.id !== id) {
                   return { ...c, is_primary: 0 };
               }
               return c;
          }));
          setEditingCvId(null);
      } catch (err: any) { alert(`Failed to save CV metadata: ${err.message}`); }
  };

  const handleUpload = async () => {
    if (!file || !title) {
        alert('Please fill in both title and file fields');
        return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('user_id', '1'); // Mock setup index

    try {
        await api.post('/cv/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        setFile(null);
        setTitle('');
        setActiveTab('list');
    } catch (err) {
        console.error(err);
        alert('Upload failed');
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <>
    <div className="animate-fade-in">
      <header className="page-header mb-8">
        <div>
          <h1 className="page-title text-gradient">CV Management</h1>
          <p className="page-subtitle">Organize and iterate on different versions of your CV.</p>
          {providers.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-secondary">AI Model:</span>
              <CustomDropdown 
                items={providers.map((p: any) => ({ id: `${p.provider_id}|${p.default_model}`, title: `${p.provider_id} (${p.default_model})` }))} 
                selectedId={selectedModel} 
                onSelect={setSelectedModel} 
                isOpen={isModelDropdownOpen} 
                setIsOpen={setIsModelDropdownOpen} 
                icon={<Cpu size={16} className="text-accent-secondary" />}
                placeholder="Select Model"
              />
            </div>
          )}
        </div>
        <button onClick={() => setActiveTab('upload')} className="btn btn-primary">
          <UploadCloud size={18} />
          <span>Import CV</span>
        </button>
      </header>

      {activeTab === 'list' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {isLoadingCvs ? (
            <div className="col-span-2 text-center py-12">
               <Loader2 className="animate-spin mx-auto text-accent-primary mb-2" size={32} />
               <p className="text-secondary">Loading CVs...</p>
            </div>
          ) : cvs.length === 0 ? (
            <div className="col-span-2 text-center py-12 glass-panel">
               <p className="text-secondary">No CVs uploaded yet.</p>
            </div>
          ) : (
            cvs.map((cv, i) => (
              <div key={cv.id || i} className="glass-panel p-6 flex flex-col justify-between" style={{ minHeight: '200px' }}>
                {editingCvId === cv.id ? (
                    <div className="flex flex-col gap-2 w-full">
                        <input className="input-field text-sm" value={editCvData.title || ''} onChange={e => setEditCvData({...editCvData, title: e.target.value})} placeholder="Title" />
                        <label className="flex items-center gap-2 mt-1">
                            <input type="checkbox" checked={editCvData.is_primary === 1} onChange={e => setEditCvData({...editCvData, is_primary: e.target.checked ? 1 : 0})} />
                            <span className="text-xs text-secondary">Set as Primary</span>
                        </label>
                        <div className="flex gap-2 mt-2">
                            <button className="text-accent-primary hover:text-white text-xs font-semibold" onClick={() => handleSaveCvMetadata(cv.id)}>Save</button>
                            <button className="text-secondary hover:text-white text-xs font-semibold" onClick={() => setEditingCvId(null)}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center">
                          <FileText className="text-accent-primary" size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-heading mb-1">{cv.title} {cv.is_primary === 1 && <span className="badge badge-success ml-2 text-xs">Primary</span>}</h3>
                          <p className="text-sm text-secondary">ID: {cv.id}</p>
                          <p className="text-xs text-muted mt-1">Uploaded: {formatDate(cv.created_at)}</p>
                          {cv.last_parse_at && (
                            <p className="text-xs text-accent-tertiary mt-1">Last Parse: {formatDate(cv.last_parse_at, true)} via {cv.parse_model}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-secondary hover:text-white transition-colors" onClick={() => { setEditingCvId(cv.id); setEditCvData(cv); }}>
                          <Edit3 size={18} />
                        </button>
                        <button 
                           className="p-2 text-error hover:text-red-400 transition-colors"
                           onClick={() => handleDeleteCv(cv.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                )}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-white/60">Used in Applications: </span>
                    <span className="text-accent-tertiary font-bold">0</span>
                  </div>
                  <button 
                    onClick={() => setSelectedCv(cv)}
                    className="text-accent-primary hover:text-white text-sm flex items-center gap-1 transition-colors"
                  >
                    View Data <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))
          )}

          <button onClick={() => setActiveTab('upload')} className="glass-panel p-6 flex flex-col items-center justify-center gap-4 text-center hover:bg-white/5 transition-colors" style={{ border: '1px dashed var(--border-focus)', cursor: 'pointer' }}>
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-accent-primary">
              <Plus size={32} />
            </div>
            <div>
              <h3 className="text-lg font-heading">Create New CV Version</h3>
              <p className="text-sm text-secondary">Import from PDF or build from scratch</p>
            </div>
          </button>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="glass-panel p-8 max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-[rgba(124,58,237,0.1)] flex items-center justify-center text-accent-primary mx-auto mb-6">
            <UploadCloud size={40} />
          </div>
          <h2 className="text-2xl font-heading mb-2">Import your CV</h2>
          <p className="text-secondary mb-8">Upload a PDF or DOCX file, and our AI will parse, index, and draft a structured CV you can iterate on.</p>
          
          <div className="mb-6 text-left">
            <label className="block text-sm font-medium text-secondary mb-2">CV Version Title</label>
            <input 
              type="text" 
              className="input-field w-full" 
              placeholder="CV Title (e.g. Frontend Specialist)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div 
            className="border-2 border-dashed border-white/20 rounded-xl p-8 hover:border-accent-primary transition-colors cursor-pointer bg-white/5"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              aria-label="file-input"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            
            <p className="text-lg font-medium text-white/80">
              {file ? file.name : 'Drag and drop file here'}
            </p>
            <p className="text-sm text-muted mt-2">Maximum file size 10MB</p>
            
            <div className="mt-6 flex justify-center">
              <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setActiveTab('list'); }}>Cancel</button>
              <div className="w-4"></div>
              <button className="btn btn-primary px-8" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                {file ? 'Change File' : 'Browse Files'}
              </button>
            </div>
          </div>

          {file && (
            <div className="mt-8">
              <button 
                className="btn btn-primary w-full py-3" 
                onClick={handleUpload}
                disabled={isUploading || !title}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Upload and Parse</span>
                )}
              </button>
            </div>
          )}
        </div>
       )}
     </div>

       {selectedCv && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-bg-secondary h-full p-8 border-l border-white/10 overflow-y-auto animate-fade-in flex flex-col gap-6">
            <header className="flex justify-between items-center pb-4 border-b border-white/5">
              <div>
                 <h2 className="text-2xl font-heading text-gradient">{selectedCv.title}</h2>
                 <p className="text-sm text-secondary">Uploaded: {formatDate(selectedCv.created_at)}</p>
                 {selectedCv.last_parse_at && (
                    <p className="text-xs text-accent-tertiary mt-1">Last Parse: {formatDate(selectedCv.last_parse_at, true)} via {selectedCv.parse_model}</p>
                 )}
                 {selectedModel && <p className="text-xs text-accent-secondary mt-1">AI Model Selected: {selectedModel}</p>}
                 <button 
                    className="btn btn-primary btn-xs mt-2 flex items-center justify-center gap-1 text-xs"
                    onClick={() => setShowParseConfirm(true)}
                    disabled={isParsing}
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                 >
                    {isParsing ? (
                      <>
                        <Loader2 className="animate-spin" size={12} />
                        <span>Parsing ({parseTime}s)</span>
                      </>
                    ) : 'Run AI Parse'}
                 </button>
              </div>
              <button className="btn btn-secondary px-3 py-1 text-sm" onClick={() => setSelectedCv(null)}>Close</button>
            </header>

            <div>
              <h3 className="text-lg font-heading mb-3">Work Experiences</h3>
              {isLoadingExperiences ? (
                 <p className="text-sm text-secondary">Loading experiences...</p>
              ) : experiences.length === 0 ? (
                  <p className="text-sm text-muted">No work experiences parsed yet.</p>
              ) : (
                 <div className="flex flex-col gap-4">
                     {experiences.map((exp: any, e: any) => (
                        <div key={exp.id || e} className="glass-card p-4">
                           {editingExpId === exp.id ? (
                               <div className="flex flex-col gap-2">
                                   <input className="input-field text-sm" value={editExpData.role_title || ''} onChange={e => setEditExpData({...editExpData, role_title: e.target.value})} placeholder="Role" />
                                   <input className="input-field text-sm" value={editExpData.company_name || ''} onChange={e => setEditExpData({...editExpData, company_name: e.target.value})} placeholder="Company" />
                                   <div className="flex gap-2">
                                       <input className="input-field text-xs" value={editExpData.start_date || ''} onChange={e => setEditExpData({...editExpData, start_date: e.target.value})} placeholder="Start Date" />
                                       <input className="input-field text-xs" value={editExpData.end_date || ''} onChange={e => setEditExpData({...editExpData, end_date: e.target.value})} placeholder="End Date" />
                                   </div>
                                   <textarea className="input-field text-sm h-16" value={editExpData.description || ''} onChange={e => setEditExpData({...editExpData, description: e.target.value})} placeholder="Description" />
                                   <div className="flex gap-2 mt-1">
                                       <button className="text-accent-primary hover:text-white text-xs font-semibold" onClick={() => handleSaveExperience(exp.id)}>Save</button>
                                       <button className="text-secondary hover:text-white text-xs font-semibold" onClick={() => setEditingExpId(null)}>Cancel</button>
                                   </div>
                               </div>
                           ) : (
                               <>
                                   <div className="flex justify-between items-start">
                                       <div>
                                           <h4 className="font-semibold text-white">{exp.role_title}</h4>
                                           <p className="text-sm text-accent-tertiary">{exp.company_name}</p>
                                       </div>
                                       <button className="text-accent-primary hover:text-white text-xs font-semibold" onClick={() => { setEditingExpId(exp.id); setEditExpData(exp); }}>Edit</button>
                                   </div>
                                   <p className="text-xs text-secondary mt-1">{formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : 'Present'}</p>
                                   {exp.description && <p className="text-sm text-muted mt-2">{exp.description}</p>}
                               </>
                           )}
                        </div>
                     ))}
                 </div>
              )}

              {/* Education Section */}
              <div className="section-title text-accent-secondary mt-6 mb-3 flex items-center gap-2 font-semibold">
                 <GraduationCap size={16} /> Educations
              </div>
              {isLoadingExperiences ? (
                 <p className="text-sm text-secondary">Loading...</p>
              ) : educations.length === 0 ? (
                 <p className="text-sm text-muted">No education history parsed yet.</p>
              ) : (
                 <div className="flex flex-col gap-3">
                     {educations.map((edu: any, e: any) => (
                        <div key={edu.id || e} className="glass-card p-4">
                            {editingEduId === edu.id ? (
                                <div className="flex flex-col gap-2">
                                    <input className="input-field text-sm" value={editEduData.institution_name || ''} onChange={e => setEditEduData({...editEduData, institution_name: e.target.value})} placeholder="Institution" />
                                    <input className="input-field text-sm" value={editEduData.degree_title || ''} onChange={e => setEditEduData({...editEduData, degree_title: e.target.value})} placeholder="Degree" />
                                    <div className="flex gap-2">
                                        <input className="input-field text-xs" value={editEduData.start_date || ''} onChange={e => setEditEduData({...editEduData, start_date: e.target.value})} placeholder="Start Date" />
                                        <input className="input-field text-xs" value={editEduData.end_date || ''} onChange={e => setEditEduData({...editEduData, end_date: e.target.value})} placeholder="End Date" />
                                    </div>
                                    <textarea className="input-field text-sm h-16" value={editEduData.description || ''} onChange={e => setEditEduData({...editEduData, description: e.target.value})} placeholder="Description" />
                                    <div className="flex gap-2 mt-1">
                                        <button className="text-accent-primary hover:text-white text-xs font-semibold" onClick={() => handleSaveEducation(edu.id)}>Save</button>
                                        <button className="text-secondary hover:text-white text-xs font-semibold" onClick={() => setEditingEduId(null)}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-white">{edu.institution_name}</div>
                                            <div className="text-sm text-accent-tertiary">{edu.degree_title}</div>
                                        </div>
                                        <button className="text-accent-primary hover:text-white text-xs font-semibold" onClick={() => { setEditingEduId(edu.id); setEditEduData(edu); }}>Edit</button>
                                    </div>
                                    {(edu.start_date || edu.end_date) && (
                                        <div className="text-xs text-secondary mt-1">
                                            {formatDate(edu.start_date)} - {edu.end_date ? formatDate(edu.end_date) : 'Present'}
                                        </div>
                                    )}
                                    {edu.description && <p className="text-xs text-muted mt-2">{edu.description}</p>}
                                </>
                            )}
                        </div>
                     ))}
                 </div>
              )}

              {/* Languages Section */}
              <div className="section-title text-accent-secondary mt-6 mb-3 flex items-center gap-2 font-semibold">
                 <Globe size={16} /> Languages
              </div>
              {isLoadingExperiences ? (
                 <p className="text-sm text-secondary">Loading...</p>
              ) : languages.length === 0 ? (
                 <p className="text-sm text-muted">No languages parsed yet.</p>
              ) : (
                 <div className="grid grid-cols-2 gap-3">
                     {languages.map((lang: any, l: any) => (
                        <div key={lang.id || l} className="glass-card p-3">
                            {editingLangId === lang.id ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <input className="input-field text-sm" value={editLangData.language_name || ''} onChange={e => setEditLangData({...editLangData, language_name: e.target.value})} placeholder="Language" />
                                    <input className="input-field text-xs" value={editLangData.proficiency_level || ''} onChange={e => setEditLangData({...editLangData, proficiency_level: e.target.value})} placeholder="Proficiency (e.g. Native)" />
                                    <div className="flex gap-2 mt-1">
                                        <button className="text-accent-primary hover:text-white text-xs font-semibold" onClick={() => handleSaveLanguage(lang.id)}>Save</button>
                                        <button className="text-secondary hover:text-white text-xs font-semibold" onClick={() => setEditingLangId(null)}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center w-full">
                                    <div>
                                        <span className="text-sm text-white font-medium">{lang.language_name}</span>
                                        <span className="text-xs bg-white/10 px-2 py-1 rounded text-accent-tertiary ml-2">{lang.proficiency_level}</span>
                                    </div>
                                    <button className="text-accent-primary hover:text-white text-xs font-semibold" onClick={() => { setEditingLangId(lang.id); setEditLangData(lang); }}>Edit</button>
                                </div>
                            )}
                        </div>
                     ))}
                 </div>
              )}
             </div>

            <div>
               <h3 className="text-lg font-heading mb-3">Full Content Buffer</h3>
               <textarea 
                  className="input-field w-full h-64 text-xs font-mono bg-black/30 border-white/5 text-white/70"
                  value={selectedCv.content}
                  readOnly
               />
            </div>
          </div>
        </div>
      )}

        {cvToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
             <div className="glass-panel p-6 w-96 max-w-full text-center border border-white/10 shadow-2xl">
                <h3 className="text-xl font-heading mb-3 text-white">Delete CV?</h3>
                <p className="text-sm text-secondary mb-6">This action is permanent and will cascade-delete all parsed experiences, educations, and languages.</p>
                <div className="flex gap-4">
                    <button className="btn btn-secondary flex-1" onClick={() => setCvToDelete(null)}>Cancel</button>
                    <button className="btn flex-1 bg-red-600 hover:bg-red-500 text-white font-medium" onClick={confirmDelete}>Delete</button>
                </div>
             </div>
          </div>
       )}

       {showParseConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
             <div className="glass-panel p-6 w-96 max-w-full text-center border border-white/10 shadow-2xl">
                <h3 className="text-xl font-heading mb-3 text-white">Overwrite Data?</h3>
                <p className="text-sm text-secondary mb-6">Starting a new Parse will replace any existing experiences, educations, and languages for this CV version.</p>
                <div className="flex gap-4">
                    <button className="btn btn-secondary flex-1" onClick={() => setShowParseConfirm(false)}>Cancel</button>
                    <button className="btn btn-primary flex-1" onClick={() => { setShowParseConfirm(false); handleAiParse(selectedCv.id); }}>Parse</button>
                </div>
             </div>
          </div>
       )}
    </>
   );
 }
