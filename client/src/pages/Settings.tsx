import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Cpu,
  ShieldCheck,
  Key,
  CheckCircle2,
  Zap,
  Globe,
  ExternalLink,
  Search,
  RefreshCw,
  Sparkles,
  Server,
  Layers,
  AlertCircle
} from 'lucide-react';
import { useResearchStore } from '../store/useResearchStore';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { api } from '../services/api';

interface ScholarlyProviderInfo {
  id: string;
  name: string;
  attribution: string;
  terms_of_service: string;
  available: boolean;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  default_ttl_seconds: number;
}

interface LLMProviderInfo {
  id: string;
  name: string;
  default_model: string;
  available: boolean;
  requires_api_key: boolean;
  active: boolean;
}

interface EmbeddingProviderInfo {
  id: string;
  name: string;
  dimension: number;
  available: boolean;
  requires_api_key: boolean;
  active: boolean;
}

export const Settings: React.FC = () => {
  const { showToast } = useResearchStore();
  const [defaultExportFormat, setDefaultExportFormat] = useState('bibtex');
  const [hybridAlpha, setHybridAlpha] = useState(0.65);
  const [maxSearchDepth, setMaxSearchDepth] = useState(2);

  // Scholarly Providers & Cache State
  const [scholarlyProviders, setScholarlyProviders] = useState<ScholarlyProviderInfo[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // AI Providers State
  const [llmProviders, setLlmProviders] = useState<LLMProviderInfo[]>([]);
  const [embeddingProviders, setEmbeddingProviders] = useState<EmbeddingProviderInfo[]>([]);
  const [selectedLlm, setSelectedLlm] = useState<string>(() => localStorage.getItem('rr_user_ai_provider') || 'llama');
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('rr_user_ai_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);

  // DOI Lookup Tool State
  const [doiInput, setDoiInput] = useState('10.1145/3308558.3313460');
  const [doiLoading, setDoiLoading] = useState(false);
  const [resolvedDoiPaper, setResolvedDoiPaper] = useState<any | null>(null);
  const [doiError, setDoiError] = useState<string | null>(null);

  const fetchProviderData = async () => {
    setLoadingProviders(true);
    try {
      const [scholarlyRes, aiRes] = await Promise.all([
        api.getScholarlyProviders().catch(() => null),
        api.getAiProviders().catch(() => null)
      ]);

      if (scholarlyRes) {
        setScholarlyProviders(scholarlyRes.providers || []);
        setCacheStats(scholarlyRes.cacheStats || null);
      }
      if (aiRes) {
        setLlmProviders(aiRes.llmProviders || []);
        setEmbeddingProviders(aiRes.embeddingProviders || []);
      }
    } catch (e: any) {
      console.warn('Could not load provider diagnostics:', e);
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    fetchProviderData();
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('rr_user_ai_provider', selectedLlm);
    if (customApiKey.trim()) {
      localStorage.setItem('rr_user_ai_key', customApiKey.trim());
    } else {
      localStorage.removeItem('rr_user_ai_key');
    }
    showToast('Platform preferences and AI configuration saved successfully');
  };

  const handleResolveDoi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doiInput.trim()) return;

    setDoiLoading(true);
    setDoiError(null);
    setResolvedDoiPaper(null);

    try {
      const paper = await api.resolveDoi(doiInput.trim());
      setResolvedDoiPaper(paper);
      showToast(`DOI resolved from ${paper.source || 'Scholarly Provider'}!`);
      // Refresh cache stats
      api.getScholarlyProviders().then(res => setCacheStats(res.cacheStats)).catch(() => {});
    } catch (err: any) {
      setDoiError(err.message || 'Failed to resolve DOI');
    } finally {
      setDoiLoading(false);
    }
  };

  const cacheHitRatio = cacheStats && (cacheStats.hits + cacheStats.misses > 0)
    ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Platform Settings & Intelligence Configuration</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Manage multi-provider scholarly APIs, AI reasoning engines, in-memory caching, vector retrieval, and appearance.
        </p>
      </div>

      {/* Connected Infrastructure & Health */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Connected Infrastructure
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PostgreSQL metadata store and Qdrant semantic vector index
              </p>
            </div>
          </div>
          <Badge variant="emerald" icon={<CheckCircle2 className="w-3 h-3" />}>
            Operational
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Relational Store</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">PostgreSQL 16</span>
            <span className="text-[10px] text-emerald-500 block mt-0.5">17 Normalized Tables</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Vector Database</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Qdrant Cloud/Local</span>
            <span className="text-[10px] text-emerald-500 block mt-0.5">384-dim Hybrid Index</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">PDF Parser</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">PyMuPDF (fitz)</span>
            <span className="text-[10px] text-emerald-500 block mt-0.5">Background Async Queue</span>
          </div>
        </div>
      </div>

      {/* Scholarly Providers & In-Memory Caching */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Scholarly Metadata Integrations</span>
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                  Zero Fake Results Policy
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live academic APIs with polite pools, attribution enforcement, and async failover.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchProviderData}
            disabled={loadingProviders}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loadingProviders ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>

        {/* Providers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
          {scholarlyProviders.map((p) => (
            <div
              key={p.id}
              className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between space-y-2"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {p.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Available
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  {p.attribution}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">ID: {p.id}</span>
                <a
                  href={p.terms_of_service}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>Terms</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* In-Memory Cache Stats Card */}
        {cacheStats && (
          <div className="mt-3 p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <div>
                <span className="font-semibold text-indigo-950 dark:text-indigo-200 block text-xs">
                  In-Memory TTLCache Protection
                </span>
                <span className="text-[11px] text-indigo-800/80 dark:text-indigo-400">
                  {cacheStats.size} entries stored • {cacheStats.default_ttl_seconds}s TTL
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Cache Hits</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{cacheStats.hits}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Cache Misses</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{cacheStats.misses}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Hit Ratio</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{cacheHitRatio}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live DOI Scholarly Resolver Utility */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Live DOI Metadata Resolver
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Test direct resolution against Crossref, OpenAlex, or Semantic Scholar to inspect authentic metadata.
            </p>
          </div>
        </div>

        <form onSubmit={handleResolveDoi} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={doiInput}
            onChange={(e) => setDoiInput(e.target.value)}
            placeholder="e.g. 10.1145/3308558.3313460"
            className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono"
          />
          <Button
            type="submit"
            variant="secondary"
            size="md"
            disabled={doiLoading || !doiInput.trim()}
            icon={doiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          >
            {doiLoading ? 'Resolving...' : 'Resolve DOI'}
          </Button>
        </form>

        {doiError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{doiError}</span>
          </div>
        )}

        {resolvedDoiPaper && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {resolvedDoiPaper.title}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase">
                {resolvedDoiPaper.source || 'Crossref'}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              <strong>Authors:</strong> {(resolvedDoiPaper.authors || []).map((a: any) => a.name || a).join(', ') || 'N/A'}
            </p>
            <div className="flex flex-wrap gap-4 text-slate-500 dark:text-slate-400 text-[11px] pt-1">
              <span>Year: <strong>{resolvedDoiPaper.year || 'N/A'}</strong></span>
              <span>Citations: <strong>{resolvedDoiPaper.citationCount ?? 'N/A'}</strong></span>
              <span>Venue: <strong>{resolvedDoiPaper.venue || 'N/A'}</strong></span>
              {resolvedDoiPaper.doi && (
                <a
                  href={`https://doi.org/${resolvedDoiPaper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <span>doi.org/{resolvedDoiPaper.doi}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI & Embedding Configuration Form */}
      <form onSubmit={handleSavePreferences} className="space-y-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                AI Reasoning Engine & Embeddings Architecture
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switch LLM providers and semantic embedding models without modifying application business logic.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
            {/* LLM Provider Selector */}
            <div className="space-y-1.5">
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                Active Synthesis & RAG Model
              </label>
              <select
                value={selectedLlm}
                onChange={(e) => setSelectedLlm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium"
              >
                {llmProviders.length > 0 ? (
                  llmProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.requires_api_key ? '(Requires API Key)' : '(Free Local / Active)'}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="llama">Meta Llama API (Primary: Llama 3.3 70B / Llama 3.2)</option>
                    <option value="gemini">Google Gemini 1.5 Flash (Free Cloud Tier — Zero Cost)</option>
                    <option value="ollama">Ollama Local Engine (Llama 3.2 — Offline Fallback)</option>
                    <option value="builtin">ResearchRabbit Verifiable Builtin Synthesizer</option>
                  </>
                )}
              </select>
              <span className="text-[11px] text-slate-400 block">
                {selectedLlm === 'builtin'
                  ? 'Deterministic synthesis engine with citation verification. Zero external keys required.'
                  : selectedLlm === 'llama'
                  ? 'Primary cloud reasoning engine via Meta Llama API (Llama 3.3 70B / Llama 3.2).'
                  : selectedLlm === 'gemini'
                  ? 'Secondary cloud model powered by Google Gemini 1.5 Flash (Free Tier on Google AI Studio).'
                  : 'Offline fallback local engine running via Ollama (Llama 3.2) at http://localhost:11434.'}
              </span>

              {(selectedLlm === 'llama' || selectedLlm === 'gemini' || selectedLlm === 'openai' || selectedLlm === 'anthropic') && (
                <div className="pt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      {selectedLlm === 'llama' ? 'Meta Llama API Key (Optional)' : selectedLlm === 'gemini' ? 'Google Gemini API Key (Free Tier)' : 'Custom API Key (Optional)'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder={selectedLlm === 'llama' ? 'Enter Meta Llama API key or token' : selectedLlm === 'gemini' ? 'Enter Google AI Studio Gemini API key (Free)' : 'Enter API key'}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    {selectedLlm === 'gemini' ? 'Google AI Studio provides 1,500 free requests per day without credit card.' : 'Stored securely in your local browser storage for client and backend requests.'}
                  </span>
                </div>
              )}
            </div>

            {/* Ollama Commands Reference */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-[#141824] border border-slate-200 dark:border-white/10">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Local Ollama Model Commands (Zero Cost Offline Fallback)
              </span>
              <pre className="text-[10px] font-mono p-2 rounded bg-slate-100 dark:bg-[#1c2230] text-indigo-600 dark:text-indigo-400 overflow-x-auto">
{`ollama pull llama3.2
ollama run llama3.2
ollama pull nomic-embed-text
ollama list`}
              </pre>
              <span className="text-[10px] text-slate-400 block">
                Runs entirely locally without external subscriptions or network dependencies.
              </span>
            </div>
          </div>

          {/* Embedding Models Overview */}
          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-2">
              Semantic Vector Embedding Providers
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {embeddingProviders.map((ep) => (
                <div
                  key={ep.id}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {ep.id === 'local' ? 'Deterministic 384d' : ep.name.split(' ')[0]}
                    </span>
                    {ep.active ? (
                      <span className="text-[10px] text-emerald-500 font-medium">Active</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Available</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {ep.dimension} dimensions
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Retrieval & RAG Parameters Form */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Hybrid Search & Reranking Tuning
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Balance dense vector semantics with sparse lexical matching
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2 text-xs">
            <div>
              <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span>Semantic vs. Lexical Weight (Alpha = {hybridAlpha})</span>
                <span className="text-slate-500">{(hybridAlpha * 100).toFixed(0)}% Vector / {((1 - hybridAlpha) * 100).toFixed(0)}% Keyword</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={hybridAlpha}
                onChange={(e) => setHybridAlpha(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Citation Graph Traversal Depth
              </label>
              <select
                value={maxSearchDepth}
                onChange={(e) => setMaxSearchDepth(parseInt(e.target.value))}
                className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value={1}>1 Degree (Direct Citations & References)</option>
                <option value={2}>2 Degrees (Co-citations & Second-Order)</option>
                <option value={3}>3 Degrees (Deep Exploratory Corpus)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Citation Export Format
              </label>
              <select
                value={defaultExportFormat}
                onChange={(e) => setDefaultExportFormat(e.target.value)}
                className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="bibtex">BibTeX (.bib)</option>
                <option value="apa">APA 7th Edition</option>
                <option value="ris">RIS (EndNote / Zotero)</option>
                <option value="csv">CSV (Spreadsheet)</option>
                <option value="json">JSON Metadata</option>
              </select>
            </div>
          </div>
        </div>

        {/* Platform Attribution & Developer Information */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161c2c] border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-xs border border-indigo-400/20">
              🐇
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                ResearchRabbit AI Platform
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Academic Discovery & Citation Intelligence Engine
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Platform Architect & Developer:{' '}
              <a
                href="https://github.com/MohammedAffan-786"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Mohammed Affan
              </a>
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              v1.0.0 Enterprise Edition
            </span>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md">
            Save Platform Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
