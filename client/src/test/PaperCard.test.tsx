import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PaperCard } from '../components/papers/PaperCard';
import { Paper } from '../../../shared/types';

const samplePaper: Paper = {
  id: 'paper-attention-2017',
  title: 'Attention Is All You Need',
  authors: [
    { name: 'Ashish Vaswani' },
    { name: 'Noam Shazeer' },
    { name: 'Niki Parmar' },
    { name: 'Jakob Uszkoreit' },
  ],
  abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...',
  year: 2017,
  venue: 'NeurIPS 2017',
  doi: '10.48550/arXiv.1706.03762',
  citationCount: 110450,
  referenceCount: 42,
  fieldsOfStudy: ['Computer Science', 'Artificial Intelligence', 'Natural Language Processing'],
  source: 'arxiv',
  openAccessPdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf',
  tldr: 'Introduces the Transformer architecture solely based on self-attention mechanisms without recurrence.',
};

describe('PaperCard Component', () => {
  it('renders title, year, venue, citation metrics and authors correctly', () => {
    render(<PaperCard paper={samplePaper} />);

    expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument();
    expect(screen.getByText('2017')).toBeInTheDocument();
    expect(screen.getByText('NeurIPS 2017')).toBeInTheDocument();
    expect(screen.getByText(/110.5k citations/i)).toBeInTheDocument();
    expect(screen.getByText(/Ashish Vaswani, Noam Shazeer/i)).toBeInTheDocument();
  });

  it('triggers onToggleSelect when selection checkbox is clicked', () => {
    const handleToggle = vi.fn();
    render(<PaperCard paper={samplePaper} isSelected={false} onToggleSelect={handleToggle} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(handleToggle).toHaveBeenCalledWith(samplePaper);
  });

  it('triggers onInspect when clicking paper title', () => {
    const handleInspect = vi.fn();
    render(<PaperCard paper={samplePaper} onInspect={handleInspect} />);

    fireEvent.click(screen.getByText('Attention Is All You Need'));
    expect(handleInspect).toHaveBeenCalledWith(samplePaper);
  });

  it('triggers onOpenGraph when graph button is clicked', () => {
    const handleGraph = vi.fn();
    render(<PaperCard paper={samplePaper} onOpenGraph={handleGraph} />);

    fireEvent.click(screen.getByRole('button', { name: /graph/i }));
    expect(handleGraph).toHaveBeenCalledWith(samplePaper.id);
  });
});
