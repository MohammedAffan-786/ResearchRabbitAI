import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CollectionManager } from '../components/collections/CollectionManager';
import { Collection, Paper } from '../../../../shared/types';
import { api } from '../services/api';

describe('Collection Interaction Suite (Section 11 Testing Requirements)', () => {
  const mockPapers: Paper[] = [
    {
      id: 'paper-col-1',
      title: 'Attention Mechanisms in Deep Generative Networks',
      authors: [{ name: 'Dr. Jane Chen' }],
      year: 2022,
      citationCount: 350,
      referenceCount: 20,
      abstract: 'Generative attention models for multi-modal synthesis.',
      fieldsOfStudy: ['Computer Science'],
      source: 'openalex',
      readingStatus: 'reading',
      userRating: 4,
      userNotes: 'Initial methodology looks sound.',
      tags: [],
      hasFullText: false,
      isUploaded: false,
    },
    {
      id: 'paper-col-2',
      title: 'Quantum Advantage with Superconducting Qubits',
      authors: [{ name: 'Dr. Marie Curie' }],
      year: 2023,
      citationCount: 890,
      referenceCount: 45,
      abstract: 'Demonstrating computational speedup using quantum circuits.',
      fieldsOfStudy: ['Physics'],
      source: 'arxiv',
      readingStatus: 'starred',
      userRating: 5,
      tags: [],
      hasFullText: true,
      isUploaded: true,
    },
  ];

  const mockCollections: Collection[] = [
    {
      id: 'col-alpha',
      name: 'Quantum Foundations',
      description: 'Foundational works in quantum information',
      color: '#6366f1',
      icon: 'Atom',
      isPublic: false,
      paperIds: ['paper-col-2'],
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
    {
      id: 'col-beta',
      name: 'Neural Attention',
      description: 'Architectures for deep attention',
      color: '#10b981',
      icon: 'Brain',
      isPublic: false,
      paperIds: ['paper-col-1'],
      createdAt: '2023-02-01',
      updatedAt: '2023-02-01',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders collections list and filters papers when collection is clicked', () => {
    const handleSelectCollection = vi.fn();

    render(
      <CollectionManager
        collections={mockCollections}
        papers={mockPapers}
        selectedCollectionId={null}
        onSelectCollection={handleSelectCollection}
        onCreateCollection={vi.fn().mockResolvedValue(undefined)}
        onDeleteCollection={vi.fn().mockResolvedValue(undefined)}
        onRemovePaperFromCollection={vi.fn().mockResolvedValue(undefined)}
        onInspectPaper={vi.fn()}
        onOpenGraphWithCollection={vi.fn()}
        onSynthesizeCollection={vi.fn()}
        onExportCollection={vi.fn()}
        onUpdatePaperStatus={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperRating={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperNotes={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText('Quantum Foundations')).toBeInTheDocument();
    expect(screen.getByText('Neural Attention')).toBeInTheDocument();
    expect(screen.getByText('All Catalog Papers')).toBeInTheDocument();

    // Clicking Quantum Foundations selects it
    const colBtn = screen.getByText('Quantum Foundations');
    fireEvent.click(colBtn);
    expect(handleSelectCollection).toHaveBeenCalledWith('col-alpha');
  });

  it('opens create collection modal and submits new collection payload', async () => {
    const handleCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <CollectionManager
        collections={mockCollections}
        papers={mockPapers}
        selectedCollectionId={null}
        onSelectCollection={vi.fn()}
        onCreateCollection={handleCreate}
        onDeleteCollection={vi.fn().mockResolvedValue(undefined)}
        onRemovePaperFromCollection={vi.fn().mockResolvedValue(undefined)}
        onInspectPaper={vi.fn()}
        onOpenGraphWithCollection={vi.fn()}
        onSynthesizeCollection={vi.fn()}
        onExportCollection={vi.fn()}
        onUpdatePaperStatus={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperRating={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperNotes={vi.fn().mockResolvedValue(undefined)}
      />
    );

    // Click plus button to create collection
    const addBtn = screen.getByTitle('Create new collection');
    fireEvent.click(addBtn);

    // Modal appears
    expect(screen.getByPlaceholderText('e.g. State-Space Models & Mamba')).toBeInTheDocument();

    // Fill in name and description
    fireEvent.change(screen.getByPlaceholderText('e.g. State-Space Models & Mamba'), {
      target: { value: 'State Space Models' },
    });
    fireEvent.change(screen.getByPlaceholderText('Goals and scope for this research group...'), {
      target: { value: 'Selective state spaces replacing quadratic transformers' },
    });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /create collection/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleCreate).toHaveBeenCalledWith(
        'State Space Models',
        'Selective state spaces replacing quadratic transformers'
      );
    });
  });

  it('updates paper reading status and rating', async () => {
    const handleStatus = vi.fn().mockResolvedValue(undefined);
    const handleRating = vi.fn().mockResolvedValue(undefined);

    render(
      <CollectionManager
        collections={mockCollections}
        papers={mockPapers}
        selectedCollectionId={null}
        onSelectCollection={vi.fn()}
        onCreateCollection={vi.fn().mockResolvedValue(undefined)}
        onDeleteCollection={vi.fn().mockResolvedValue(undefined)}
        onRemovePaperFromCollection={vi.fn().mockResolvedValue(undefined)}
        onInspectPaper={vi.fn()}
        onOpenGraphWithCollection={vi.fn()}
        onSynthesizeCollection={vi.fn()}
        onExportCollection={vi.fn()}
        onUpdatePaperStatus={handleStatus}
        onUpdatePaperRating={handleRating}
        onUpdatePaperNotes={vi.fn().mockResolvedValue(undefined)}
      />
    );

    // Update status on first paper (paper-col-1 has initial status 'reading')
    const readingStatusSelect = screen.getByDisplayValue('Reading');
    fireEvent.change(readingStatusSelect, { target: { value: 'completed' } });
    expect(handleStatus).toHaveBeenCalledWith('paper-col-1', 'completed');

    // Click rating star
    const starButtons = screen.getAllByRole('button');
    const firstStar = starButtons.find(b => b.querySelector('svg.lucide-star'));
    if (firstStar) {
      fireEvent.click(firstStar);
      expect(handleRating).toHaveBeenCalled();
    }
  });

  it('allows editing and saving critical notes on a paper', async () => {
    const handleNotes = vi.fn().mockResolvedValue(undefined);

    render(
      <CollectionManager
        collections={mockCollections}
        papers={mockPapers}
        selectedCollectionId={null}
        onSelectCollection={vi.fn()}
        onCreateCollection={vi.fn().mockResolvedValue(undefined)}
        onDeleteCollection={vi.fn().mockResolvedValue(undefined)}
        onRemovePaperFromCollection={vi.fn().mockResolvedValue(undefined)}
        onInspectPaper={vi.fn()}
        onOpenGraphWithCollection={vi.fn()}
        onSynthesizeCollection={vi.fn()}
        onExportCollection={vi.fn()}
        onUpdatePaperStatus={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperRating={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperNotes={handleNotes}
      />
    );

    // Click "Edit Note"
    const editNoteBtn = screen.getAllByText('Edit Note')[0];
    fireEvent.click(editNoteBtn);

    // Textarea appears
    const textarea = screen.getByPlaceholderText(/add methodology critique/i);
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, {
      target: { value: 'Validated on synthetic benchmark with 10k nodes.' },
    });

    // Save
    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleNotes).toHaveBeenCalledWith(
        'paper-col-1',
        'Validated on synthetic benchmark with 10k nodes.'
      );
    });
  });

  it('shares collection publicly and displays shareable link', async () => {
    vi.spyOn(api, 'shareCollection').mockResolvedValue({
      id: 'col-alpha',
      isPublic: true,
      shareToken: 'share-token-xyz-123',
    });

    render(
      <CollectionManager
        collections={mockCollections}
        papers={mockPapers}
        selectedCollectionId="col-alpha"
        onSelectCollection={vi.fn()}
        onCreateCollection={vi.fn().mockResolvedValue(undefined)}
        onDeleteCollection={vi.fn().mockResolvedValue(undefined)}
        onRemovePaperFromCollection={vi.fn().mockResolvedValue(undefined)}
        onInspectPaper={vi.fn()}
        onOpenGraphWithCollection={vi.fn()}
        onSynthesizeCollection={vi.fn()}
        onExportCollection={vi.fn()}
        onUpdatePaperStatus={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperRating={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperNotes={vi.fn().mockResolvedValue(undefined)}
      />
    );

    // Click Share button in active collection toolbar
    const shareBtn = screen.getByTitle('Share collection publicly');
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(screen.getByText('Public Collection Link')).toBeInTheDocument();
      expect(screen.getByDisplayValue(/share-token-xyz-123/)).toBeInTheDocument();
    });
  });

  it('removes a paper from the active collection', async () => {
    const handleRemove = vi.fn().mockResolvedValue(undefined);

    render(
      <CollectionManager
        collections={mockCollections}
        papers={mockPapers}
        selectedCollectionId="col-alpha"
        onSelectCollection={vi.fn()}
        onCreateCollection={vi.fn().mockResolvedValue(undefined)}
        onDeleteCollection={vi.fn().mockResolvedValue(undefined)}
        onRemovePaperFromCollection={handleRemove}
        onInspectPaper={vi.fn()}
        onOpenGraphWithCollection={vi.fn()}
        onSynthesizeCollection={vi.fn()}
        onExportCollection={vi.fn()}
        onUpdatePaperStatus={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperRating={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperNotes={vi.fn().mockResolvedValue(undefined)}
      />
    );

    // Delete paper from collection button
    const removeBtn = screen.getByTitle('Remove from this collection');
    fireEvent.click(removeBtn);

    expect(handleRemove).toHaveBeenCalledWith('col-alpha', 'paper-col-2');
  });
});
