import React from 'react';
import { CollectionManager } from '../components/collections/CollectionManager';
import { Paper, Collection } from '../../../shared/types';

interface CollectionsPageProps {
  collections: Collection[];
  papers: Paper[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onCreateCollection: (name: string, description: string) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  onRemovePaperFromCollection: (collectionId: string, paperId: string) => Promise<void>;
  onInspectPaper: (paper: Paper) => void;
  onOpenGraphWithCollection: (collectionId: string) => void;
  onSynthesizeCollection: (collection: Collection) => void;
  onExportCollection: (collection: Collection) => void;
  onUpdatePaperStatus: (paperId: string, status: Paper['readingStatus']) => Promise<void>;
  onUpdatePaperRating: (paperId: string, rating: number) => Promise<void>;
  onUpdatePaperNotes: (paperId: string, notes: string) => Promise<void>;
}

export const Collections: React.FC<CollectionsPageProps> = (props) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in">
      <CollectionManager {...props} />
    </div>
  );
};

export default Collections;
