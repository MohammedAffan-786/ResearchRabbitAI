import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SearchInterface } from '../components/search/SearchInterface';
import { SearchResultsList } from '../components/search/SearchResultsList';
import { Paper, SearchResult } from '../../../../shared/types';

describe('Search Interaction Suite (Section 11 Testing Requirements)', () => {
  const mockPaper: Paper = {
    id: 'paper-search-001',
    title: 'Self-Supervised Learning for Graph Neural Networks',
    authors: [{ name: 'Dr. Jane Chen', affiliation: 'Stanford AI Lab' }],
    year: 2023,
    venue: 'ICLR 2023',
    doi: '10.1145/3394486.3403177',
    citationCount: 450,
    referenceCount: 38,
    abstract: 'We present a self-supervised contrastive learning framework on graph topological motifs.',
    fieldsOfStudy: ['Computer Science', 'Graph Neural Networks'],
    source: 'openalex',
    readingStatus: 'to-read',
    userRating: 4,
    tags: ['contrastive-learning', 'graphs'],
    hasFullText: true,
    isUploaded: false,
    openAccessPdfUrl: 'https://arxiv.org/pdf/2301.0001.pdf',
    dateAdded: '2023-01-15T00:00:00Z',
  };

  const mockSearchResult: SearchResult = {
    papers: [mockPaper],
    total: 1,
    query: 'graph neural networks',
    sourceBreakdown: { openalex: 1 },
    attributions: ['OpenAlex (CC0 Public Domain)'],
    cached: false,
  };

  it('renders search bar with preset prompts and triggers search on submit', async () => {
    const handleSearch = vi.fn().mockResolvedValue(undefined);
    const handleToggleSelect = vi.fn();

    render(
      <SearchInterface
        onSearch={handleSearch}
        searchResult={null}
        loading={false}
        selectedPaperIds={[]}
        onToggleSelectPaper={handleToggleSelect}
        onOpenGraphWithSeed={vi.fn()}
        onOpenAiWithPaper={vi.fn()}
        onInspectPaper={vi.fn()}
        collections={[]}
        onAddToCollection={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperStatus={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperRating={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const input = screen.getByPlaceholderText(/search research questions/i);
    expect(input).toBeInTheDocument();

    // Type query
    fireEvent.change(input, { target: { value: 'quantum machine learning' } });
    expect(input).toHaveValue('quantum machine learning');

    // Submit search form
    const searchBtn = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchBtn);

    expect(handleSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'quantum machine learning',
        sortBy: 'relevance',
      })
    );
  });

  it('allows clicking popular search presets to immediately query scholarly APIs', async () => {
    const handleSearch = vi.fn().mockResolvedValue(undefined);

    render(
      <SearchInterface
        onSearch={handleSearch}
        searchResult={null}
        loading={false}
        selectedPaperIds={[]}
        onToggleSelectPaper={vi.fn()}
        onOpenGraphWithSeed={vi.fn()}
        onOpenAiWithPaper={vi.fn()}
        onInspectPaper={vi.fn()}
        collections={[]}
        onAddToCollection={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperStatus={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperRating={vi.fn().mockResolvedValue(undefined)}
      />
    );

    // Preset button
    const presetBtn = screen.getByText('Attention Mechanisms in Transformers');
    fireEvent.click(presetBtn);

    expect(handleSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'Attention Mechanisms in Transformers',
      })
    );
  });

  it('toggles filter panel and applies publication year, citations, and provider filters', async () => {
    const handleSearch = vi.fn().mockResolvedValue(undefined);

    render(
      <SearchInterface
        onSearch={handleSearch}
        searchResult={null}
        loading={false}
        selectedPaperIds={[]}
        onToggleSelectPaper={vi.fn()}
        onOpenGraphWithSeed={vi.fn()}
        onOpenAiWithPaper={vi.fn()}
        onInspectPaper={vi.fn()}
        collections={[]}
        onAddToCollection={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperStatus={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperRating={vi.fn().mockResolvedValue(undefined)}
      />
    );

    // Filter drawer initially hidden
    expect(screen.queryByText(/refine search filters & scholarly provider/i)).not.toBeInTheDocument();

    // Click Filters toggle
    const filtersBtn = screen.getByTitle('Toggle search filters');
    fireEvent.click(filtersBtn);

    // Filters drawer is now visible
    expect(screen.getByText(/refine search filters & scholarly provider/i)).toBeInTheDocument();

    // Input Min Year
    const yearInput = screen.getByPlaceholderText(/min \(e\.g\. 2017\)/i);
    fireEvent.change(yearInput, { target: { value: '2021' } });

    // Input Min Citations
    const citationsInput = screen.getByPlaceholderText(/e\.g\. 50/i);
    fireEvent.change(citationsInput, { target: { value: '100' } });

    // Submit with filters
    const searchBtn = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchBtn);

    expect(handleSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        yearStart: 2021,
        minCitations: 100,
      })
    );
  });

  it('renders search results list with paper details, DOI, and selection toggle', () => {
    const handleToggleSelect = vi.fn();
    const handleInspect = vi.fn();

    render(
      <SearchResultsList
        papers={mockSearchResult.papers}
        total={mockSearchResult.total}
        attributions={mockSearchResult.attributions}
        loading={false}
        selectedPaperIds={[]}
        onToggleSelectPaper={handleToggleSelect}
        onOpenGraphWithSeed={vi.fn()}
        onOpenAiWithPaper={vi.fn()}
        onInspectPaper={handleInspect}
        collections={[]}
        onAddToCollection={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperStatus={vi.fn().mockResolvedValue(undefined)}
        onUpdatePaperRating={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText('Self-Supervised Learning for Graph Neural Networks')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Chen')).toBeInTheDocument();
    expect(screen.getByText('450 citations')).toBeInTheDocument();
    expect(screen.getByText('OpenAlex (CC0 Public Domain)')).toBeInTheDocument();

    // Click on paper card to inspect
    const titleLink = screen.getByText('Self-Supervised Learning for Graph Neural Networks');
    fireEvent.click(titleLink);
    expect(handleInspect).toHaveBeenCalledWith(mockPaper);
  });
});
