import React from 'react';
import { SearchInterface } from '../components/search/SearchInterface';
import { Paper, SearchFilters, SearchResult, Collection } from '../../../shared/types';

interface SearchPageProps {
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

export const Search: React.FC<SearchPageProps> = (props) => {
  return (
    <div className="animate-in fade-in">
      <SearchInterface {...props} />
    </div>
  );
};

export default Search;
