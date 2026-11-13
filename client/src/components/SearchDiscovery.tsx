import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  Network, 
  FolderPlus, 
  ExternalLink, 
  FileText, 
  Star, 
  Flame, 
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Paper, SearchFilters, SearchResult, Collection } from '../../../shared/types';
import { useResearchStore } from '../store/useResearchStore';

interface SearchDiscoveryProps {
  onSearch: (filters: SearchFilters) => Promise<void>;
  searchResult: SearchResult | null;
  loading: boolean;
  selectedPaperIds: string[];
  onToggleSelectPaper: (paper: Paper) => void;
  onOpenGraphWithSeed: (paperId: string) => void;
  onOpenAiWithPaper: (paper: Paper) => void;
  onInspectPaper: (paper: Paper) => void;
  collections: Collection[];
  onAddToCollection: (collectionId: string, paperId: string) => Promise<void>;
  onUpdatePaperStatus: (paperId: string, status: Paper['readingStatus']) => Promise<void>;
  onUpdatePaperRating: (paperId: string, rating: number) => Promise<void>;
}

const POPULAR_SEARCH_PRESETS = [
  'Attention Mechanisms in Transformers',
  'Latent Diffusion Models for Synthesis',
  'AlphaFold Protein Structure Prediction',
  'Reinforcement Learning from Human Feedback',
  'Quantum Computing Superconducting Qubits',
  'CRISPR-Cas9 Genome Editing'
];

const FIELDS_OF_STUDY = [
  'All Fields',
  'Computer Science',
  'Artificial Intelligence',
  'Natural Language Processing',
  'Computer Vision',
  'Biology',
  'Quantum Physics'
];

