import React, { useState, useRef, useEffect } from 'react';
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
  Copy,
  Check,
  BookOpen
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
  const [copiedBib, setCopiedBib] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isHighImpact = (paper.citationCount || 0) > 1000;
  const doiUrl = getDoiUrl(paper.doi);

  // Deduplicate collections by trimmed name for clean UI
  const uniqueCollections = React.useMemo(() => {
    const seen = new Set<string>();
    return collections.filter((col) => {
      const key = col.name?.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [collections]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCollectionMenuOpen(false);
      }
    };
    if (collectionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [collectionMenuOpen]);

  const handleCopyCitation = (e: React.MouseEvent) => {
    e.stopPropagation();
    const citeString = `${formatAuthors(paper.authors, 3)} (${paper.year || 'n.d.'}). ${paper.title}. ${paper.venue || 'Scholarly Publication'}.${paper.doi ? ` https://doi.org/${paper.doi}` : ''}`;
    navigator.clipboard?.writeText(citeString);
    setCopiedBib(true);
    setTimeout(() => setCopiedBib(false), 2000);
  };

  return (
    <article
      className={`group relative rounded-2xl border transition-all duration-200 p-4 sm:p-5 ${
        isSelected
          ? 'bg-indigo-50/50 dark:bg-indigo-950/25 border-indigo-400 dark:border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
          : 'bg-white dark:bg-[#171c28] border-slate-200/90 dark:border-white/10 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:shadow-md'
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
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer transition-transform group-hover:scale-105"
              aria-label={`Select paper ${paper.title}`}
            />
          </div>
        )}

        {/* Main Paper Content */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Metadata badges row */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {paper.year && (
              <Badge variant="default" size="xs">
                {paper.year}
              </Badge>
            )}

            {paper.venue && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-[#202736] text-slate-700 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-white/5 text-[11px] truncate max-w-[220px]">
                {paper.venue}
              </span>
            )}

            {/* Citations Count */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-transform ${
                isHighImpact
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.12)]'
                  : 'bg-slate-100 dark:bg-[#202736] text-slate-600 dark:text-slate-400'
              }`}
            >
              {isHighImpact && <Flame className="w-3 h-3 text-amber-500 fill-amber-500 animate-pulse" />}
              <span>{formatCitations(paper.citationCount || 0)} citations</span>
            </span>

            {/* Source Badge */}
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
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
            className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer leading-snug"
          >
            {paper.title}
          </h3>

          {/* Authors */}
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {formatAuthors(paper.authors, 5)}
          </p>

          {/* AI TL;DR Summary */}
          {paper.tldr && !compact && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-transparent dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-transparent border border-indigo-200/60 dark:border-indigo-800/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2.5 shadow-2xs">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
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
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1f2637] text-slate-600 dark:text-slate-400 font-medium border border-slate-200/40 dark:border-white/5"
                >
                  {field}
                </span>
              ))}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between gap-2 flex-wrap text-xs">
            {/* Left buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {onOpenGraph && (
                <button
                  onClick={() => onOpenGraph(paper.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#202736] hover:bg-slate-50 dark:hover:bg-[#283246] text-slate-700 dark:text-slate-200 font-medium text-xs transition-all cursor-pointer shadow-2xs"
                  title="Explore Citation Graph"
                >
                  <Network className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Graph</span>
                </button>
              )}

              {onOpenAi && (
                <button
                  onClick={() => onOpenAi(paper)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#202736] hover:bg-slate-50 dark:hover:bg-[#283246] text-slate-700 dark:text-slate-200 font-medium text-xs transition-all cursor-pointer shadow-2xs"
                  title="Ask AI Assistant about this paper"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Ask AI</span>
                </button>
              )}

              {/* Copy Citation Button */}
              <button
                onClick={handleCopyCitation}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#202736] hover:bg-slate-50 dark:hover:bg-[#283246] text-slate-700 dark:text-slate-200 text-xs transition-all cursor-pointer shadow-2xs"
                title="Copy formatted citation"
              >
                {copiedBib ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedBib ? 'Copied' : 'Cite'}</span>
              </button>

              {/* Add to Collection Dropdown */}
              {onAddToCollection && uniqueCollections.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollectionMenuOpen(!collectionMenuOpen);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#202736] hover:bg-slate-50 dark:hover:bg-[#283246] text-slate-700 dark:text-slate-200 text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-slate-400" />
                    <span>Save</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {collectionMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1.5 w-60 max-h-60 overflow-y-auto bg-white dark:bg-[#1a2130] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 py-1 text-xs animate-in fade-in"
                    >
                      <div className="px-3 py-1 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider sticky top-0 bg-white dark:bg-[#1a2130] border-b border-slate-100 dark:border-white/5 pb-1">
                        Add to Collection
                      </div>
                      {uniqueCollections.map((col) => {
                        const isAlreadyInCollection = col.paperIds?.includes(paper.id);
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await onAddToCollection(col.id, paper.id);
                              setCollectionMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-200 truncate cursor-pointer transition-colors flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{col.name}</span>
                            {isAlreadyInCollection && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
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
                  className="text-[11px] bg-slate-50 dark:bg-[#202736] border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
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
                      className="cursor-pointer hover:scale-110 transition-transform"
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
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202736] transition-colors"
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
