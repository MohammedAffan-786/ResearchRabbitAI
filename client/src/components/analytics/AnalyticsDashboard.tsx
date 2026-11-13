import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { BarChart3, TrendingUp, Flame, BookOpen, Users, Award } from 'lucide-react';
import { useResearchStore } from '../../store/useResearchStore';

export interface AnalyticsDashboardProps {
  analyticsData: {
    citationsByYear: Array<{ year: number; citations: number; paperCount: number }>;
    fieldsDistribution: Array<{ field: string; count: number }>;
    impactBreakdown: Array<{ tier: string; count: number }>;
    topAuthors: Array<{ author: string; citations: number; papers: number }>;
    totalPapers: number;
    totalCitations: number;
  };
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ analyticsData }) => {
  const { theme } = useResearchStore();
  const isDark = theme === 'dark';

  const {
    citationsByYear = [],
    fieldsDistribution = [],
    impactBreakdown = [],
    topAuthors = [],
    totalPapers = 0,
    totalCitations = 0
  } = analyticsData || {};

  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const axisColor = isDark ? '#64748b' : '#94a3b8';
  const tooltipStyle = isDark
    ? { backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '10px', color: '#f8fafc', fontSize: '11px' }
    : { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '10px', color: '#0f172a', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Bibliographic Corpus Intelligence
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Real-time trajectory, disciplinary distributions, and author impact metrics across your research catalog.
        </p>
      </div>

      {/* KPI Stats Cards (Linear Style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Indexed Papers</span>
          </span>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-mono">{totalPapers}</p>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Catalog Corpus</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Total Citations</span>
          </span>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-mono">{totalCitations.toLocaleString()}</p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Verified Impact</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active Disciplines</span>
          </span>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-mono">{fieldsDistribution.length}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Fields of Study</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-purple-500" />
            <span>Seminal Authors</span>
          </span>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-mono">{topAuthors.length}</p>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Tracked Researchers</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Chart 1: Citation Trajectory (AreaChart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span>Citations by Publication Year</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-normal">Trajectory</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={citationsByYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="citationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="year" stroke={axisColor} fontSize={11} />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="citations" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#citationGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Disciplinary Distribution (BarChart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Publications by Field of Study</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-normal">Domain Breakdown</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fieldsDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="field" stroke={axisColor} fontSize={10} interval={0} angle={-15} textAnchor="end" height={40} />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Citation Impact Tiers (PieChart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Citation Impact Tiers</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-normal">Influence Distribution</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={impactBreakdown}
                  dataKey="count"
                  nameKey="tier"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={3}
                  label={((props: any) => `${props.tier}: ${props.count}`) as any}
                  fontSize={10}
                >
                  {impactBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table: Seminal Authors Leaderboard */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <span>Top Cited Authors in Library</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-normal">Ranked by Citations</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                  <th className="py-2">Author</th>
                  <th className="py-2 text-center">Studies</th>
                  <th className="py-2 text-right">Total Citations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topAuthors.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span>{item.author}</span>
                    </td>
                    <td className="py-2 text-center font-normal text-slate-500 dark:text-slate-400">{item.papers}</td>
                    <td className="py-2 text-right font-mono font-medium text-indigo-600 dark:text-indigo-400">
                      {item.citations.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
