import React, { useState } from 'react';
import { 
  FileCheck2, 
  CheckCircle2, 
  XCircle, 
  Download, 
  FileSpreadsheet, 
  BookOpen, 
  Plus, 
  ArrowRight
} from 'lucide-react';
import { Paper, PrismaProject, LiteratureReview } from '../../../shared/types';

interface PrismaReviewProps {
  papers: Paper[];
  prismaProjects: PrismaProject[];
  onCreateProject: (title: string, question: string) => Promise<void>;
  onScreenPaper: (projectId: string, paperId: string, stage: string, reason?: string) => Promise<void>;
  reviews: LiteratureReview[];
  onExportReview: (reviewId: string, format: 'markdown' | 'csv') => Promise<void>;
  onInspectPaper: (paper: Paper) => void;
}

export const PrismaReview: React.FC<PrismaReviewProps> = ({
  papers,
  prismaProjects,
  onCreateProject,
  onScreenPaper,
  reviews,
  onExportReview,
  onInspectPaper
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(prismaProjects[0]?.id || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [screeningFilter, setScreeningFilter] = useState<'all' | 'unscreened' | 'included' | 'excluded'>('all');
  const [exclusionReasonInput, setExclusionReasonInput] = useState('Out of scope / non-target methodology');
  const [activePaperToExclude, setActivePaperToExclude] = useState<string | null>(null);

  const activeProject = prismaProjects.find(p => p.id === activeProjectId) || prismaProjects[0] || null;

  // Compute PRISMA stats
  const records = activeProject?.records || [];
  const identifiedCount = papers.length;
  const screenedCount = records.length;
  const includedCount = records.filter(r => r.stage === 'included').length;
  const excludedCount = records.filter(r => r.stage === 'screened_out' || r.stage === 'excluded').length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await onCreateProject(newTitle, newQuestion);
    setNewTitle('');
    setNewQuestion('');
    setShowCreateModal(false);
  };

  const handleScreenAction = async (paperId: string, stage: 'included' | 'screened_out', reason?: string) => {
    if (!activeProject) return;
    await onScreenPaper(activeProject.id, paperId, stage, reason);
    setActivePaperToExclude(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {activeProject ? activeProject.title : 'Systematic Review Screening Workbench'}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-medium border border-slate-200/60 dark:border-slate-700/60">
              PRISMA 2020
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Research Protocol: <span className="text-slate-700 dark:text-slate-300 font-medium">{activeProject?.researchQuestion || 'Comparative empirical analysis across peer-reviewed publications.'}</span>
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-medium text-xs shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Review Project</span>
        </button>
      </div>

      {/* PRISMA 2020 Flow Diagram (Sleek Linear Style) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>PRISMA 2020 Protocol Flowchart</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-normal">Four-Stage Evidence Funnel</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch text-center">
          
          {/* Phase 1: Identification */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                1. Identification
              </span>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono mt-0.5">{identifiedCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Records Identified</p>
            </div>
            <div className="text-[10px] text-slate-400 bg-white dark:bg-slate-900 py-1 rounded border border-slate-200/60 dark:border-slate-800">
              Duplicates: 0
            </div>
          </div>

          {/* Phase 2: Screening */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                2. Screening
              </span>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono mt-0.5">{screenedCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Title & Abstract Evaluated</p>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 py-1 rounded border border-slate-200/60 dark:border-slate-800">
              Excluded: <strong className="text-rose-500">{excludedCount}</strong>
            </div>
          </div>

          {/* Phase 3: Eligibility */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                3. Eligibility
              </span>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono mt-0.5">{identifiedCount - excludedCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Full-Text Assessed</p>
            </div>
            <div className="text-[10px] text-slate-400 bg-white dark:bg-slate-900 py-1 rounded border border-slate-200/60 dark:border-slate-800">
              Criteria Verified
            </div>
          </div>

          {/* Phase 4: Included */}
          <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                4. Included
              </span>
              <p className="text-2xl font-semibold text-indigo-700 dark:text-indigo-300 font-mono mt-0.5">{includedCount}</p>
              <p className="text-xs text-indigo-900 dark:text-indigo-200 mt-0.5 font-medium">Included in Synthesis</p>
            </div>
            <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold bg-white dark:bg-slate-900 py-1 rounded border border-indigo-200 dark:border-indigo-800">
              Ready for Matrix
            </div>
          </div>

        </div>
      </div>

      {/* Screening Workbench */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Study Screening Workbench ({papers.length} Studies)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluate studies against inclusion and exclusion criteria with 1-click audit tracking.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            {(['all', 'unscreened', 'included', 'excluded'] as const).map(f => (
              <button
                key={f}
                onClick={() => setScreeningFilter(f)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium text-xs transition-all cursor-pointer ${
                  screeningFilter === f 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Papers Screening List */}
        <div className="space-y-3">
          {papers
            .filter(paper => {
              const rec = records.find(r => r.paperId === paper.id);
              if (screeningFilter === 'unscreened') return !rec;
              if (screeningFilter === 'included') return rec?.stage === 'included';
              if (screeningFilter === 'excluded') return rec?.stage === 'screened_out';
              return true;
            })
            .map(paper => {
              const record = records.find(r => r.paperId === paper.id);
              const isIncluded = record?.stage === 'included';
              const isExcluded = record?.stage === 'screened_out';

              return (
                <div
                  key={paper.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isIncluded
                      ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : isExcluded
                      ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/15 dark:bg-rose-950/15 opacity-70'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-semibold">
                          {paper.year}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                          {paper.authors.map(a => a.name).slice(0, 3).join(', ')}
                        </span>
                        {isIncluded && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Included</span>
                          </span>
                        )}
                        {isExcluded && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-semibold flex items-center gap-1 border border-rose-200/60 dark:border-rose-800/60">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Excluded: {record.exclusionReason}</span>
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => onInspectPaper(paper)}
                        className="text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                      >
                        {paper.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {paper.abstract}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleScreenAction(paper.id, 'included')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isIncluded
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Include</span>
                      </button>

                      <button
                        onClick={() => setActivePaperToExclude(paper.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isExcluded
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60'
                        }`}
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Exclude</span>
                      </button>
                    </div>

                  </div>

                  {/* Exclusion reason popup */}
                  {activePaperToExclude === paper.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap animate-in fade-in">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Reason:</span>
                      <select
                        value={exclusionReasonInput}
                        onChange={(e) => setExclusionReasonInput(e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Out of scope / non-target methodology">Out of scope / non-target methodology</option>
                        <option value="Missing empirical validation metrics">Missing empirical validation metrics</option>
                        <option value="Duplicate or superseded study">Duplicate or superseded study</option>
                        <option value="Non-English publication">Non-English publication</option>
                        <option value="Ineligible theoretical study">Ineligible theoretical study</option>
                      </select>
                      <button
                        onClick={() => handleScreenAction(paper.id, 'screened_out', exclusionReasonInput)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                      >
                        Confirm Exclude
                      </button>
                      <button
                        onClick={() => setActivePaperToExclude(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                </div>
              );
            })}
        </div>
      </div>

      {/* Evidence Extraction Table */}
      {reviews.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
                <span>Evidence Extraction Matrix ({reviews[0].synthesisMatrix.length} Studies)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                From review: "{reviews[0].title}"
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onExportReview(reviews[0].id, 'csv')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>CSV Matrix</span>
              </button>

              <button
                onClick={() => onExportReview(reviews[0].id, 'markdown')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
              >
                <BookOpen className="w-3 h-3" />
                <span>Export Markdown</span>
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  <th className="p-2.5">Paper</th>
                  <th className="p-2.5">Year</th>
                  <th className="p-2.5">Objective</th>
                  <th className="p-2.5">Methodology</th>
                  <th className="p-2.5">Key Findings</th>
                  <th className="p-2.5">Limitations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reviews[0].synthesisMatrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-slate-100 max-w-[180px]">
                      <div>{row.paperTitle}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{row.authors}</div>
                    </td>
                    <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400">{row.year}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300 max-w-[200px] leading-relaxed">{row.objective}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300 max-w-[200px] leading-relaxed">
                      <strong className="text-slate-900 dark:text-slate-100">{row.methodology}</strong>
                      <div className="text-[10px] text-slate-400 mt-0.5">{row.datasetOrSample}</div>
                    </td>
                    <td className="p-2.5 text-slate-700 dark:text-slate-300 max-w-[220px] leading-relaxed">{row.keyFindings}</td>
                    <td className="p-2.5 text-rose-600 dark:text-rose-400 max-w-[180px] leading-relaxed">{row.limitations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Project Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in space-y-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Start PRISMA Review</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set your target research question and screening protocol.
            </p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Review Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Systematic Review on Latent Diffusion Scaling"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Research Question</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. What empirical trade-offs exist between parameter scale and generation fidelity?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Create Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
