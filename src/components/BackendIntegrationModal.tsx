import { useState } from 'react';
import { BackendConfig } from '../types/sora';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Code, ExternalLink, Globe } from 'lucide-react';
import { MAS_OFFICIAL_API_URL } from '../services/masApiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: BackendConfig;
  onSaveConfig: (newConfig: BackendConfig) => void;
  onRefreshData: () => void;
  isLoading: boolean;
}

export function BackendIntegrationModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onRefreshData,
  isLoading,
}: Props) {
  const [mode, setMode] = useState<BackendConfig['mode']>(config.mode);
  const [customApiUrl, setCustomApiUrl] = useState(config.customApiUrl || 'http://localhost:8000/api/mas/sora');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestResult({ status: 'testing', message: 'Testing endpoint connectivity...' });
    const targetUrl = mode === 'mas-direct' ? MAS_OFFICIAL_API_URL : customApiUrl;
    
    try {
      const start = performance.now();
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });
      const duration = Math.round(performance.now() - start);

      if (res.ok) {
        setTestResult({
          status: 'success',
          message: `Endpoint active! HTTP ${res.status} OK in ${duration}ms.`,
        });
      } else {
        setTestResult({
          status: 'error',
          message: `HTTP ${res.status}: ${res.statusText}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: err.message || 'Connection failed (CORS or network error). Use a backend proxy.',
      });
    }
  };

  const handleSave = () => {
    onSaveConfig({
      mode,
      customApiUrl,
      apiKey,
      status: mode === 'custom-backend' ? 'connected' : 'fallback',
      lastSyncTime: new Date().toLocaleTimeString(),
    });
    onRefreshData();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl relative my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">MAS Backend Rates Integration</h2>
              <p className="text-xs text-slate-400">Configure how this frontend ingests daily Monetary Authority of Singapore SORA rates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Integration Mode Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Data Source Mode
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('built-in')}
                className={`p-3.5 rounded-xl border text-left transition ${
                  mode === 'built-in'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-sm flex items-center gap-1.5">
                  <CheckCircle2 className={`w-4 h-4 ${mode === 'built-in' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  Verified Dataset
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Zero-latency authentic MAS rates dataset (Frontend-only mode).
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('custom-backend')}
                className={`p-3.5 rounded-xl border text-left transition ${
                  mode === 'custom-backend'
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-sm flex items-center gap-1.5">
                  <Server className={`w-4 h-4 ${mode === 'custom-backend' ? 'text-blue-400' : 'text-slate-500'}`} />
                  Custom Backend API
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Your upcoming Express, Python, or Go microservice proxying MAS.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('mas-direct')}
                className={`p-3.5 rounded-xl border text-left transition ${
                  mode === 'mas-direct'
                    ? 'border-purple-500 bg-purple-500/10 text-white'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-sm flex items-center gap-1.5">
                  <Globe className={`w-4 h-4 ${mode === 'mas-direct' ? 'text-purple-400' : 'text-slate-500'}`} />
                  Direct MAS API
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Queries eservices.mas.gov.sg directly (subject to browser CORS).
                </div>
              </button>
            </div>
          </div>

          {/* Custom Backend Inputs */}
          {mode === 'custom-backend' && (
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/60 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Backend API URL
                </label>
                <input
                  type="text"
                  value={customApiUrl}
                  onChange={(e) => setCustomApiUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/v1/mas/sora or /api/sora"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Bearer Token / API Key (Optional)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Optional auth token header"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testResult.status === 'testing'}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white rounded-lg transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testResult.status === 'testing' ? 'animate-spin' : ''}`} />
                  Test Endpoint
                </button>
                {testResult.status === 'success' && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {testResult.message}
                  </span>
                )}
                {testResult.status === 'error' && (
                  <span className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {testResult.message}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Backend Contract Specification for Developer */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-emerald-400" />
                Backend Expected JSON Response Contract
              </span>
              <a
                href="https://eservices.mas.gov.sg/statistics/dir/DomesticInterestRates.aspx"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
              >
                MAS Benchmark Portal <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-slate-400 mb-2 leading-relaxed">
              When you implement your backend service, format your JSON endpoint to return daily records matching either the MAS Open Data schema or this clean payload:
            </p>
            <pre className="text-[11px] text-emerald-300 font-mono bg-slate-900/90 p-3 rounded-lg overflow-x-auto border border-slate-800">
{`[
  {
    "date": "2026-10-02",
    "sora": 3.3425,          // Daily SORA (%)
    "comp_sora_1m": 3.3150,  // 1-Month Compounded SORA (%)
    "comp_sora_3m": 3.2890,  // 3-Month Compounded SORA (%)
    "comp_sora_6m": 3.2450,  // 6-Month Compounded SORA (%)
    "sora_index": 119.8452,  // SORA Index base
    "aggr_vol": 3850         // Aggregate Volume (SGD Millions)
  }
]`}
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-5 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
}
