import React from 'react';
import { Search, SlidersHorizontal, Loader2, Sparkles } from 'lucide-react';

export const POPULAR_SEARCH_PRESETS = [
  'Attention Mechanisms in Transformers',
  'Latent Diffusion Models for Synthesis',
  'AlphaFold Protein Structure Prediction',
  'Reinforcement Learning from Human Feedback',
  'Quantum Computing Superconducting Qubits',
  'CRISPR-Cas9 Genome Editing',
];

interface SearchBarProps {
  query: string;
  onChangeQuery: (q: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  loading?: boolean;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters?: boolean;
  onSelectPreset?: (preset: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onChangeQuery,
  onSubmit,
  loading = false,
  showFilters,
  onToggleFilters,
  hasActiveFilters = false,
  onSelectPreset,
  placeholder = 'Search research questions, paper titles, authors, DOIs, arXiv IDs...',
}) => {
  return (
    <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2 sm:p-2.5 shadow-xs transition-colors duration-150">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onToggleFilters}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
            showFilters || hasActiveFilters
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
              : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle search filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          )}
        </button>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span>Search</span>
        </button>
      </form>

      {/* Preset Prompts Chips */}
      {onSelectPreset && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
            Presets:
          </span>
          {POPULAR_SEARCH_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => onSelectPreset(preset)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 transition-colors cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