export const SearchDiscovery: React.FC<SearchDiscoveryProps> = ({
  onSearch,
  searchResult,
  loading,
  selectedPaperIds,
  onToggleSelectPaper,
  onOpenGraphWithSeed,
  onOpenAiWithPaper,
  onInspectPaper,
  collections,
  onAddToCollection,
  onUpdatePaperStatus,
  onUpdatePaperRating
}) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [yearStart, setYearStart] = useState<number | undefined>(undefined);
  const [yearEnd, setYearEnd] = useState<number | undefined>(undefined);
  const [minCitations, setMinCitations] = useState<number | undefined>(undefined);
  const [fieldOfStudy, setFieldOfStudy] = useState('All Fields');
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'citations' | 'year'>('relevance');
  const [activeCollectionDropdown, setActiveCollectionDropdown] = useState<string | null>(null);
  const { searchInitialQuery, setSearchInitialQuery } = useResearchStore();

  React.useEffect(() => {
    if (searchInitialQuery) {
      setQuery(searchInitialQuery);
      onSearch({
        query: searchInitialQuery,
        yearStart,
        yearEnd,
        minCitations,
        fieldOfStudy: fieldOfStudy === 'All Fields' ? undefined : fieldOfStudy,
        openAccessOnly,
        sortBy
      });
      setSearchInitialQuery('');
    }
  }, [searchInitialQuery]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch({
      query,
      yearStart,
      yearEnd,
      minCitations,
      fieldOfStudy: fieldOfStudy === 'All Fields' ? undefined : fieldOfStudy,
      openAccessOnly,
      sortBy
    });
  };

  const handleSelectPreset = (preset: string) => {
    setQuery(preset);
    onSearch({
      query: preset,
      yearStart,
      yearEnd,
      minCitations,
      fieldOfStudy: fieldOfStudy === 'All Fields' ? undefined : fieldOfStudy,
      openAccessOnly,
      sortBy
    });
  };

  const resetFilters = () => {
    setYearStart(undefined);
    setYearEnd(undefined);
    setMinCitations(undefined);
    setFieldOfStudy('All Fields');
    setOpenAccessOnly(false);
    setSortBy('relevance');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Search Header (Perplexity & Linear Style) */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Academic Discovery & Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Query across 250M+ research papers, trace citation graphs, and synthesize evidence with verified citations.
          </p>
        </div>

        {/* Query Input Card */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2 sm:p-2.5 shadow-xs transition-colors duration-150">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search research questions, paper titles, authors, DOIs, arXiv IDs..."
                className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                showFilters || minCitations || yearStart || openAccessOnly
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Search</span>
            </button>
          </form>

          {/* Preset Prompts Chips */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">Presets:</span>
            {POPULAR_SEARCH_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handleSelectPreset(preset)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in">
              {/* Year Range */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Publication Year</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="Min"
                    value={yearStart || ''}
                    onChange={(e) => setYearStart(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={yearEnd || ''}
                    onChange={(e) => setYearEnd(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Field of Study */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Field of Study</label>
                <select
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {FIELDS_OF_STUDY.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Sort & Minimum Citations</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    placeholder="Min Citations"
                    value={minCitations || ''}
                    onChange={(e) => setMinCitations(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="citations">Most Cited</option>
                    <option value="year">Newest</option>
                  </select>
                </div>
              </div>

              {/* Toggles & Reset */}
              <div className="flex flex-col justify-end gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={openAccessOnly}
                    onChange={(e) => setOpenAccessOnly(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>Open Access PDFs Only</span>
                </label>
                
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Results Header / Live Stats */}
      {searchResult && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {searchResult.totalResults} Papers Found
            </span>
            <span>•</span>
            <span>{searchResult.queryTimeMs}ms latency</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-medium text-slate-400">Sources:</span>
            {searchResult.sourceBreakdown.openalex > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-slate-700/60">
                OpenAlex: {searchResult.sourceBreakdown.openalex}
              </span>
            )}
            {searchResult.sourceBreakdown.arxiv > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-slate-700/60">
                arXiv: {searchResult.sourceBreakdown.arxiv}
              </span>
            )}
            {searchResult.sourceBreakdown.local > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-slate-700/60">
                Library: {searchResult.sourceBreakdown.local}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Results List (SaaS Card Layout) */}
      <div className="space-y-3">
        {searchResult?.papers.map((paper) => {
          const isSelected = selectedPaperIds.includes(paper.id);
          const isHighImpact = paper.citationCount >= 1000;

          return (
            <div
              key={paper.id}
              className={`bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border transition-all duration-150 ${
                isSelected 
                  ? 'border-indigo-500 dark:border-indigo-500 ring-1 ring-indigo-500/20 shadow-xs' 
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                
                {/* Selection Checkbox */}
                <button
                  onClick={() => onToggleSelectPaper(paper)}
                  className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 bg-white dark:bg-slate-800'
                  }`}
                  title={isSelected ? 'Remove from selection basket' : 'Add to selection basket for multi-paper synthesis'}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>

                {/* Main Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  
                  {/* Top Metadata Line */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                      {paper.year}
                    </span>

                    {paper.venue && (
                      <span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-medium border border-slate-200/60 dark:border-slate-700/60 text-[11px] truncate max-w-[200px]">
                        {paper.venue}
                      </span>
                    )}

                    {/* Citations Count */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                      isHighImpact
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {isHighImpact && <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />}
                      <span>{paper.citationCount.toLocaleString()} citations</span>
                    </span>

                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {paper.source}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 
                    onClick={() => onInspectPaper(paper)}
                    className="text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer leading-snug"
                  >
                    {paper.title}
                  </h2>

                  {/* Authors */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-normal">
                    {paper.authors.map(a => a.name).join(', ')}
                  </p>

                  {/* Executive Summary (TL;DR) */}
                  {paper.tldr && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-medium text-slate-900 dark:text-slate-100">AI Summary: </strong>
                        <span>{paper.tldr}</span>
                      </div>
                    </div>
                  )}

                  {/* Abstract Preview */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {paper.abstract}
                  </p>

                  {/* Fields of Study Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {paper.fieldsOfStudy.map((field) => (
                      <span
                        key={field}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
                      >
                        {field}
                      </span>
                    ))}
                  </div>

                  {/* Action Toolbar */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
                    
                    {/* Left Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      
                      {/* Citation Graph Button */}
                      <button
                        onClick={() => onOpenGraphWithSeed(paper.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.2 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                        title="Explore this paper's citation network in the Knowledge Graph"
                      >
                        <Network className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Citation Graph</span>
                      </button>

                      {/* AI Ask Button */}
                      <button
                        onClick={() => onOpenAiWithPaper(paper)}
                        className="flex items-center gap-1.5 px-2.5 py-1.2 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Ask AI</span>
                      </button>

                      {/* Add to Collection Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveCollectionDropdown(activeCollectionDropdown === paper.id ? null : paper.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.2 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                        >
                          <FolderPlus className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>Save to...</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {activeCollectionDropdown === paper.id && (
                          <div className="absolute left-0 bottom-full mb-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-1.5 z-20 space-y-1 animate-in fade-in">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                              Select Collection
                            </div>
                            {collections.map(col => (
                              <button
                                key={col.id}
                                onClick={async () => {
                                  await onAddToCollection(col.id, paper.id);
                                  setActiveCollectionDropdown(null);
                                }}
                                className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-700/80 flex items-center justify-between text-slate-700 dark:text-slate-300 cursor-pointer"
                              >
                                <span className="truncate">{col.name}</span>
                                {col.paperIds.includes(paper.id) && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* PDF Open Access Link */}
                      {paper.openAccessPdfUrl && (
                        <a
                          href={paper.openAccessPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.2 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-500" />
                          <span>PDF</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </a>
                      )}

                    </div>

                    {/* Right Reading Status & Star Rating */}
                    <div className="flex items-center gap-2.5">
                      
                      {/* Reading Status Selector */}
                      <select
                        value={paper.readingStatus || 'to-read'}
                        onChange={(e) => onUpdatePaperStatus(paper.id, e.target.value as any)}
                        className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="to-read">To Read</option>
                        <option value="reading">Reading</option>
                        <option value="completed">Completed</option>
                        <option value="starred">Starred</option>
                      </select>

                      {/* 5-Star Rating */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => onUpdatePaperRating(paper.id, star)}
                            className="cursor-pointer text-slate-300 dark:text-slate-600 hover:text-amber-400 transition-colors"
                          >
                            <Star 
                              className={`w-3.5 h-3.5 ${
                                (paper.userRating || 0) >= star 
                                  ? 'text-amber-400 fill-amber-400' 
                                  : 'text-slate-200 dark:text-slate-700'
                              }`} 
                            />
                          </button>
                        ))}
                      </div>

                    </div>

                  </div>

                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
