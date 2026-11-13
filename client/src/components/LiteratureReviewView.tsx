import React, { useState } from 'react';
import { 
  BookOpen, 
  Download, 
  Trash2, 
  Sparkles, 
  FileSpreadsheet, 
  Calendar,
  Layers
} from 'lucide-react';
import { LiteratureReview, Paper } from '../../../shared/types';

interface LiteratureReviewViewProps {
  reviews: LiteratureReview[];
  papers: Paper[];
  onDeleteReview: (id: string) => Promise<void>;
  onExportReview: (reviewId: string, format: 'markdown' | 'csv') => Promise<void>;
  onInspectPaper: (paper: Paper) => void;
}

export const LiteratureReviewView: React.FC<LiteratureReviewViewProps> = ({
  reviews,
  onDeleteReview,
  onExportReview
}) => {
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(reviews[0]?.id || null);

  const activeReview = reviews.find(r => r.id === selectedReviewId) || reviews[0] || null;

  if (reviews.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto text-xl border border-slate-200 dark:border-slate-700">
          📑
        </div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">No Literature Reviews Generated Yet</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Select papers from Discover or Collections and click <strong>"Synthesize Literature Review"</strong> in the AI Assistant or Selection Basket to generate a publication-ready review.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Review Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-slate-800">
        {reviews.map(r => {
          const isSelected = activeReview?.id === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedReviewId(r.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span className="truncate max-w-[200px]">{r.title}</span>
            </button>
          );
        })}
      </div>

      {activeReview && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 animate-in fade-in">
          
          {/* Header & Export Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[11px] font-semibold border border-indigo-200/50 dark:border-indigo-800/50">
                  Systematic Review
                </span>
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(activeReview.createdAt).toLocaleDateString()}</span>
                </span>
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Layers className="w-3 h-3" />
                  <span>{activeReview.paperIds.length} Studies</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {activeReview.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Core Topic: <span className="text-slate-700 dark:text-slate-300 font-medium">{activeReview.topic}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onExportReview(activeReview.id, 'markdown')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Markdown</span>
              </button>

              <button
                onClick={() => onExportReview(activeReview.id, 'csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
                <span>Export CSV Matrix</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Delete this literature review?')) {
                    onDeleteReview(activeReview.id);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Delete Review"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>Executive Synthesis Summary</span>
            </span>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
              {activeReview.executiveSummary}
            </p>
          </div>

          {/* Review Sections (Notion Style) */}
          <div className="space-y-5">
            {activeReview.sections.map((sec, idx) => (
              <div key={idx} className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  {sec.heading}
                </h2>
                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                  <p>{sec.content}</p>
                </div>

                {/* Section References */}
                {sec.citations && sec.citations.length > 0 && (
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-medium text-slate-400">Section References:</span>
                    {sec.citations.map((cite, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                      >
                        {cite.citeKey}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Evidence Extraction Matrix Table */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
              <span>Evidence Extraction Matrix</span>
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border-b border-slate-200/80 dark:border-slate-800">
                    <th className="p-2.5">Paper</th>
                    <th className="p-2.5">Year</th>
                    <th className="p-2.5">Objective</th>
                    <th className="p-2.5">Methodology</th>
                    <th className="p-2.5">Key Findings</th>
                    <th className="p-2.5">Limitations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeReview.synthesisMatrix.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-semibold text-slate-900 dark:text-slate-100 max-w-[180px]">
                        <div>{row.paperTitle}</div>
                        <div className="text-[10px] font-normal text-slate-400">{row.authors}</div>
                      </td>
                      <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400">{row.year}</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300 max-w-[200px] leading-relaxed">{row.objective}</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300 max-w-[200px] leading-relaxed">{row.methodology}</td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300 max-w-[220px] leading-relaxed">{row.keyFindings}</td>
                      <td className="p-2.5 text-rose-600 dark:text-rose-400 max-w-[180px] leading-relaxed">{row.limitations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
