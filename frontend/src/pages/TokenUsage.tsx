import { useState, useEffect } from 'react';
import { TrendingUp, Database, Zap, Clock, RefreshCw } from 'lucide-react';
import api from '../utils/api';

interface TokenUsageRecord {
  id: number;
  model_used: string;
  operation_type: string;
  tokens_in: number;
  tokens_out: number;
  started_at: string;
  ended_at: string;
}

interface TokenUsageSummary {
  model_used: string;
  operation_type: string;
  total_tokens_in: number;
  total_tokens_out: number;
  total_operations: number;
}

interface TokenUsageStats {
  total_operations: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_tokens: number;
  first_operation: string;
  last_operation: string;
}

export default function TokenUsage() {
  const [records, setRecords] = useState<TokenUsageRecord[]>([]);
  const [summary, setSummary] = useState<TokenUsageSummary[]>([]);
  const [stats, setStats] = useState<TokenUsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year} ${hours}:${minutes}`;
    } catch { return dateString; }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const fetchTokenUsage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [recordsRes, summaryRes, statsRes] = await Promise.all([
        api.get('/tokens'),
        api.get('/tokens/summary'),
        api.get('/tokens/stats'),
      ]);

      setRecords(recordsRes.data);
      setSummary(summaryRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch token usage data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenUsage();
  }, []);

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title text-gradient">Token Usage</h1>
          <p className="page-subtitle">Monitor your AI token consumption and usage patterns.</p>
        </div>
        <button className="btn btn-primary" onClick={fetchTokenUsage} disabled={isLoading}>
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </header>

      {error && (
        <div className="glass-card p-4 mb-6 border-l-4" style={{ borderLeftColor: 'var(--error)' }}>
          <p className="text-error">{error}</p>
        </div>
      )}

      {stats && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card flex items-center justify-between">
            <div>
              <p className="text-secondary text-sm font-medium">Total Operations</p>
              <h3 className="text-3xl mt-2">{formatNumber(stats.total_operations)}</h3>
            </div>
            <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: 'var(--accent-primary)' }}>
              <Database size={24} />
            </div>
          </div>

          <div className="glass-card flex items-center justify-between">
            <div>
              <p className="text-secondary text-sm font-medium">Total Tokens (In)</p>
              <h3 className="text-3xl mt-2">{formatNumber(stats.total_tokens_in)}</h3>
            </div>
            <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
              <TrendingUp size={24} />
            </div>
          </div>

          <div className="glass-card flex items-center justify-between">
            <div>
              <p className="text-secondary text-sm font-medium">Total Tokens (Out)</p>
              <h3 className="text-3xl mt-2">{formatNumber(stats.total_tokens_out)}</h3>
            </div>
            <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
              <Zap size={24} />
            </div>
          </div>

          <div className="glass-card flex items-center justify-between">
            <div>
              <p className="text-secondary text-sm font-medium">Total Tokens</p>
              <h3 className="text-3xl mt-2">{formatNumber(stats.total_tokens)}</h3>
            </div>
            <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(236,72,153,0.1)', color: 'var(--accent-secondary)' }}>
              <Clock size={24} />
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4">Usage by Model & Operation</h2>
          {summary.length === 0 ? (
            <p className="text-secondary">No token usage data available.</p>
          ) : (
            <div className="space-y-4">
              {summary.map((item, index) => (
                <div key={`${item.model_used}-${item.operation_type}-${index}`} className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{item.operation_type}</p>
                      <p className="text-xs text-secondary">{item.model_used}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatNumber(item.total_tokens_in + item.total_tokens_out)}</p>
                      <p className="text-xs text-secondary">{item.total_operations} ops</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-secondary">
                    <span>In: {formatNumber(item.total_tokens_in)}</span>
                    <span>Out: {formatNumber(item.total_tokens_out)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4">Recent Operations</h2>
          {records.length === 0 ? (
            <p className="text-secondary">No token usage data available.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {records.map((record) => (
                <div key={record.id} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-sm">{record.operation_type}</p>
                    <p className="text-xs text-secondary">{formatDate(record.started_at)}</p>
                  </div>
                  <div className="flex justify-between items-center text-xs text-secondary">
                    <span>{record.model_used}</span>
                    <span>{formatNumber(record.tokens_in + record.tokens_out)} tokens</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {stats && stats.first_operation && (
        <div className="glass-card p-4 text-sm text-secondary">
          <p>
            <span className="font-medium">Period:</span> {formatDate(stats.first_operation)} - {formatDate(stats.last_operation)}
          </p>
        </div>
      )}
    </div>
  );
}
