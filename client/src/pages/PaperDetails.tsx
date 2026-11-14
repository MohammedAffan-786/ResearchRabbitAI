import React, { useState, useEffect } from 'react';
import {
  FileText,
  Brain,
  Sparkles,
  Network,
  ExternalLink,
  Flame,
  ArrowLeft,
  Copy,
  Check,
  Tag,
  BookOpen,
} from 'lucide-react';
import { Paper, PaperIntelligence } from '../../../shared/types';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { formatAuthors, formatCitations, getDoiUrl } from '../utils/formatters';

interface PaperDetailsPageProps {
  paper: Paper | null;
  onBack?: () => void;
  onOpenGraphWithSeed?: (id: string) => void;
  onOpenAiWithPaper?: (paper: Paper) => void;
  onToggleSelectPaper?: (paper: Paper) => void;
  isSelected?: boolean;
}

export const PaperDetails: React.FC<PaperDetailsPageProps> = ({
  paper,
  onBack,
  onOpenGraphWithSeed,
  onOpenAiWithPaper,
  onToggleSelectPaper,
  isSelected = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'similar'>('overview');
  const [intelligence, setIntelligence] = useState<PaperIntelligence | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [copiedBib, setCopiedBib] = useState(false);
  const [similarData, setSimilarData] = useState<{
    earlierWork: Paper[];
    laterWork: Paper[];
    similarWork: Paper[];
  } | null>(null);

  useEffect(() => {
    if (!paper) return;
    const fetchPaperExtras = async () => {
      try {
        const res = await api.getPaper(paper.id);
        if (res.similar) setSimilarData(res.similar);
      } catch (e) {
        console.warn('Could not fetch similar literature', e);
      }
    };
    fetchPaperExtras();
  }, [paper]);

  const loadIntelligence = async () => {
    if (!paper || intelligence) return;
    setLoadingIntel(true);
    try {
      const res = await api.getPaperIntelligence(paper.id);
      if (res.intelligence) setIntelligence(res.intelligence);
    } catch (e) {
      console.warn('Could not fetch paper intelligence', e);
    } finally {
      setLoadingIntel(false);
    }
  };

  const handleTabChange = (tab: 'overview' | 'intelligence' | 'similar') => {
    setActiveTab(tab);
    if (tab === 'intelligence') loadIntelligence();
  };

  const handleCopyBib = async () => {
    if (!paper) return;
    try {
      const bib = await api.exportCitations([paper.id], 'bibtex');
      await navigator.clipboard.writeText(bib);
      setCopiedBib(true);
      setTimeout(() => setCopiedBib(false), 2000);
    } catch (e) {
      console.warn('Copy bib failed', e);
    }
  };

  if (!paper) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <EmptyState
          icon={FileText}
          title="No paper selected"
          description="Select a paper from the Discover tab, Library collections, or Citation graph to inspect comprehensive metadata and intelligence."
          actionLabel="Go to Search"
          onAction={onBack}
        />
      </div>
    );
  }

  const doiUrl = getDoiUrl(paper.doi);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      {/* Top back button & breadcrumbs */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to previous view</span>
        </button>
      )}

      {/* Main Paper Header Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {paper.year && <Badge variant="default">{paper.year}</Badge>}
          {paper.venue && (
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-xs">
              {paper.venue}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <Flame className="w-3.5 h-3.5 fill-amber-500" />
            <span>{formatCitations(paper.citationCount || 0)} citations</span>
          </span>
          {(paper.openAccessPdfUrl || (paper as any).pdfUrl || paper.isUploaded) && (
            <Badge variant="indigo" icon={<FileText className="w-3 h-3" />}>
              Full Text Available
            </Badge>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
          {paper.title}
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
          {formatAuthors(paper.authors, 10)}
        </p>

        {/* Action Toolbar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap text-xs">
          {onOpenGraphWithSeed && (
            <button
              onClick={() => onOpenGraphWithSeed(paper.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
            >
              <Network className="w-3.5 h-3.5 text-indigo-500" />
              <span>Explore Citation Graph</span>
            </button>
          )}

          {onOpenAiWithPaper && (
            <button
              onClick={() => onOpenAiWithPaper(paper)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Ask AI Assistant</span>
            </button>
          )}

          {onToggleSelectPaper && (
            <button
              onClick={() => onToggleSelectPaper(paper)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSelected ? 'In Basket' : 'Add to Basket'}</span>
            </button>
          )}

          <button
            onClick={handleCopyBib}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition-colors cursor-pointer"
          >
            {copiedBib ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedBib ? 'BibTeX Copied' : 'Copy BibTeX'}</span>
          </button>

          {(doiUrl || (paper as any).url || paper.openAccessPdfUrl) && (
            <a
              href={doiUrl || (paper as any).url || paper.openAccessPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Publisher Source</span>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
        <button
          onClick={() => handleTabChange('overview')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Overview & Abstract
        </button>

        <button
          onClick={() => handleTabChange('intelligence')}
          className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'intelligence'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Structured Intelligence (Module D)</span>
        </button>

        <button
          onClick={() => handleTabChange('similar')}
          className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'similar'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Connected Literature
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {paper.tldr && (
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Summary (AI TL;DR)</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {paper.tldr}
              </p>
            </div>
          )}

          <div className="p-5 rounded-2xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Abstract
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {paper.abstract || 'No abstract text available for this paper.'}
            </p>
          </div>

          {paper.fieldsOfStudy && paper.fieldsOfStudy.length > 0 && (
            <div className="p-4 rounded-xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Research Fields & Topics
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {paper.fieldsOfStudy.map((f) => (
                  <Badge key={f} variant="default" size="xs">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'intelligence' && (
        <div className="space-y-4">
          {loadingIntel ? (
            <div className="p-12 text-center">
              <LoadingSpinner label="Extracting structured intelligence across paper content..." />
            </div>
          ) : intelligence ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 space-y-1.5">
                <h4 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Research Objectives & Problem
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {intelligence.researchObjectives?.join('; ') || intelligence.problemStatement || 'Objectives extracted from introduction.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 space-y-1.5">
                <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  Methodology & Architectural Approach
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {intelligence.methodology || 'Methodology details from technical sections.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 space-y-1.5">
                <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Key Findings & Empirical Results
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {intelligence.keyFindings?.join('; ') || intelligence.experimentalResults || 'Reported quantitative benchmarks and findings.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 space-y-1.5">
                <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Identified Limitations & Future Directions
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {intelligence.limitations?.join('; ') || intelligence.futureDirections?.join('; ') || 'Critical appraisal and open research avenues.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <button
                onClick={loadIntelligence}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer shadow-xs"
              >
                Synthesize Structured Intelligence
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'similar' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#171c28] border border-slate-200/90 dark:border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Related Scholarly Works
            </h3>
            {similarData?.similarWork && similarData.similarWork.length > 0 ? (
              <div className="space-y-2">
                {similarData.similarWork.map((sim) => (
                  <div
                    key={sim.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {sim.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatAuthors(sim.authors, 2)} ({sim.year})
                      </p>
                    </div>
                    {onOpenGraphWithSeed && (
                      <button
                        onClick={() => onOpenGraphWithSeed(sim.id)}
                        className="px-2 py-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer flex-shrink-0"
                      >
                        Graph
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Connected literature will expand automatically as citations are traced.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperDetails;
