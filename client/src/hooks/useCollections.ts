import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useResearchStore } from '../store/useResearchStore';
import { Collection } from '../../../shared/types';

export const useCollections = () => {
  const queryClient = useQueryClient();
  const { selectedCollectionId, setSelectedCollectionId, showToast } = useResearchStore();

  const { data: collections = [], isLoading } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: () => api.getCollections(),
  });

  const createCollection = useCallback(
    async (name: string, description: string) => {
      try {
        const col = await api.createCollection({ name, description });
        queryClient.invalidateQueries({ queryKey: ['collections'] });
        showToast(`Created collection "${name}"`);
        return col;
      } catch (err: any) {
        showToast(`Failed to create collection: ${err.message}`);
        throw err;
      }
    },
    [queryClient, showToast]
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      try {
        await api.deleteCollection(id);
        queryClient.invalidateQueries({ queryKey: ['collections'] });
        if (selectedCollectionId === id) {
          setSelectedCollectionId(null);
        }
        showToast('Collection deleted');
      } catch (err: any) {
        showToast(`Failed to delete collection: ${err.message}`);
        throw err;
      }
    },
    [queryClient, selectedCollectionId, setSelectedCollectionId, showToast]
  );

  const addPaperToCollection = useCallback(
    async (collectionId: string, paperId: string) => {
      try {
        await api.addPaperToCollection(collectionId, paperId);
        queryClient.invalidateQueries({ queryKey: ['collections'] });
        showToast('Paper saved to collection');
      } catch (err: any) {
        showToast(`Failed to add paper: ${err.message}`);
        throw err;
      }
    },
    [queryClient, showToast]
  );

  const removePaperFromCollection = useCallback(
    async (collectionId: string, paperId: string) => {
      try {
        await api.removePaperFromCollection(collectionId, paperId);
        queryClient.invalidateQueries({ queryKey: ['collections'] });
        showToast('Paper removed from collection');
      } catch (err: any) {
        showToast(`Failed to remove paper: ${err.message}`);
        throw err;
      }
    },
    [queryClient, showToast]
  );

  return {
    collections,
    isLoading,
    selectedCollectionId,
    setSelectedCollectionId,
    createCollection,
    deleteCollection,
    addPaperToCollection,
    removePaperFromCollection,
  };
};
