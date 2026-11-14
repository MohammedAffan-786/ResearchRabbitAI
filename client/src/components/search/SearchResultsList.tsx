import React, { useState } from 'react';
import { Paper, Collection } from '../../../../shared/types';
import { PaperCard } from '../papers/PaperCard';
import { SkeletonCardList } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { Search, Zap, ShieldCheck, LayoutGrid, List, CheckSquare } from 'lucide-react';

interface SearchResultsListProps {
  papers: Paper[];
  total?: number;
  cached?: boolean;
  queryTimeMs?: number;
  attributions?: string[];
  loading: boolean;
  selectedPaperIds: string[];
  onToggleSelectPaper?: (paper: Paper) => void;
  onInspectPaper?: (paper: Paper) => void;
  onOpenGraphWithSeed?: (paperId: string) => void;
  onOpenAiWithPaper?: (paper: Paper) => void;
  collections?: Collection[];
  onAddToCollection?: (collectionId: string, paperId: string) => Promise<void>;
  onUpdatePaperStatus?: (paperId: string, status: Paper['readingStatus']) => Promise<void>;
  onUpdatePaperRating?: (paperId: string, rating: number) => Promise<void>;
  onSelectAll?: () => void;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  papers,
  total,
  cached,
  queryTimeMs,
  attributions,
  loading,
  selectedPaperIds,
  onToggleSelectPaper,
  onInspectPaper,
  onOpenGraphWithSeed,
  onOpenAiWithPaper,
  collections = [],
  onAddToCollection,
  onUpdatePaperStatus,
  onUpdatePaperRating,
  onSelectAll,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');

  if (loading) {
    return <SkeletonCardList count={4} />;
  }

  if (papers.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No research papers matched your search criteria"
        description="Try adjusting your keywords, selecting a different scholarly engine, or expanding your publication year filter."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Header Count, Cache Hit, View Switcher & Batch Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 p-2 sm:px-3 bg-white/70 dark:bg-[#161b26]/70 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Showing <strong className="font-bold text-slate-900 dark:text-white">{papers.length}</strong>
            {total && total > papers.length ? ` of ${total.toLocaleString()}` : ''} verified scholarly papers
          </span>

          {typeof queryTimeMs === 'number' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>({queryTimeMs}ms)</span>
            </span>
          )}

          {cached && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              <Zap className="w-2.5 h-2.5" />
              Cached
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-[#1c2230] p-0.5 rounded-lg border border-slate-200/60 dark:border-white/5">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1 rounded-md transition cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-[#252e42] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Detailed Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1 rounded-md transition cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-[#252e42] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Compact List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {onSelectAll && papers.length > 0 && (
            <button
              onClick={onSelectAll}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1c2230] hover:bg-slate-200 dark:hover:bg-[#242c3e] text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer text-xs"
            >
              <CheckSquare className="w-3 h-3 text-indigo-500" />
              <span>Select all on this page</span>
            </button>
          )}
        </div>
      </div>

      {/* List of Paper Cards */}
      <div className={viewMode === 'cards' ? 'space-y-3.5' : 'space-y-2'}>
        {papers.map((paper) => (
          <PaperCard
            key={paper.id}
            paper={paper}
            compact={viewMode === 'compact'}
            isSelected={selectedPaperIds.includes(paper.id)}
            onToggleSelect={onToggleSelectPaper}
            onInspect={onInspectPaper}
            onOpenGraph={onOpenGraphWithSeed}
            onOpenAi={onOpenAiWithPaper}
            collections={collections}
            onAddToCollection={onAddToCollection}
            onUpdateStatus={onUpdatePaperStatus}
            onUpdateRating={onUpdatePaperRating}
          />
        ))}
      </div>

      {/* Attribution & Legal Terms Compliance Footer */}
      {attributions && attributions.length > 0 && (
        <div className="mt-5 p-4 rounded-xl bg-slate-50/80 dark:bg-[#141824]/60 border border-slate-200/70 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Academic Source Attribution & Terms of Service</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5 leading-relaxed">
            {attributions.map((attr, idx) => (
              <li key={idx}>{attr}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
