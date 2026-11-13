import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchFiltersBar, SCHOLARLY_PROVIDERS } from '../components/search/SearchFiltersBar';
import { SearchResultsList } from '../components/search/SearchResultsList';
import { Settings } from '../pages/Settings';
import { Paper } from '../../../shared/types';

const mockPaper: Paper = {
  id: 'test-paper-1',
  title: 'Attention Is All You Need',
  authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
  abstract: 'We propose a new simple network architecture, the Transformer...',
  year: 2017,
  citationCount: 95000,
  referenceCount: 38,
  fieldsOfStudy: ['Computer Science', 'Artificial Intelligence'],
  source: 'openalex',
  readingStatus: 'to-read',
  userRating: 5,
};

describe('Scholarly and AI Providers Frontend Suite', () => {
  it('renders all scholarly provider options in SearchFiltersBar and fires onChangeSource', () => {
    const handleChangeSource = vi.fn();
    render(
      <SearchFiltersBar
        show={true}
        fieldOfStudy="All Fields"
        source="all"
        openAccessOnly={false}
        sortBy="relevance"
        onChangeYearStart={vi.fn()}
        onChangeYearEnd={vi.fn()}
        onChangeMinCitations={vi.fn()}
        onChangeFieldOfStudy={vi.fn()}
        onChangeSource={handleChangeSource}
        onChangeOpenAccessOnly={vi.fn()}
        onChangeSortBy={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText(/Refine Search Filters & Scholarly Provider/i)).toBeInTheDocument();
    expect(screen.getByText(/Scholarly Engine/i)).toBeInTheDocument();

    const providerSelect = screen.getByDisplayValue(/All Providers/i);
    expect(providerSelect).toBeInTheDocument();

    // Verify all 5 providers are listed
    expect(screen.getByText(/OpenAlex \(CC0 Public Domain\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Crossref Works API/i)).toBeInTheDocument();
    expect(screen.getByText(/Semantic Scholar \(AI2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/arXiv Preprint Archive/i)).toBeInTheDocument();

    fireEvent.change(providerSelect, { target: { value: 'crossref' } });
    expect(handleChangeSource).toHaveBeenCalledWith('crossref');
  });

  it('renders cache hit badge and scholarly attribution legal disclosure in SearchResultsList', () => {
    const attributions = [
      'Scholarly metadata provided by OpenAlex (OurResearch) under CC0 Public Domain Dedication.',
      'Metadata retrieved via Crossref Works REST API.',
    ];

    render(
      <SearchResultsList
        papers={[mockPaper]}
        total={1}
        cached={true}
        queryTimeMs={15}
        attributions={attributions}
        loading={false}
        selectedPaperIds={[]}
      />
    );

    // Verify cache hit indicator
    expect(screen.getByText(/Cached/i)).toBeInTheDocument();
    expect(screen.getByText(/\(15ms\)/i)).toBeInTheDocument();

    // Verify paper title
    expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument();

    // Verify legal attribution disclosure
    expect(screen.getByText(/Academic Source Attribution & Terms of Service/i)).toBeInTheDocument();
    expect(screen.getByText(/Scholarly metadata provided by OpenAlex/i)).toBeInTheDocument();
    expect(screen.getByText(/Metadata retrieved via Crossref Works REST API/i)).toBeInTheDocument();
  });

  it('renders Settings with Scholarly Metadata Integrations, AI Reasoning Engine, and DOI Resolver', async () => {
    render(<Settings />);

    expect(screen.getByText(/Platform Settings & Intelligence Configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/Scholarly Metadata Integrations/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero Fake Results Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/Live DOI Metadata Resolver/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Reasoning Engine & Embeddings Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/Semantic Vector Embedding Providers/i)).toBeInTheDocument();
  });

  it('renders Ollama local model commands and free tier indicators in Settings', () => {
    render(<Settings />);
    expect(screen.getByText(/Local Ollama Model Commands \(Zero Cost\)/i)).toBeInTheDocument();
    expect(screen.getByText(/ollama pull qwen3:4b/i)).toBeInTheDocument();
    expect(screen.getByText(/ollama pull nomic-embed-text/i)).toBeInTheDocument();
  });
});
