import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { SearchFilters, SearchResult } from '../../../shared/types';
import { useResearchStore } from '../store/useResearchStore';

export const useSearch = () => {
  const queryClient = useQueryClient();
  const { showToast } = useResearchStore();
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (filters: SearchFilters) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.search(filters);
        setSearchResult(res);
        queryClient.invalidateQueries({ queryKey: ['papers'] });
        return res;
      } catch (err: any) {
        const msg = err.message || 'Search execution failed';
        setError(msg);
        showToast(`Search failed: ${msg}`);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [queryClient, showToast]
  );

  return {
    searchResult,
    setSearchResult,
    loading,
    error,
    search,
  };
};
