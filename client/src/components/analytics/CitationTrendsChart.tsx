import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useResearchStore } from '../../store/useResearchStore';

interface CitationTrendsChartProps {
  data: Array<{ year: number; citations: number; paperCount: number }>;
}

export const CitationTrendsChart: React.FC<CitationTrendsChartProps> = ({ data }) => {
  const { theme } = useResearchStore();
  const isDark = theme === 'dark';

  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = isDark
    ? {
        backgroundColor: '#171c28',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: '10px',
        color: '#f1f5f9',
        fontSize: '11px',
      }
    : {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderRadius: '10px',
        color: '#1e293b',
        fontSize: '11px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#171c28] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Citation Growth Trajectory
          </h2>
        </div>
        <span className="text-xs text-slate-400">Longitudinal citations by year</span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="year" stroke={axisColor} fontSize={11} tickLine={false} />
            <YAxis stroke={axisColor} fontSize={11} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="citations"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#trendGradient)"
              name="Citations"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
