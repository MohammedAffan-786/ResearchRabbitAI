import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  Search,
  ArrowRight,
  BookOpen,
  Users,
  Folder,
  Network,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Atom,
  Clock,
  Layers,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { useResearchStore } from '../store/useResearchStore';
import { Paper, DashboardOverview } from '../../../shared/types';

interface ResearchDashboardProps {
  onOpenPaper: (paper: Paper) => void;
  onOpenUpload: () => void;
}

export const ResearchDashboard: React.FC<ResearchDashboardProps> = ({ onOpenPaper, onOpenUpload }) => {
  const { setActiveTab, setSearchInitialQuery } = useResearchStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const { data: dashboard } = useQuery<DashboardOverview>({
    queryKey: ['dashboardOverview'],
    queryFn: () => api.getDashboardOverview(),
    staleTime: 30000,
  });

  const handleLaunchSearch = (q: string) => {
    if (!q.trim()) return;
    setSearchInitialQuery(q);
    setActiveTab('search');
  };

  const topicChips = [
    'Large Language Models',
    'Neural Networks',
    'RAG',
    'Computer Vision'
  ];

  // Active 7-day research telemetry from real database events
  const liveWeeklyActivity = dashboard?.weeklyActivity && dashboard.weeklyActivity.length === 7
    ? dashboard.weeklyActivity
    : [
        { day: 'M', dayName: 'Monday', date: '', count: 0, label: 'Monday: No activity recorded' },
        { day: 'T', dayName: 'Tuesday', date: '', count: 0, label: 'Tuesday: No activity recorded' },
        { day: 'W', dayName: 'Wednesday', date: '', count: 0, label: 'Wednesday: No activity recorded' },
        { day: 'T', dayName: 'Thursday', date: '', count: 0, label: 'Thursday: No activity recorded' },
        { day: 'F', dayName: 'Friday', date: '', count: 0, label: 'Friday: No activity recorded' },
        { day: 'S', dayName: 'Saturday', date: '', count: 0, label: 'Saturday: No activity recorded' },
        { day: 'S', dayName: 'Sunday', date: '', count: 0, label: 'Sunday: No activity recorded' },
      ];

  const maxActivityCount = Math.max(...liveWeeklyActivity.map((d) => d.count), 1);
  const totalWeeklyActions = liveWeeklyActivity.reduce((acc, curr) => acc + curr.count, 0);
  const isRealTelemetry = Boolean(dashboard?.weeklyActivity && dashboard.weeklyActivity.length === 7);

  // Real-time explored papers from database
  const displayedRecentPapers: Paper[] = dashboard?.recentPapers || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Workspace / <span className="text-slate-700 dark:text-slate-200">Overview</span>
            <span className="sr-only">Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Research overview
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>System online</span>
          </div>
          <button
            onClick={() => setActiveTab('search')}
            className="p-2 rounded-xl bg-white dark:bg-[#161c2c] border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-2xs transition-colors cursor-pointer"
            title="Search academic literature"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. HERO BANNER: "Ideas become discoveries." (Signature Mixed-Contrast Card) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#141529] via-[#1b1838] to-[#131526] text-white p-7 sm:p-9 border border-indigo-950/50 dark:border-indigo-500/30 shadow-xl">
        {/* Ambient radial glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Floating atom / constellation emblem on the right */}
        <div className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 w-28 h-28 items-center justify-center opacity-75 pointer-events-none">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-indigo-400/30 animate-spin" style={{ animationDuration: '24s' }} />
            <div className="absolute inset-2 rounded-full border border-purple-400/40 animate-ping opacity-25" style={{ animationDuration: '4s' }} />
            <Atom className="w-10 h-10 text-indigo-300" />
          </div>
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
            RESEARCH INTELLIGENCE
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Ideas become discoveries.
          </h2>

          <p className="text-sm text-slate-300 dark:text-slate-300 leading-relaxed max-w-xl">
            Explore millions of scholarly works. Discover connections. Build knowledge.
          </p>

          {/* Search Bar with Explore Button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLaunchSearch(searchQuery);
            }}
            className="pt-1"
          >
            <div className="relative flex items-center max-w-xl">
              <Search className="absolute left-4 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search papers, DOI, authors, or research topics... (Ask any research question)"
                className="w-full pl-11 pr-28 py-3.5 rounded-full bg-white dark:bg-[#181d2c] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-md transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 px-5 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Explore
              </button>
            </div>
          </form>

          {/* Preset Topic Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {topicChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLaunchSearch(chip)}
                className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-md transition-all cursor-pointer border border-white/10 hover:border-white/25"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. FOUR KEY STAT METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saved Papers */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#151b2b] border border-slate-200/90 dark:border-white/10 shadow-2xs hover:shadow-md transition-all space-y-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {dashboard?.stats.totalPapers !== undefined ? dashboard.stats.totalPapers.toLocaleString() : '0'}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Saved papers
            </div>
          </div>
        </div>

        {/* Authors Tracked */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#151b2b] border border-slate-200/90 dark:border-white/10 shadow-2xs hover:shadow-md transition-all space-y-3">
          <div className="w-9 h-9 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {dashboard?.stats.totalAuthors !== undefined ? dashboard.stats.totalAuthors.toLocaleString() : '0'}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Authors tracked
            </div>
          </div>
        </div>

        {/* Collections */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#151b2b] border border-slate-200/90 dark:border-white/10 shadow-2xs hover:shadow-md transition-all space-y-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {dashboard?.stats.totalCollections !== undefined ? dashboard.stats.totalCollections.toLocaleString() : '0'}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Collections
            </div>
          </div>
        </div>

        {/* Graph Connections */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#151b2b] border border-slate-200/90 dark:border-white/10 shadow-2xs hover:shadow-md transition-all space-y-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {dashboard?.stats.graphConnections !== undefined ? dashboard.stats.graphConnections.toLocaleString() : '0'}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Graph connections
            </div>
          </div>
        </div>
      </div>

      {/* 4. MIDDLE TWO COLUMNS: RESEARCH ACTIVITY & RESEARCH SOURCES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Card: Research Activity */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#151b2b] border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Research activity
            </h3>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/5">
              Last 7 days
            </span>
          </div>

          {/* Interactive Histogram Bars */}
          <div className="pt-3 pb-1">
            <div className="h-28 flex items-end justify-between gap-3 px-2">
              {liveWeeklyActivity.map((item, idx) => {
                const heightPercent = item.count > 0
                  ? Math.min(100, Math.max(18, Math.round((item.count / maxActivityCount) * 100)))
                  : 8;
                const isHovered = hoveredDay === idx;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredDay(idx)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative"
                  >
                    {isHovered && (
                      <div className="absolute -top-8 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-medium whitespace-nowrap shadow-lg z-20 animate-in fade-in">
                        {item.label}{item.isToday ? ' (Today)' : ''}
                      </div>
                    )}
                    <div className="w-full h-24 flex items-end justify-center">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                          isHovered
                            ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-xs'
                            : item.count > 0
                              ? 'bg-indigo-100 dark:bg-indigo-900/40 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/60'
                              : 'bg-slate-100 dark:bg-white/5 group-hover:bg-slate-200 dark:group-hover:bg-white/10'
                        }`}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-xs ${item.isToday ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'font-semibold text-slate-400 dark:text-slate-500'}`}>
                        {item.day}
                      </span>
                      {item.isToday && (
                        <span className="w-1 h-1 rounded-full bg-indigo-500" title="Today" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-2">
              {isRealTelemetry
                ? `Real-time database activity log (${totalWeeklyActions} events recorded this week)`
                : 'Real-time research session activity'}
            </div>
          </div>
        </div>

        {/* Right Card: Research Sources */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#151b2b] border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Research sources
          </h3>

          <div className="space-y-3 pt-1">
            {[
              { name: 'OpenAlex', metric: '250M+ works', note: 'Global academic metadata' },
              { name: 'Crossref', metric: 'DOI registry', note: 'Publisher record validation' },
              { name: 'Semantic Scholar', metric: '200M+ papers', note: 'Citation graphs & TLDRs' },
              { name: 'arXiv', metric: '2.4M+ preprints', note: 'Open-access scientific e-prints' },
            ].map((src, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {src.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                    {src.metric}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. RECENTLY EXPLORED PAPERS */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#151b2b] border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Recently explored papers
          </h3>
          <button
            onClick={() => setActiveTab('library')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            View library <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {displayedRecentPapers.length > 0 ? (
            displayedRecentPapers.map((paper) => {
              const firstAuthor = Array.isArray(paper.authors) && paper.authors.length > 0
                ? (typeof paper.authors[0] === 'string' ? paper.authors[0] : (paper.authors[0]?.name || 'Author'))
                : 'Scholar';
              const authorText = paper.authors && paper.authors.length > 1
                ? `${firstAuthor} et al.`
                : firstAuthor;

              return (
                <div
                  key={paper.id}
                  onClick={() => onOpenPaper(paper)}
                  className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {paper.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {authorText} • {paper.year || 'Recent'} • {paper.venue || (paper.source ? paper.source.toUpperCase() : 'Academic Publication')}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center space-y-2">
              <FileText className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No papers explored yet. Search academic literature above to begin discovering research.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. BOTTOM BANNER: "Your AI research workspace" */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-slate-50 dark:from-[#151c2e] dark:via-[#192035] dark:to-[#131726] border border-indigo-100/90 dark:border-indigo-500/20 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Your AI research workspace
          </h3>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
          Discover related papers, trace citation ancestry, and ask evidence-backed questions using your locally indexed documents.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => setActiveTab('graph')}
            className="px-5 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            Explore graph
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-white/10 text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            Open AI assistant
          </button>
        </div>
      </div>

      {/* 7. FOOTER */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
        <div>ResearchRabbit AI • Open research, connected knowledge.</div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Local-first architecture</span>
        </div>
      </div>
    </div>
  );
};
