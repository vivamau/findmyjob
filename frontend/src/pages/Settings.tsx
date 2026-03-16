import { useState, useEffect } from 'react';
import { Save, CheckCircle, Info, Globe, Plus, Trash2, Play, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function Settings() {
    const [providers, setProviders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeProvider, setActiveProvider] = useState<string>('');
    const [editingProvider, setEditingProvider] = useState<any>({});
    const [saveSuccess, setSaveSuccess] = useState('');
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    
    const [jobSources, setJobSources] = useState<any[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const [newInterval, setNewInterval] = useState(1);
    const [activeTab, setActiveTab] = useState<'ai' | 'scrapers'>('ai');
    const [scraping, setScraping] = useState(false);
    const [statusLabel, setStatusLabel] = useState('Run Scraper');

    useEffect(() => {
        fetchProviders();
        fetchModels();
        fetchJobSources();
    }, []);

    const fetchJobSources = async () => {
        try {
            const res = await api.get('/jobs/sources');
            setJobSources(res.data);
        } catch (err) { console.error(err); }
    };

    const handleAddSource = async () => {
        if (!newUrl.trim()) return;
        try {
            await api.post('/jobs/sources', { url: newUrl, scrape_interval_days: newInterval });
            setNewUrl('');
            setNewInterval(1);
            fetchJobSources();
        } catch (err: any) { console.error(err); }
    };

    const handleDeleteSource = async (id: number) => {
        try {
            await api.delete(`/jobs/sources/${id}`);
            fetchJobSources();
        } catch (err: any) { console.error(err); }
    };

    const handleRunScrape = async () => {
        setSaveSuccess('Scraping running... Please wait.');
        setScraping(true);
        setStatusLabel('Connecting...');

        const poll = setInterval(async () => {
            try {
                const res = await api.get('/jobs/scrape-status');
                if (res.data.status === 'scraping') setStatusLabel('Scraping...');
                else if (res.data.status === 'parsing') setStatusLabel('Parsing...');
                else if (res.data.status === 'saving') setStatusLabel('Saving...');
            } catch (err) {}
        }, 1000);

        try {
            await api.post('/jobs/scrape');
            setSaveSuccess('Scraped nodes completed flawlessly');
            fetchJobSources(); // Refresh list to load content flawlessly Green
        } catch (err: any) { 
            console.error(err); 
            setSaveSuccess('Scraping encountered anomalies node flawless');
        } finally {
            clearInterval(poll);
            setScraping(false);
            setStatusLabel('Run Scraper');
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
                                            <div className="flex gap-2 mt-1">
                                                <select 
                                                    data-testid="ollama-model-select"
                                                    className="input-field text-sm w-full" 
                                                    value={state.default_model || ''} 
                                                    onChange={e => handleInputChange(p.provider_id, 'default_model', e.target.value)} 
                                                >
                                                    <option value="">Select a model</option>
                                                    {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
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
                
                <div className="flex gap-2">
                    <input 
                        className="input-field text-sm w-full" 
                        value={newUrl} 
                        onChange={e => setNewUrl(e.target.value)} 
                        placeholder="https://example.com/jobs"
                    />
                    <div className="flex items-center gap-1 bg-white/5 px-3 rounded-lg border border-white/5">
                        <input 
                            type="number" 
                            min="1" 
                            className="bg-transparent text-sm w-12 text-center focus:outline-none" 
                            value={newInterval} 
                            onChange={e => setNewInterval(Number(e.target.value))} 
                        />
                        <span className="text-xs text-secondary">days</span>
                    </div>
                    <button className="btn btn-primary flex items-center gap-1" onClick={handleAddSource}>
                        <Plus size={16} />
                        <span>Add</span>
                    </button>
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
                            <div className="flex flex-col flex-1">
                                <div className="flex justify-between items-start w-full">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{s.url}</span>
                                        <span className="text-xs text-accent-tertiary">Interval: {s.scrape_interval_days || 1} d</span>
                                    </div>
                                    <button className="btn btn-xs text-danger hover:bg-danger/10" onClick={() => handleDeleteSource(s.id)}>
                                        <Trash2 size={14} />
                                    </button>
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
                        </div>
                    ))}
                </div>
                </div>
            )}
        </div>
    );
}
