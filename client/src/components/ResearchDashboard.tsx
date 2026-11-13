import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  Search,
  ArrowRight,
  BookOpen,
  Folder,
  Share2,
  TrendingUp,
  Cpu,
  Layers,
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  Award,
  Zap,
  Globe2,
  Upload,
  Plus
} from 'lucide-react';
import { api } from '../services/api';
import { useResearchStore } from '../store/useResearchStore';
import { Paper, Collection, DashboardOverview } from '../../../shared/types';

interface ResearchDashboardProps {
  onOpenPaper: (paper: Paper) => void;
  onOpenUpload: () => void;
}

export const ResearchDashboard: React.FC<ResearchDashboardProps> = ({ onOpenPaper, onOpenUpload }) => {
  const { user, setActiveTab, setSearchInitialQuery, toggleSelectPaper, selectedPaperIds } = useResearchStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: dashboard, isLoading, refetch } = useQuery<DashboardOverview>({
    queryKey: ['dashboardOverview'],
    queryFn: () => api.getDashboardOverview(),
    staleTime: 30000,
  });

  const handleLaunchSearch = (q: string) => {
    if (!q.trim()) return;
    setSearchInitialQuery(q);
    setActiveTab('search');
  };

  const presetQueries = [
    'Attention mechanisms in deep transformer architectures',
    'Self-supervised representation learning in computer vision',
    'Graph neural networks for drug discovery and molecular design',
    'Reinforcement learning with human feedback alignment techniques'
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
      {/* 1. HERO & WELCOME BANNER (Linear / Perplexity Style) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-100/80 via-white to-white dark:from-indigo-950/30 dark:via-slate-900/50 dark:to-[#080d1a]/80 border border-slate-200/80 dark:border-slate-800/80 p-8 sm:p-10 shadow-sm backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Research Discovery Intelligence • v2.0 Production</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
            Discover seminal academic literature, trace citation lineage, analyze document sections, and synthesize evidence-backed literature reviews powered by hybrid vector search and Qdrant embeddings.
          </p>

          {/* Global Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLaunchSearch(searchQuery);
            }}
            className="pt-2 flex flex-col sm:flex-row gap-2.5 max-w-2xl"
          >
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Ask any research question or search papers by topic, DOI, or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-semibold shadow-xs shadow-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Explore Research</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Suggested Queries */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Try asking:</span>
            {presetQueries.map((query, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleLaunchSearch(query)}
                className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-left truncate max-w-xs cursor-pointer shadow-2xs"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. CORPUS METRICS TILES (Real verified database metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md space-y-1.5 shadow-2xs hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Indexed Papers</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {dashboard?.stats.totalPapers ?? 0}
          </p>
          <p className="text-[11px] text-emerald-500 dark:text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Real-time DB synced
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md space-y-1.5 shadow-2xs hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Total Citations</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {(dashboard?.stats.totalCitations ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Verified bibliographic</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md space-y-1.5 shadow-2xs hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Open Access</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Globe2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {dashboard?.stats.openAccessCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Direct PDF access</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md space-y-1.5 shadow-2xs hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Ingested PDFs</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Upload className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {dashboard?.stats.uploadedCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">PyMuPDF chunks</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md space-y-1.5 shadow-2xs hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Collections</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
              <Folder className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {dashboard?.stats.totalCollections ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">User workspaces</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md space-y-1.5 shadow-2xs hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Reviews</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {dashboard?.stats.totalReviews ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">PRISMA aligned</p>
        </div>
      </div>

      {/* 3. QUICK ACCESS RESEARCH INTELLIGENCE SUITE */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
          Research Intelligence Suite
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <button
            onClick={() => setActiveTab('search')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 text-left transition-all duration-200 group shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer backdrop-blur-md"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between">
              Semantic Discovery
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Natural-language search powered by Qdrant dense vectors & BM25 hybrid reranking.
            </p>
          </button>

          <button
            onClick={() => setActiveTab('graph')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 text-left transition-all duration-200 group shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer backdrop-blur-md"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between">
              Interactive Knowledge Graph
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Explore citation networks and distinguish verified citations from semantic clusters.
            </p>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40 text-left transition-all duration-200 group shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer backdrop-blur-md"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between">
              Grounded AI Assistant
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Cross-paper synthesis with strict source attribution, quote anchoring, and zero hallucinations.
            </p>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-500/40 text-left transition-all duration-200 group shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer backdrop-blur-md"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between">
              PRISMA Literature Reviews
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Generate structured 10-section reviews with methodology comparison matrix and Markdown/PDF export.
            </p>
          </button>
        </div>
      </div>

      {/* 4. TWO-COLUMN WORKSPACE: RECOMMENDATIONS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: High-Impact Literature Recommendations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Seminal Academic Recommendations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Curated high-impact literature based on citation velocity and domain importance</p>
            </div>
            <button
              onClick={() => setActiveTab('search')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              Browse all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {dashboard?.recommendations && dashboard.recommendations.length > 0 ? (
              dashboard.recommendations.map((paper) => {
                const isSelected = selectedPaperIds.includes(paper.id);
                return (
                  <div
                    key={paper.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/30 transition-all duration-200 group flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-2xs backdrop-blur-md"
                  >
                    <div className="space-y-2 flex-1 cursor-pointer" onClick={() => onOpenPaper(paper)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {paper.citationCount.toLocaleString()} citations
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">{paper.year}</span>
                        {paper.openAccessPdfUrl && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                            PDF Available
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                        {paper.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {paper.abstract}
                      </p>
                      {paper.recommendationReason && (
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium pt-1 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          <span>{paper.recommendationReason}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center gap-2 pt-2 sm:pt-0 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleSelectPaper(paper.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenPaper(paper)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-400">
                No recommendations available yet. Search for papers to populate your feed.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Trending Fields & Corpus Breakdown */}
        <div className="space-y-5">
          {/* Trending Topics */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 space-y-3.5 backdrop-blur-md shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              Trending Research Fields
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Computer Science', count: '142 papers', share: '62%' },
                { name: 'Artificial Intelligence', count: '118 papers', share: '51%' },
                { name: 'Quantum Computing', count: '45 papers', share: '19%' },
                { name: 'Biomedicine & Genomics', count: '32 papers', share: '14%' },
              ].map((field, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{field.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">{field.count}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-semibold">{field.share}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Intelligence Provider Status */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900/40 border border-indigo-500/20 space-y-3 backdrop-blur-md shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Active AI Reasoning
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Free Local</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inference powered by <strong>Ollama (qwen3:4b)</strong> with <strong>768d nomic-embed-text</strong> dense vector index in Qdrant. Zero subscription cost.
            </p>
            <button
              onClick={() => setActiveTab('settings')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              Configure AI & Embedding models <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
