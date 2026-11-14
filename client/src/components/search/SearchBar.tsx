import React, { useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, Loader2, Sparkles, X, Command, Zap } from 'lucide-react';

export const POPULAR_SEARCH_PRESETS = [
  'Attention Mechanisms in Transformers',
  'Latent Diffusion Models for Synthesis',
  'AlphaFold Protein Structure Prediction',
  'Reinforcement Learning from Human Feedback',
  'Quantum Computing Superconducting Qubits',
  'CRISPR-Cas9 Genome Editing',
];

const PRESET_DOT_COLORS = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-pink-500',
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey: press '/' or 'Cmd+K' / 'Ctrl+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative rounded-2xl bg-white/95 dark:bg-[#161b26]/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.36)] p-2.5 sm:p-3 transition-all duration-200 focus-within:border-indigo-500/60 focus-within:ring-4 focus-within:ring-indigo-500/10">
      
      {/* Search Input Bar */}
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-3.5 flex items-center justify-center pointer-events-none">
            {loading ? (
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-16 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-normal"
          />

          {/* Quick Clear & Keyboard Shortcut Pill */}
          <div className="absolute right-2 flex items-center gap-1.5">
            {query && (
              <button
                type="button"
                onClick={() => onChangeQuery('')}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222938] transition cursor-pointer"
                title="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#1c2230] border border-slate-200 dark:border-white/10 rounded-md select-none">
              /
            </kbd>
          </div>
        </div>

        {/* Filter Toggle Button */}
        <button
          type="button"
          onClick={onToggleFilters}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            showFilters || hasActiveFilters
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs'
              : 'border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-[#222938] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2c3548]'
          }`}
          title="Toggle search filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          )}
        </button>

        {/* Submit Search Button */}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold transition-all shadow-xs shadow-indigo-500/20 active:scale-[0.98] cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span>Search</span>
        </button>
      </form>

      {/* Preset Prompts Chips with High-End Color Dots */}
      {onSelectPreset && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/[0.08] flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Popular Queries:</span>
          </span>
          {POPULAR_SEARCH_PRESETS.map((preset, idx) => (
            <button
              key={preset}
              onClick={() => onSelectPreset(preset)}
              className="group inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-[#1c2230]/80 hover:bg-slate-200/80 dark:hover:bg-[#242c3e] text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer shadow-2xs"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${PRESET_DOT_COLORS[idx % PRESET_DOT_COLORS.length]} shrink-0 group-hover:scale-125 transition-transform`} />
              <span className="truncate max-w-[200px] sm:max-w-none">{preset}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
