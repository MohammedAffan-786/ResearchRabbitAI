import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Network, 
  Layers, 
  Flame, 
  FileText, 
  Check, 
  Copy,
  ArrowUpRight,
  Brain,
  ShieldCheck,
  AlertCircle,
  Cpu,
  Target,
  Database,
  BarChart2,
  ListOrdered,
  Compass,
  Tag
} from 'lucide-react';
import { Paper, PaperIntelligence } from '../../../../shared/types';
import { api } from '../../services/api';

interface PaperDetailModalProps {
  paper: Paper | null;
  onClose: () => void;
  onOpenGraphWithSeed: (paperId: string) => void;
  onOpenAiWithPaper: (paper: Paper) => void;
  onToggleSelectPaper: (paper: Paper) => void;
  isSelected: boolean;
}

export const PaperDetailModal: React.FC<PaperDetailModalProps> = ({
  paper,
  onClose,
  onOpenGraphWithSeed,
  onOpenAiWithPaper,
  onToggleSelectPaper,
  isSelected
}) => {
  const [similarData, setSimilarData] = useState<{ earlierWork: Paper[]; laterWork: Paper[]; similarWork: Paper[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'sections' | 'similar'>('overview');
  const [intelligence, setIntelligence] = useState<PaperIntelligence | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [copiedBib, setCopiedBib] = useState(false);

  useEffect(() => {
    if (!paper) {
      setSimilarData(null);
      setIntelligence(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await api.getPaper(paper.id);
        if (res.similar) {
          setSimilarData(res.similar);
        }
      } catch (e) {
        console.warn('Could not fetch similar papers', e);
      }
    };

    fetchDetails();
  }, [paper]);

  const loadIntelligence = async () => {
    if (!paper || intelligence) return;
    setLoadingIntel(true);
    try {
      const res = await api.getPaperIntelligence(paper.id);
      if (res.intelligence) {
        setIntelligence(res.intelligence);
      }
    } catch (e) {
      console.warn('Could not fetch paper intelligence', e);
    } finally {
      setLoadingIntel(false);
    }
  };

  const handleTabChange = (tab: 'overview' | 'intelligence' | 'sections' | 'similar') => {
    setActiveTab(tab);
    if (tab === 'intelligence') {
      loadIntelligence();
    }
  };

  if (!paper) return null;

  const handleCopyBib = async () => {
    try {
      const bib = await api.exportCitations([paper.id], 'bibtex');
      navigator.clipboard.writeText(bib);
      setCopiedBib(true);
      setTimeout(() => setCopiedBib(false), 2000);
    } catch (e) {
      console.warn('Copy bib failed', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-[var(--border)] overflow-hidden animate-fadeIn">
        
        {/* Top Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-start justify-between gap-4 bg-[var(--canvas)]/40">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="px-2 py-0.5 rounded bg-[var(--canvas)] text-[var(--foreground)] border border-[var(--border)] text-[11px] font-mono font-medium">
                {paper.year}
              </span>
              <span className="text-xs text-[var(--muted)] font-medium">
                {paper.venue || 'Peer-Reviewed Literature'}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{paper.citationCount.toLocaleString()} verified citations</span>
              </span>
              {paper.source === 'upload' && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-medium">
                  Uploaded Document
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] leading-snug">
              {paper.title}
            </h2>

            <p className="text-xs text-[var(--muted)] truncate">
              {paper.authors.map(a => a.name).join(', ')}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] p-1.5 rounded-lg hover:bg-[var(--canvas)] cursor-pointer transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-4 px-5 border-b border-[var(--border)] text-xs font-medium bg-[var(--surface)]">
          <button
            onClick={() => handleTabChange('overview')}
            className={`py-2.5 border-b-2 transition cursor-pointer ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-500 font-semibold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            Overview & Abstract
          </button>

          <button
            onClick={() => handleTabChange('intelligence')}
            className={`py-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'intelligence'
                ? 'border-primary-500 text-primary-500 font-semibold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Structured Intelligence</span>
          </button>

          {paper.pdfExtracted?.sections && paper.pdfExtracted.sections.length > 0 && (
            <button
              onClick={() => handleTabChange('sections')}
              className={`py-2.5 border-b-2 transition cursor-pointer ${
                activeTab === 'sections'
                  ? 'border-primary-500 text-primary-500 font-semibold'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Extracted Sections ({paper.pdfExtracted.sections.length})
            </button>
          )}

          <button
            onClick={() => handleTabChange('similar')}
            className={`py-2.5 border-b-2 transition cursor-pointer ${
              activeTab === 'similar'
                ? 'border-primary-500 text-primary-500 font-semibold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            Connected Literature
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Executive Summary */}
              {paper.tldr && (
                <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] text-xs text-[var(--foreground)] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-primary-500 text-xs uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Executive Summary</span>
                  </div>
                  <p className="leading-relaxed font-normal">{paper.tldr}</p>
                </div>
              )}

              {/* Full Abstract */}
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Full Abstract
                </h3>
                <p className="text-xs sm:text-sm text-[var(--foreground)] leading-relaxed bg-[var(--canvas)] p-3.5 rounded-xl border border-[var(--border)]">
                  {paper.abstract}
                </p>
              </div>

              {/* Fields & External Identifiers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[var(--canvas)] rounded-xl border border-[var(--border)] space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-[var(--muted)]">Fields of Study</span>
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {paper.fieldsOfStudy.map(f => (
                      <span key={f} className="px-2 py-0.5 bg-[var(--surface)] rounded border border-[var(--border)] text-[11px] font-medium text-[var(--foreground)]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-[var(--canvas)] rounded-xl border border-[var(--border)] space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-[var(--muted)]">Identifiers & Links</span>
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {paper.doi && (
                      <a
                        href={`https://doi.org/${paper.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-[var(--surface)] rounded border border-[var(--border)] text-[var(--foreground)] text-[11px] font-mono hover:text-primary-500 flex items-center gap-1"
                      >
                        <span>DOI: {paper.doi}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )}
                    {paper.openAccessPdfUrl && (
                      <a
                        href={paper.openAccessPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-semibold flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Direct PDF</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'intelligence' && (
            <div className="space-y-4">
              {loadingIntel ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-[var(--muted)]">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing structured paper intelligence...</span>
                </div>
              ) : intelligence ? (
                <div className="space-y-4 text-xs">
                  {/* Status Banner: Full Text vs Abstract Only */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    intelligence.isAbstractOnly
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      {intelligence.isAbstractOnly ? (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold">
                          {intelligence.isAbstractOnly ? 'Abstract-Based Analysis' : 'Full-Text Verified Analysis'}
                        </span>
                        <p className="text-[11px] opacity-80">
                          {intelligence.isAbstractOnly
                            ? 'Insights synthesized from peer-reviewed abstract; upload or access open-access full-text for deep parameter extraction.'
                            : 'Verified from complete ingested manuscript sections and algorithmic descriptions.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 1. Problem Statement */}
                  <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1">
                    <h4 className="font-semibold text-primary-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      Problem Statement
                    </h4>
                    <p className="text-[var(--foreground)] leading-relaxed">{intelligence.problemStatement}</p>
                  </div>

                  {/* 2. Research Objectives */}
                  <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1.5">
                    <h4 className="font-semibold text-primary-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5" />
                      Research Objectives
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-[var(--foreground)] leading-relaxed">
                      {intelligence.researchObjectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 3. Methodology & Datasets Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1">
                      <h4 className="font-semibold text-indigo-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5" />
                        Methodology & Architecture
                      </h4>
                      <p className="text-[var(--foreground)] leading-relaxed">{intelligence.methodology}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1">
                      <h4 className="font-semibold text-purple-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" />
                        Datasets & Benchmarks
                      </h4>
                      <p className="text-[var(--foreground)] leading-relaxed">{intelligence.datasetUsed}</p>
                    </div>
                  </div>

                  {/* 4. Experimental Results */}
                  <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1">
                    <h4 className="font-semibold text-emerald-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5" />
                      Experimental Results & Quantitative Findings
                    </h4>
                    <p className="text-[var(--foreground)] leading-relaxed">{intelligence.experimentalResults}</p>
                  </div>

                  {/* 5. Key Findings */}
                  <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1.5">
                    <h4 className="font-semibold text-cyan-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Key Scientific Findings
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-[var(--foreground)] leading-relaxed">
                      {intelligence.keyFindings.map((finding, i) => (
                        <li key={i}>{finding}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 6. Limitations & Future Directions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1.5">
                      <h4 className="font-semibold text-rose-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Acknowledged Limitations
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-[var(--foreground)] leading-relaxed">
                        {intelligence.limitations.map((lim, i) => (
                          <li key={i}>{lim}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1.5">
                      <h4 className="font-semibold text-amber-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5" />
                        Future Research Directions
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-[var(--foreground)] leading-relaxed">
                        {intelligence.futureDirections.map((dir, i) => (
                          <li key={i}>{dir}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 7. Keywords */}
                  <div className="p-3 bg-[var(--canvas)] rounded-xl border border-[var(--border)] space-y-1.5">
                    <h4 className="font-semibold text-[var(--muted)] uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Tag className="w-3 h-3" />
                      Extracted Domain Keywords
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {intelligence.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[11px] font-medium text-[var(--foreground)]">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[var(--muted)] space-y-3">
                  <p>Structured intelligence has not been generated for this paper yet.</p>
                  <button
                    onClick={loadIntelligence}
                    className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium transition"
                  >
                    Generate Paper Intelligence
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sections' && paper.pdfExtracted && (
            <div className="space-y-3">
              {paper.pdfExtracted.sections.map((sec, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1">
                  <h4 className="font-semibold text-[var(--foreground)] text-xs sm:text-sm">{sec.title}</h4>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{sec.content}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'similar' && similarData && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Earlier Work (Antecedents)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {similarData.earlierWork.map(p => (
                    <div key={p.id} className="p-2.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] text-xs space-y-1">
                      <span className="px-1.5 py-0.5 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded text-[10px] font-mono">{p.year}</span>
                      <h5 className="font-semibold text-[var(--foreground)] line-clamp-1">{p.title}</h5>
                      <p className="text-[var(--muted)] line-clamp-2 text-[11px]">{p.tldr || p.abstract}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Subsequent Literature
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {similarData.laterWork.map(p => (
                    <div key={p.id} className="p-2.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] text-xs space-y-1">
                      <span className="px-1.5 py-0.5 bg-primary-500/10 text-primary-500 rounded text-[10px] font-mono">{p.year}</span>
                      <h5 className="font-semibold text-[var(--foreground)] line-clamp-1">{p.title}</h5>
                      <p className="text-[var(--muted)] line-clamp-2 text-[11px]">{p.tldr || p.abstract}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-3.5 px-5 border-t border-[var(--border)] bg-[var(--canvas)]/40 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onOpenGraphWithSeed(paper.id);
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--canvas)] border border-[var(--border)] text-[var(--foreground)] text-xs font-medium cursor-pointer transition"
            >
              <Network className="w-3.5 h-3.5 text-primary-500" />
              <span>Citation Graph</span>
            </button>

            <button
              onClick={() => {
                onOpenAiWithPaper(paper);
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--canvas)] border border-[var(--border)] text-[var(--foreground)] text-xs font-medium cursor-pointer transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              <span>Ask AI</span>
            </button>

            <button
              onClick={handleCopyBib}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--canvas)] border border-[var(--border)] text-[var(--foreground)] text-xs font-medium cursor-pointer transition"
            >
              {copiedBib ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBib ? 'BibTeX Copied' : 'BibTeX'}</span>
            </button>
          </div>

          <button
            onClick={() => onToggleSelectPaper(paper)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              isSelected
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-[var(--foreground)] text-[var(--canvas)] hover:opacity-90'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isSelected ? 'In Basket' : 'Add to Basket'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
