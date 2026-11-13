import React from 'react';
import { Filter, Network, Sparkles, Users } from 'lucide-react';

interface GraphFilterDrawerProps {
  edgeFilter: 'all' | 'cites' | 'semantic' | 'author';
  onChangeEdgeFilter: (filter: 'all' | 'cites' | 'semantic' | 'author') => void;
  searchFilter: string;
  onChangeSearchFilter: (term: string) => void;
  nodeCount: number;
  edgeCount: number;
}

export const GraphFilterDrawer: React.FC<GraphFilterDrawerProps> = ({
  edgeFilter,
  onChangeEdgeFilter,
  searchFilter,
  onChangeSearchFilter,
  nodeCount,
  edgeCount,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md text-xs">
      {/* Node Search */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => onChangeSearchFilter(e.target.value)}
          placeholder="Filter nodes by title, author, field..."
          className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Edge Filter Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-400 font-medium">Edges:</span>
        <button
          onClick={() => onChangeEdgeFilter('all')}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            edgeFilter === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          All ({edgeCount})
        </button>
        <button
          onClick={() => onChangeEdgeFilter('cites')}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
            edgeFilter === 'cites'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
          }`}
        >
          <Network className="w-3 h-3" />
          <span>Verified Citations</span>
        </button>
        <button
          onClick={() => onChangeEdgeFilter('semantic')}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
            edgeFilter === 'semantic'
              ? 'bg-purple-600 text-white font-semibold shadow-xs'
              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>Semantic Similarity</span>
        </button>
        <button
          onClick={() => onChangeEdgeFilter('author')}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
            edgeFilter === 'author'
              ? 'bg-emerald-600 text-white font-semibold shadow-xs'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <Users className="w-3 h-3" />
          <span>Co-Authorship</span>
        </button>
      </div>

      {/* Network Stats */}
      <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 font-mono">
        <span>Nodes: {nodeCount}</span>
        <span>•</span>
        <span>Edges: {edgeCount}</span>
      </div>
    </div>
  );
};
