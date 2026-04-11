import { useState, useEffect } from 'react';
import { Save, CheckCircle, Info, Globe, Plus, Trash2, Play, Loader2, Cpu, Clock } from 'lucide-react';
import api from '../utils/api';
import CustomDropdown from './components/CustomDropdown';
import { useTaskContext } from '../context/TaskContext';
import type { TaskType } from '../context/TaskContext';

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)   return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1)  return 'Yesterday';
    if (days < 7)    return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Settings() {
    const { startTask, trackBackendTask } = useTaskContext();
    const [providers, setProviders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeProvider, setActiveProvider] = useState<string>('');
    const [editingProvider, setEditingProvider] = useState<any>({});
    const [saveSuccess, setSaveSuccess] = useState('');
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    
    const [jobSources, setJobSources] = useState<any[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newInterval, setNewInterval] = useState(1);
    const [newTextLimit, setNewTextLimit] = useState(8000);
    const [activeTab, setActiveTab] = useState<'ai' | 'scrapers' | 'prompts'>('ai');
    const [prompts, setPrompts] = useState<any[]>([]);
    const [editingPromptKey, setEditingPromptKey] = useState<string | null>(null);
    const [editPromptText, setEditPromptText] = useState<string>('');
    const [scraping, setScraping] = useState(false);
    const [statusLabel, setStatusLabel] = useState('Run Scraper');
    const [scrapingSources, setScrapingSources] = useState<Set<number>>(new Set());

    const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
    const [editUrl, setEditUrl] = useState('');
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editInterval, setEditInterval] = useState(1);
    const [editTextLimit, setEditTextLimit] = useState(8000);
    const [isOllamaDropdownOpen, setIsOllamaDropdownOpen] = useState(false);

    useEffect(() => {
        fetchProviders();
        fetchModels();
        fetchJobSources();
        fetchPrompts();
    }, []);

    const fetchJobSources = async () => {
        try {
            const res = await api.get('/jobs/sources');
            setJobSources(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchPrompts = async () => {
        try {
            const res = await api.get('/ai/prompts');
            setPrompts(res.data);
        } catch (err) { console.error('Failed to load prompts:', err); }
    };

    const handleUpdatePrompt = async (key: string) => {
        try {
            await api.put(`/ai/prompts/${key}`, { prompt_text: editPromptText });
            setEditingPromptKey(null);
            setSaveSuccess('Prompt updated successfully!');
            fetchPrompts();
        } catch (err: any) { 
            console.error(err); 
            alert(`Failed to update prompt: ${err.response?.data?.error || err.message}`); 
        }
    };

    const handleAddSource = async () => {
        if (!newUrl.trim()) return;
        setSaveSuccess('');
        try {
            await api.post('/jobs/sources', {
                url: newUrl,
                scrape_interval_days: newInterval,
                name: newName,
                description: newDescription,
                scrape_text_limit: newTextLimit
            });
            setNewUrl('');
            setNewName('');
            setNewDescription('');
            setNewInterval(1);
            setNewTextLimit(8000);
            setSaveSuccess('Job source added successfully!');
            fetchJobSources();
        } catch (err: any) { 
            console.error(err); 
            alert(`Failed to add source: ${err.response?.data?.error || err.message}`);
        }
    };

    const handleDeleteSource = async (id: number) => {
        try {
            await api.delete(`/jobs/sources/${id}`);
            fetchJobSources();
        } catch (err: any) { console.error(err); }
    };

    const handleUpdateSource = async (id: number) => {
        try {
            await api.put(`/jobs/sources/${id}`, {
                url: editUrl,
                scrape_interval_days: editInterval,
                name: editName,
                description: editDescription,
                scrape_text_limit: editTextLimit
            });
            setEditingSourceId(null);
            setSaveSuccess('Job source updated successfully!');
            fetchJobSources();
        } catch (err: any) { alert(`Failed to update: ${err.response?.data?.error || err.message}`); }
    };

    const handleRunScrape = async () => {
        setSaveSuccess('Scraping started...');
        setScraping(true);
        setStatusLabel('Connecting...');
        try {
            const res = await api.post('/jobs/scrape');
            const backendTaskId = res.data.task_id;
            const localTaskId = startTask('scrape' as TaskType, 'Scraping all job sources');
            trackBackendTask(localTaskId, backendTaskId, async () => {
                fetchJobSources();
                setScraping(false);
                setStatusLabel('Run Scraper');
                setSaveSuccess('Scraping completed');
            });
            // Also stop local spinner when done
            const poll = setInterval(async () => {
                try {
                    const status = await api.get(`/tasks/${backendTaskId}`);
                    if (status.data.detail) setStatusLabel(status.data.detail);
                    if (status.data.status !== 'running') {
                        clearInterval(poll);
                        setScraping(false);
                        setStatusLabel('Run Scraper');
                    }
                } catch { clearInterval(poll); setScraping(false); setStatusLabel('Run Scraper'); }
            }, 1500);
        } catch (err: any) {
            console.error(err);
            setSaveSuccess('Failed to start scraping');
            setScraping(false);
            setStatusLabel('Run Scraper');
        }
    };

    const handleRunSourceScrape = async (sourceId: number) => {
        const source = jobSources.find((s: any) => s.id === sourceId);
        const label = source?.name || source?.url || `Source #${sourceId}`;
        setSaveSuccess(`Scraping "${label}"...`);
        setScrapingSources(prev => new Set(prev).add(sourceId));
        try {
            const res = await api.post(`/jobs/sources/${sourceId}/scrape`);
            if (res.data.task_id) {
                const localTaskId = startTask('scrape' as TaskType, `Scraping "${label}"`);
                const done = () => {
                    fetchJobSources();
                    setSaveSuccess(`"${label}" scraped`);
                    setScrapingSources(prev => { const s = new Set(prev); s.delete(sourceId); return s; });
                };
                trackBackendTask(localTaskId, res.data.task_id, async () => { fetchJobSources(); }, done);
            }
        } catch (err: any) {
            console.error(err);
            setSaveSuccess(`Failed to scrape "${label}"`);
            setScrapingSources(prev => { const s = new Set(prev); s.delete(sourceId); return s; });
        }
    };

    const fetchModels = async () => {
        try {
            const res = await api.get('/ai/models');
            setOllamaModels(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchProviders = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/ai/providers');
            setProviders(res.data);
            const active = res.data.find((p: any) => p.is_active === 1);
            if (active) setActiveProvider(active.provider_id);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const handleSaveConfig = async (providerId: string) => {
        setSaveSuccess('');
        try {
            const data = editingProvider[providerId] || {};
            await api.put(`/ai/providers/${providerId}`, {
                api_key: data.api_key,
                default_model: data.default_model,
                is_active: activeProvider === providerId ? 1 : 0
            });
            setSaveSuccess(`Successfully updated ${providerId} settings!`);
            fetchProviders();
        } catch (err: any) { alert(`Failed to update config: ${err.message}`); }
    };

    const handleInputChange = (providerId: string, field: string, value: string) => {
         setEditingProvider((prev: any) => ({
             ...prev,
             [providerId]: {
                 ...(prev[providerId] || providers.find((p: any) => p.provider_id === providerId)),
                 [field]: value
             }
         }));
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <header className="page-header">
                <div>
                    <h1 className="page-title text-gradient">System Settings</h1>
                    <p className="page-subtitle">Configure AI Providers, models, and third party APIs keys.</p>
                </div>
            </header>

            {saveSuccess && (
                <div className="glass-panel p-4 mb-6 flex items-center gap-2 border-l-4 border-l-success animate-fade-in">
                    <CheckCircle className="text-success" size={20} />
                    <span className="text-sm font-medium">{saveSuccess}</span>
                </div>
            )}

            <div className="flex gap-2 self-start mb-6 bg-white/5 p-1 rounded-lg backdrop-blur-sm border border-white/5">
                <button 
                    className={`py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-accent text-white shadow-lg font-semibold' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                    onClick={() => setActiveTab('ai')}
                >
                    <span>AI Providers</span>
                </button>
                <button 
                    className={`py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'scrapers' ? 'bg-accent text-white shadow-lg font-semibold' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                    onClick={() => setActiveTab('scrapers')}
                >
                    <span>Job Scrapers</span>
                </button>
                <button 
                    className={`py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'prompts' ? 'bg-accent text-white shadow-lg font-semibold' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                    onClick={() => setActiveTab('prompts')}
                >
                    <span>AI Prompts</span>
                </button>
            </div>

            {activeTab === 'ai' && (
                <div className="glass-panel p-6 flex flex-col gap-6">
                <div className="flex items-center gap-2 mb-2 p-3 bg-white/5 rounded border border-white/5 text-xs text-secondary">
                    <Info size={16} className="text-accent-tertiary" />
                    <span>Configuration is saved locally inside secure Database environment nodes flawlessly.</span>
                </div>

                {isLoading ? (
                    <p className="text-sm text-secondary">Loading provider records...</p>
                ) : (
                    providers.map((p: any) => {
                        const state = editingProvider[p.provider_id] || p;
                        const isActive = activeProvider === p.provider_id;
                        
                        return (
                            <div key={p.provider_id} className={`p-4 rounded-lg flex flex-col gap-3 transition-all ${isActive ? 'bg-white/5 border border-accent-secondary/20 shadow-lg' : 'bg-transparent border border-white/5'}`}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="input-radio">
                                            <input 
                                                type="radio" 
                                                name="activeProvider" 
                                                checked={isActive} 
                                                onChange={() => setActiveProvider(p.provider_id)} 
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-lg capitalize">{p.provider_id}</h4>
                                            {p.provider_id === 'ollama' && <p className="text-xs text-secondary">Uses local host endpoint (11434).</p>}
                                        </div>
                                    </div>
                                    <button 
                                        className={`btn btn-sm text-xs flex items-center gap-1 ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => handleSaveConfig(p.provider_id)}
                                    >
                                        <Save size={14} />
                                        <span>Save</span>
                                    </button>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <label className="text-xs text-muted">Default Model Name</label>
                                        {p.provider_id === 'ollama' ? (
                                            <div className="flex gap-2 mt-1" data-testid="ollama-model-select">
                                                <CustomDropdown 
                                                    items={ollamaModels.map(m => ({ id: m, title: m }))} 
                                                    selectedId={state.default_model || ''} 
                                                    onSelect={val => handleInputChange(p.provider_id, 'default_model', val)} 
                                                    isOpen={isOllamaDropdownOpen} 
                                                    setIsOpen={setIsOllamaDropdownOpen} 
                                                    placeholder="Select a model"
                                                    icon={<Cpu size={16} className="text-accent-secondary" />}
                                                />
                                                {ollamaModels.length === 0 && <span className="text-xs text-warning flex items-center">Offline</span>}
                                            </div>
                                        ) : (
                                            <input 
                                                className="input-field text-sm w-full mt-1" 
                                                value={state.default_model || ''} 
                                                onChange={e => handleInputChange(p.provider_id, 'default_model', e.target.value)} 
                                                placeholder="e.g. gpt-4o, claude-3-5" 
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted">API Key {p.provider_id === 'ollama' && '(Optional for local)'}</label>
                                        <input 
                                            type="password"
                                            className="input-field text-sm w-full mt-1" 
                                            value={state.api_key || ''} 
                                            onChange={e => handleInputChange(p.provider_id, 'api_key', e.target.value)} 
                                            placeholder={p.provider_id === 'ollama' ? 'n/a' : 'Sk-...' }
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
                </div>
            )}

            {activeTab === 'scrapers' && (
                <div className="glass-panel p-6 flex flex-col gap-4">
                <h3 className="text-xl font-bold text-gradient flex items-center gap-2">
                    <Globe size={20} className="text-accent-secondary" />
                    <span>Job Search Sources</span>
                </h3>
                <p className="text-sm text-secondary">Add URLs to scrapers index flawlessly where positions description flaws flaws will iterate smoothly.</p>
                
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <input 
                            className="input-field text-sm w-1/3" 
                            value={newName} 
                            onChange={e => setNewName(e.target.value)} 
                            placeholder="Name (e.g. IAEA)"
                        />
                        <input 
                            className="input-field text-sm w-2/3" 
                            value={newUrl} 
                            onChange={e => setNewUrl(e.target.value)} 
                            placeholder="https://example.com/jobs"
                        />
                    </div>
                    <div className="flex gap-2">
                        <input 
                            className="input-field text-sm w-full" 
                            value={newDescription} 
                            onChange={e => setNewDescription(e.target.value)} 
                            placeholder="Description metadata flaws flaws"
                        />
                        <div className="flex items-center gap-1 bg-white/5 px-3 rounded-lg border border-white/5" title="Scrape interval in days">
                            <input
                                type="number"
                                min="1"
                                className="bg-transparent text-sm w-8 text-center focus:outline-none"
                                value={newInterval}
                                onChange={e => setNewInterval(Number(e.target.value))}
                            />
                            <span className="text-xs text-secondary">d</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/5 px-3 rounded-lg border border-white/5" title="Max characters sent to AI for parsing">
                            <input
                                type="number"
                                step="1000"
                                min="1000"
                                className="bg-transparent text-sm w-14 text-center focus:outline-none"
                                value={newTextLimit}
                                onChange={e => setNewTextLimit(Number(e.target.value))}
                            />
                            <span className="text-xs text-secondary">ch</span>
                        </div>
                        <button className="btn btn-primary flex items-center gap-1" onClick={handleAddSource}>
                            <Plus size={16} />
                            <span>Add</span>
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-3">
                    <span className="text-xs text-secondary">Ready to index positions?</span>
                    <button className="btn btn-xs btn-primary flex items-center gap-1" onClick={handleRunScrape} disabled={scraping}>
                        {scraping ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        <span>{statusLabel}</span>
                    </button>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                    {jobSources.map((s: any) => (
                        <div key={s.id} className="p-3 bg-white/5 border border-white/5 rounded-lg flex justify-between items-center transition-all hover:bg-white/10">
                            {editingSourceId === s.id ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex gap-2">
                                        <input 
                                            className="input-field text-sm w-1/3" 
                                            value={editName} 
                                            onChange={e => setEditName(e.target.value)} 
                                            placeholder="Name"
                                        />
                                        <input 
                                            className="input-field text-sm w-2/3" 
                                            value={editUrl} 
                                            onChange={e => setEditUrl(e.target.value)} 
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            className="input-field text-sm w-full" 
                                            value={editDescription} 
                                            onChange={e => setEditDescription(e.target.value)} 
                                            placeholder="Description"
                                        />
                                        <div className="flex items-center gap-1 bg-white/5 px-2 rounded-lg border border-white/5" title="Scrape interval in days">
                                            <input
                                                type="number"
                                                className="bg-transparent text-sm w-8 text-center focus:outline-none"
                                                value={editInterval}
                                                onChange={e => setEditInterval(Number(e.target.value))}
                                            />
                                            <span className="text-xs text-secondary">d</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white/5 px-2 rounded-lg border border-white/5" title="Max characters sent to AI for parsing">
                                            <input
                                                type="number"
                                                step="1000"
                                                min="1000"
                                                className="bg-transparent text-sm w-14 text-center focus:outline-none"
                                                value={editTextLimit}
                                                onChange={e => setEditTextLimit(Number(e.target.value))}
                                            />
                                            <span className="text-xs text-secondary">ch</span>
                                        </div>
                                        <button className="btn btn-xs btn-primary px-3" onClick={() => handleUpdateSource(s.id)}>Save</button>
                                        <button className="btn btn-xs btn-secondary px-3" onClick={() => setEditingSourceId(null)}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                 <div className="flex flex-col flex-1 min-w-0">
                                     <div className="flex justify-between items-start w-full">
                                         <div className="flex flex-col min-w-0 flex-1">
                                             {s.name && <span className="text-sm font-bold text-white mb-1">{s.name}</span>}
                                             <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-secondary mb-1 hover:underline hover:text-white transition-colors truncate block">
                                                 {s.url}
                                             </a>
                                             {s.description && <p className="text-xs text-white/60 mb-1">{s.description}</p>}
                                             <span className="text-xs text-accent-tertiary">Interval: {s.scrape_interval_days || 1} d &nbsp;·&nbsp; Limit: {(s.scrape_text_limit || 8000).toLocaleString()} ch</span>
                                             <span className="flex items-center gap-1 text-xs text-secondary mt-0.5">
                                                 <Clock size={10} className={s.last_scraped_at ? 'text-secondary' : 'text-muted'} />
                                                 {timeAgo(s.last_scraped_at)}
                                             </span>
                                         </div>
                                        <div className="flex gap-2">
                                           <button
                                               className="btn btn-xs btn-primary flex items-center gap-1"
                                               onClick={() => handleRunSourceScrape(s.id)}
                                               disabled={scrapingSources.has(s.id)}
                                           >
                                               {scrapingSources.has(s.id) ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                               <span>Run</span>
                                           </button>
                                           <button
                                               className="btn btn-xs btn-secondary hover:text-white"
                                               onClick={() => {
                                                   setEditingSourceId(s.id);
                                                   setEditUrl(s.url);
                                                   setEditName(s.name || '');
                                                   setEditDescription(s.description || '');
                                                   setEditInterval(s.scrape_interval_days || 1);
                                                   setEditTextLimit(s.scrape_text_limit || 8000);
                                               }}
                                           >
                                               Edit
                                           </button>
                                           <button aria-label="Delete source" className="btn btn-xs text-danger hover:bg-danger/10" onClick={() => handleDeleteSource(s.id)}>
                                               <Trash2 size={14} />
                                           </button>
                                       </div>
                                    </div>
                                    {s.last_scraped_content && (
                                        <details className="mt-2 text-xs text-secondary">
                                            <summary className="cursor-pointer text-accent hover:underline">View Scraped Content</summary>
                                            <pre className="p-2 bg-black/40 rounded mt-1 overflow-auto max-h-40 whitespace-pre-wrap font-mono text-[10px]">
                                                {s.last_scraped_content.substring(0, 2000)}{s.last_scraped_content.length > 2000 && '...'}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                </div>
            )}

            {activeTab === 'prompts' && (
                <div className="glass-panel p-6 flex flex-col gap-4">
                    <h3 className="text-xl font-bold text-gradient flex items-center gap-2">
                         <Save size={20} className="text-accent-secondary" />
                         <span>AI Prompts Editor</span>
                    </h3>
                    <p className="text-sm text-secondary">Tune formulas determining scoring match layouts and extraction rules flawless flawlessly.</p>
                    
                    <div className="flex flex-col gap-3 mt-2">
                        {prompts.map((p: any) => (
                            <div key={p.key} className="p-4 bg-white/5 border border-white/5 rounded-lg flex flex-col gap-3 transition-all">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-semibold text-gradient capitalize">{p.key.replace(/_/g, ' ')}</h4>
                                        <p className="text-xs text-secondary">{p.description}</p>
                                    </div>
                                    {editingPromptKey === p.key ? (
                                        <div className="flex gap-2">
                                            <button className="btn btn-xs btn-primary px-3" onClick={() => handleUpdatePrompt(p.key)}>Save</button>
                                            <button className="btn btn-xs btn-secondary px-3" onClick={() => setEditingPromptKey(null)}>Cancel</button>
                                        </div>
                                    ) : (
                                        <button 
                                            className="btn btn-xs btn-secondary px-3" 
                                            onClick={() => {
                                                setEditingPromptKey(p.key);
                                                setEditPromptText(p.prompt_text);
                                            }}
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>

                                {editingPromptKey === p.key ? (
                                    <textarea 
                                        className="input-field text-xs font-mono w-full h-48 mt-1 p-2 bg-black/40 border border-accent-secondary/30 focus:outline-none resize-none" 
                                        value={editPromptText} 
                                        onChange={e => setEditPromptText(e.target.value)} 
                                        placeholder="Enter prompt text template..."
                                    />
                                ) : (
                                    <pre className="p-2 bg-black/20 rounded mt-1 overflow-auto max-h-40 whitespace-pre-wrap font-mono text-[11px] text-white/80 border border-white/5">
                                        {p.prompt_text}
                                    </pre>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
