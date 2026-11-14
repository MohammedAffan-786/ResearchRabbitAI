import React, { useState, useEffect } from 'react';
import { Paper, SearchFilters, SearchResult, Collection } from '../../../../shared/types';
import { SearchBar } from './SearchBar';
import { SearchFiltersBar } from './SearchFiltersBar';
import { SearchResultsList } from './SearchResultsList';
import { useResearchStore } from '../../store/useResearchStore';

export interface SearchInterfaceProps {
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

export const SearchInterface: React.FC<SearchInterfaceProps> = ({
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
  onUpdatePaperRating,
}) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [yearStart, setYearStart] = useState<number | undefined>(undefined);
  const [yearEnd, setYearEnd] = useState<number | undefined>(undefined);
  const [minCitations, setMinCitations] = useState<number | undefined>(undefined);
  const [fieldOfStudy, setFieldOfStudy] = useState('All Fields');
  const [source, setSource] = useState('all');
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'citations' | 'year'>('relevance');

  const { searchInitialQuery, setSearchInitialQuery, toggleSelectPaper } = useResearchStore();

  useEffect(() => {
    if (searchInitialQuery) {
      setQuery(searchInitialQuery);
      onSearch({
        query: searchInitialQuery,
        yearStart,
        yearEnd,
        minCitations,
        fieldOfStudy: fieldOfStudy === 'All Fields' ? undefined : fieldOfStudy,
        source: source === 'all' ? undefined : (source as any),
        openAccessOnly,
        sortBy,
      });
      setSearchInitialQuery('');
    }
  }, [searchInitialQuery]);

  const executeSearch = (q: string, overrideField?: string) => {
    const targetField = overrideField !== undefined ? overrideField : fieldOfStudy;
    onSearch({
      query: q,
      yearStart,
      yearEnd,
      minCitations,
      fieldOfStudy: targetField === 'All Fields' ? undefined : targetField,
      source: source === 'all' ? undefined : (source as any),
      openAccessOnly,
      sortBy,
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(query);
  };

  const handleSelectPreset = (preset: string) => {
    setQuery(preset);
    executeSearch(preset);
  };

  const handleQuickFieldSelect = (f: string) => {
    setFieldOfStudy(f);
    executeSearch(query, f);
  };

  const resetFilters = () => {
    setYearStart(undefined);
    setYearEnd(undefined);
    setMinCitations(undefined);
    setFieldOfStudy('All Fields');
    setSource('all');
    setOpenAccessOnly(false);
    setSortBy('relevance');
  };

  const hasActiveFilters = Boolean(
    yearStart || yearEnd || minCitations || (fieldOfStudy && fieldOfStudy !== 'All Fields') || source !== 'all' || openAccessOnly
  );

  const papers = searchResult?.papers || [];

  const handleSelectAll = () => {
    papers.forEach((p) => {
      if (!selectedPaperIds.includes(p.id)) {
        toggleSelectPaper(p.id);
      }
    });
  };

  const QUICK_FIELDS = ['All Fields', 'Computer Science', 'Medicine', 'Biology', 'Physics', 'Mathematics'];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Academic Literature Search
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Search across 250M+ verified research papers, trace citations, and explore scholarly literature.
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          query={query}
          onChangeQuery={setQuery}
          onSubmit={handleSubmit}
          loading={loading}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          hasActiveFilters={hasActiveFilters}
          onSelectPreset={handleSelectPreset}
        />

        {/* Quick Discipline Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 px-1">
            Disciplines:
          </span>
          {QUICK_FIELDS.map((f) => {
            const isActive = fieldOfStudy === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => handleQuickFieldSelect(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-white/80 dark:bg-[#181e2b] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/80 dark:border-white/5 hover:border-indigo-500/30'
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Collapsible Filter Panel */}
        <SearchFiltersBar
          show={showFilters}
          yearStart={yearStart}
          yearEnd={yearEnd}
          minCitations={minCitations}
          fieldOfStudy={fieldOfStudy}
          source={source}
          openAccessOnly={openAccessOnly}
          sortBy={sortBy}
          onChangeYearStart={setYearStart}
          onChangeYearEnd={setYearEnd}
          onChangeMinCitations={setMinCitations}
          onChangeFieldOfStudy={setFieldOfStudy}
          onChangeSource={setSource}
          onChangeOpenAccessOnly={setOpenAccessOnly}
          onChangeSortBy={setSortBy}
          onReset={resetFilters}
        />
      </div>

      {/* Results Section */}
      <SearchResultsList
        papers={papers}
        total={searchResult?.totalResults}
        cached={searchResult?.cached}
        queryTimeMs={searchResult?.queryTimeMs}
        attributions={searchResult?.attributions}
        loading={loading}
        selectedPaperIds={selectedPaperIds}
        onToggleSelectPaper={onToggleSelectPaper}
        onInspectPaper={onInspectPaper}
        onOpenGraphWithSeed={onOpenGraphWithSeed}
        onOpenAiWithPaper={onOpenAiWithPaper}
        collections={collections}
        onAddToCollection={onAddToCollection}
        onUpdatePaperStatus={onUpdatePaperStatus}
        onUpdatePaperRating={onUpdatePaperRating}
        onSelectAll={handleSelectAll}
      />
    </div>
  );
};
