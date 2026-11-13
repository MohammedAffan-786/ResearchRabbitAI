import React from 'react';
import { Paper, Collection } from '../../../../shared/types';
import { PaperCard } from '../papers/PaperCard';
import { SkeletonCardList } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { Search, Zap, ShieldCheck } from 'lucide-react';

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
    <div className="space-y-3.5">
      {/* Results Header Count, Cache Hit, & Batch Selection */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{papers.length}</strong>
            {total && total > papers.length ? ` of ${total.toLocaleString()}` : ''} verified scholarly papers
          </span>
          {typeof queryTimeMs === 'number' && (
            <span className="text-[11px] text-slate-400">({queryTimeMs}ms)</span>
          )}
          {cached && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Zap className="w-2.5 h-2.5" />
              Cached
            </span>
          )}
        </div>

        {onSelectAll && papers.length > 0 && (
          <button
            onClick={onSelectAll}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer"
          >
            Select all on this page
          </button>
        )}
      </div>

      {/* List of Paper Cards */}
      <div className="space-y-3">
        {papers.map((paper) => (
          <PaperCard
            key={paper.id}
            paper={paper}
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
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
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
