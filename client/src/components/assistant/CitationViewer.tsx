import React from 'react';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { CitationItem } from '../../../../shared/types';
import { getDoiUrl } from '../../utils/formatters';

interface CitationViewerProps {
  citations: CitationItem[];
  onInspectPaper?: (paperId: string) => void;
}

export const CitationViewer: React.FC<CitationViewerProps> = ({
  citations,
  onInspectPaper,
}) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
      <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span>Grounded Evidence & Citations ({citations.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {citations.map((c, i) => {
          const doiUrl = (c as any).doi ? getDoiUrl((c as any).doi) : null;
          return (
            <div
              key={c.paperId || i}
              onClick={() => onInspectPaper?.(c.paperId)}
              className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1 cursor-pointer hover:border-indigo-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                  [{i + 1}] {c.title}
                </span>
                {doiUrl && (
                  <a
                    href={doiUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0"
                    title="External DOI Link"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {c.authors} {c.year ? `(${c.year})` : ''}
              </p>

              {c.quoteSnippet && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-2 pt-0.5">
                  "{c.quoteSnippet}"
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
