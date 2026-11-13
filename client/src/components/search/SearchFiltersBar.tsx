import React from 'react';
import { RotateCcw } from 'lucide-react';

export const FIELDS_OF_STUDY = [
  'All Fields',
  'Computer Science',
  'Artificial Intelligence',
  'Natural Language Processing',
  'Computer Vision',
  'Biology',
  'Quantum Physics',
  'Medicine',
  'Mathematics',
];

export const SCHOLARLY_PROVIDERS = [
  { id: 'all', name: 'All Providers (Aggregated)' },
  { id: 'openalex', name: 'OpenAlex (CC0 Public Domain)' },
  { id: 'crossref', name: 'Crossref Works API' },
  { id: 'semantic_scholar', name: 'Semantic Scholar (AI2)' },
  { id: 'arxiv', name: 'arXiv Preprint Archive' },
];

interface SearchFiltersBarProps {
  show: boolean;
  yearStart?: number;
  yearEnd?: number;
  minCitations?: number;
  fieldOfStudy: string;
  source?: string;
  openAccessOnly: boolean;
  sortBy: 'relevance' | 'citations' | 'year';
  onChangeYearStart: (val?: number) => void;
  onChangeYearEnd: (val?: number) => void;
  onChangeMinCitations: (val?: number) => void;
  onChangeFieldOfStudy: (val: string) => void;
  onChangeSource?: (val: string) => void;
  onChangeOpenAccessOnly: (val: boolean) => void;
  onChangeSortBy: (val: 'relevance' | 'citations' | 'year') => void;
  onReset: () => void;
}

export const SearchFiltersBar: React.FC<SearchFiltersBarProps> = ({
  show,
  yearStart,
  yearEnd,
  minCitations,
  fieldOfStudy,
  source = 'all',
  openAccessOnly,
  sortBy,
  onChangeYearStart,
  onChangeYearEnd,
  onChangeMinCitations,
  onChangeFieldOfStudy,
  onChangeSource,
  onChangeOpenAccessOnly,
  onChangeSortBy,
  onReset,
}) => {
  if (!show) return null;

  return (
    <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Refine Search Filters & Scholarly Provider
        </span>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset all</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Year Range */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium">Publication Years</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Min (e.g. 2017)"
              value={yearStart || ''}
              onChange={(e) =>
                onChangeYearStart(e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              placeholder="Max"
              value={yearEnd || ''}
              onChange={(e) =>
                onChangeYearEnd(e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Min Citations */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium">Min. Citations</label>
          <input
            type="number"
            placeholder="e.g. 50"
            value={minCitations || ''}
            onChange={(e) =>
              onChangeMinCitations(e.target.value ? parseInt(e.target.value) : undefined)
            }
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Scholarly Provider */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium">Scholarly Engine</label>
          <select
            value={source}
            onChange={(e) => onChangeSource && onChangeSource(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer font-medium text-indigo-600 dark:text-indigo-400"
          >
            {SCHOLARLY_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Field of Study */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium">Discipline</label>
          <select
            value={fieldOfStudy}
            onChange={(e) => onChangeFieldOfStudy(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            {FIELDS_OF_STUDY.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium">Sort Order</label>
          <select
            value={sortBy}
            onChange={(e) => onChangeSortBy(e.target.value as any)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="relevance">Relevance (Hybrid Reranked)</option>
            <option value="citations">Citation Count (Highest First)</option>
            <option value="year">Publication Date (Newest First)</option>
          </select>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/50">
        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={openAccessOnly}
            onChange={(e) => onChangeOpenAccessOnly(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
          />
          <span>Open Access & Full-Text Available Only</span>
        </label>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
          Live queries respect rate limits, polite pools & terms of service
        </span>
      </div>
    </div>
  );
};
