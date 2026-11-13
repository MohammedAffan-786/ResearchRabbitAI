import React from 'react';
import { Sparkles, Network, BookOpen, Download, X, Layers } from 'lucide-react';
import { Paper } from '../../../shared/types';

interface SelectedTrayProps {
  selectedPapers: Paper[];
  onClearSelection: () => void;
  onRemovePaper: (id: string) => void;
  onOpenAiWithSelection: () => void;
  onOpenGraphWithSelection: () => void;
  onGenerateLiteratureReview: () => void;
  onOpenExport: () => void;
}

export const SelectedTray: React.FC<SelectedTrayProps> = ({
  selectedPapers,
  onClearSelection,
  onRemovePaper,
  onOpenAiWithSelection,
  onOpenGraphWithSelection,
  onGenerateLiteratureReview,
  onOpenExport
}) => {
  if (selectedPapers.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-3xl bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md rounded-xl p-2.5 shadow-xl border border-slate-700/60 dark:border-slate-800 transition-all animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        
        {/* Left: Count & Chips */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full sm:max-w-xs w-full scrollbar-none">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold whitespace-nowrap">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>{selectedPapers.length} Selected</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {selectedPapers.slice(0, 2).map((p) => (
              <span 
                key={p.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] border border-slate-700 max-w-[120px] truncate"
                title={p.title}
              >
                <span className="truncate">{p.title}</span>
                <button 
                  onClick={() => onRemovePaper(p.id)}
                  className="hover:text-rose-400 cursor-pointer ml-0.5 text-slate-400"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {selectedPapers.length > 2 && (
              <span className="text-[11px] text-slate-400 font-medium px-0.5">
                +{selectedPapers.length - 2}
              </span>
            )}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end w-full sm:w-auto">
          <button
            onClick={onOpenAiWithSelection}
            className="flex items-center gap-1 px-2.5 py-1.2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Ask AI</span>
          </button>

          <button
            onClick={onOpenGraphWithSelection}
            className="flex items-center gap-1 px-2.5 py-1.2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            <Network className="w-3 h-3 text-indigo-400" />
            <span>Graph</span>
          </button>

          <button
            onClick={onGenerateLiteratureReview}
            className="flex items-center gap-1 px-2.5 py-1.2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            <BookOpen className="w-3 h-3 text-purple-400" />
            <span>Review</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1 px-2.5 py-1.2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-3 h-3 text-slate-400" />
            <span>Export</span>
          </button>

          <button
            onClick={onClearSelection}
            className="text-[11px] text-slate-400 hover:text-white px-1.5 py-1 transition-colors cursor-pointer"
            title="Deselect all"
          >
            Clear
          </button>
        </div>

      </div>
    </div>
  );
};
