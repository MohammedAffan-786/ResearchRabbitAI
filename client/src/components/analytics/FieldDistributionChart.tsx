import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BookOpen } from 'lucide-react';
import { useResearchStore } from '../../store/useResearchStore';

interface FieldDistributionChartProps {
  fieldsDistribution: Array<{ field: string; count: number }>;
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

export const FieldDistributionChart: React.FC<FieldDistributionChartProps> = ({
  fieldsDistribution,
}) => {
  const { theme } = useResearchStore();
  const isDark = theme === 'dark';

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
          <BookOpen className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Disciplinary Distribution
          </h2>
        </div>
        <span className="text-xs text-slate-400">Papers by field of study</span>
      </div>

      <div className="h-64 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={fieldsDistribution}
              dataKey="count"
              nameKey="field"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
            >
              {fieldsDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend chips */}
      <div className="flex items-center justify-center gap-3 flex-wrap text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
        {fieldsDistribution.slice(0, 5).map((f, i) => (
          <div key={f.field} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            <span className="text-slate-600 dark:text-slate-400">
              {f.field} ({f.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
