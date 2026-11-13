import React, { useState } from 'react';
import {
  Sparkles,
  Network,
  FolderPlus,
  ExternalLink,
  Flame,
  Star,
  CheckCircle2,
  ChevronDown,
  Layers,
  FileText,
  Bookmark,
} from 'lucide-react';
import { Paper, Collection } from '../../../../shared/types';
import { Badge } from '../common/Badge';
import { formatAuthors, formatCitations, getDoiUrl } from '../../utils/formatters';

export interface PaperCardProps {
  paper: Paper;
  isSelected?: boolean;
  onToggleSelect?: (paper: Paper) => void;
  onInspect?: (paper: Paper) => void;
  onOpenGraph?: (paperId: string) => void;
  onOpenAi?: (paper: Paper) => void;
  collections?: Collection[];
  onAddToCollection?: (collectionId: string, paperId: string) => Promise<void>;
  onUpdateStatus?: (paperId: string, status: Paper['readingStatus']) => Promise<void>;
  onUpdateRating?: (paperId: string, rating: number) => Promise<void>;
  compact?: boolean;
}

export const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  isSelected = false,
  onToggleSelect,
  onInspect,
  onOpenGraph,
  onOpenAi,
  collections = [],
  onAddToCollection,
  onUpdateStatus,
  onUpdateRating,
  compact = false,
}) => {
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  const isHighImpact = (paper.citationCount || 0) > 1000;
  const doiUrl = getDoiUrl(paper.doi);

  return (
    <article
      className={`group relative rounded-xl border transition-all duration-150 p-4 sm:p-5 ${
        isSelected
          ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-700/80 shadow-xs'
          : 'bg-white dark:bg-[#0c121e] border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Selection Checkbox */}
        {onToggleSelect && (
          <div className="pt-0.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(paper)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              aria-label={`Select paper ${paper.title}`}
            />
          </div>
        )}

        {/* Main Paper Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Metadata badges row */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {paper.year && (
              <Badge variant="default" size="xs">
                {paper.year}
              </Badge>
            )}

            {paper.venue && (
              <span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-medium border border-slate-200/60 dark:border-slate-700/60 text-[11px] truncate max-w-[200px]">
                {paper.venue}
              </span>
            )}

            {/* Citations Count */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                isHighImpact
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {isHighImpact && <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />}
              <span>{formatCitations(paper.citationCount || 0)} citations</span>
            </span>

            {/* Source Badge */}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {paper.source || 'Scholar'}
            </span>

            {/* Relevance Score (if any) */}
            {typeof (paper as any).score === 'number' && (
              <Badge variant="emerald" size="xs">
                {((paper as any).score * 100).toFixed(0)}% match
              </Badge>
            )}

            {/* Ingested PDF or Open Access Indicator */}
            {(paper.openAccessPdfUrl || (paper as any).pdfUrl || paper.isUploaded) && (
              <Badge variant="indigo" size="xs" icon={<FileText className="w-3 h-3" />}>
                PDF Full Text
              </Badge>
            )}
          </div>

          {/* Paper Title */}
          <h3
            onClick={() => onInspect?.(paper)}
            className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer leading-snug"
          >
            {paper.title}
          </h3>

          {/* Authors */}
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {formatAuthors(paper.authors, 5)}
          </p>

          {/* AI TL;DR Summary */}
          {paper.tldr && !compact && (
            <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  AI Summary:{' '}
                </strong>
                <span>{paper.tldr}</span>
              </div>
            </div>
          )}

          {/* Abstract Preview */}
          {!compact && paper.abstract && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {paper.abstract}
            </p>
          )}

          {/* Fields of study chips */}
          {paper.fieldsOfStudy && paper.fieldsOfStudy.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {paper.fieldsOfStudy.slice(0, 4).map((field) => (
                <span
                  key={field}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
                >
                  {field}
                </span>
              ))}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
            {/* Left buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {onOpenGraph && (
                <button
                  onClick={() => onOpenGraph(paper.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                  title="Explore Citation Graph"
                >
                  <Network className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Graph</span>
                </button>
              )}

              {onOpenAi && (
                <button
                  onClick={() => onOpenAi(paper)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                  title="Ask AI Assistant about this paper"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Ask AI</span>
                </button>
              )}

              {/* Add to Collection Dropdown */}
              {onAddToCollection && collections.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setCollectionMenuOpen(!collectionMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Save</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {collectionMenuOpen && (
                    <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 py-1 text-xs animate-in fade-in">
                      <div className="px-3 py-1 font-semibold text-slate-400 text-[10px] uppercase">
                        Add to Collection
                      </div>
                      {collections.map((col) => (
                        <button
                          key={col.id}
                          onClick={async () => {
                            await onAddToCollection(col.id, paper.id);
                            setCollectionMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 truncate cursor-pointer"
                        >
                          {col.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Status / Links */}
            <div className="flex items-center gap-2">
              {/* Reading status indicator */}
              {onUpdateStatus && (
                <select
                  value={paper.readingStatus || 'unread'}
                  onChange={(e) => onUpdateStatus(paper.id, e.target.value as any)}
                  className="text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 text-slate-700 dark:text-slate-300 cursor-pointer"
                  title="Update reading status"
                >
                  <option value="unread">Unread</option>
                  <option value="reading">Reading</option>
                  <option value="completed">Completed</option>
                </select>
              )}

              {/* Star Rating */}
              {onUpdateRating && (
                <div className="flex items-center gap-0.5" title="Rate this paper">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => onUpdateRating(paper.id, star)}
                      className="cursor-pointer"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          (paper.userRating || 0) >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* External Link */}
              {(doiUrl || (paper as any).url || paper.openAccessPdfUrl) && (
                <a
                  href={doiUrl || (paper as any).url || paper.openAccessPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="View external publisher paper"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
