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

  const executeSearch = (q: string) => {
    onSearch({
      query: q,
      yearStart,
      yearEnd,
      minCitations,
      fieldOfStudy: fieldOfStudy === 'All Fields' ? undefined : fieldOfStudy,
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Academic Discovery & Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Query across 250M+ research papers, trace citation graphs, and synthesize evidence with verified citations.
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
