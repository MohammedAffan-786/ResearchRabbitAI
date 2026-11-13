import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';

describe('Error-State & Reliability Suite (Section 11 Testing Requirements)', () => {
  it('renders full card ErrorState with title, message, and retry button', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Vector Index Retrieval Failed"
        message="Unable to communicate with Qdrant collection at localhost:6333"
        onRetry={handleRetry}
      />
    );

    expect(screen.getByText('Vector Index Retrieval Failed')).toBeInTheDocument();
    expect(
      screen.getByText('Unable to communicate with Qdrant collection at localhost:6333')
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders compact ErrorState banner when compact prop is true', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        compact
        message="Rate limit exceeded on OpenAlex API. Backing off for 60 seconds."
        onRetry={handleRetry}
      />
    );

    expect(
      screen.getByText('Rate limit exceeded on OpenAlex API. Backing off for 60 seconds.')
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders EmptyState for 404 resource not found scenarios with recovery action', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="Paper Not Found"
        description="The requested DOI or arXiv ID does not exist in local cache or upstream scholarly registries."
        actionLabel="Search Global Catalog"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('Paper Not Found')).toBeInTheDocument();
    expect(
      screen.getByText(/the requested doi or arxiv id does not exist/i)
    ).toBeInTheDocument();

    const actionBtn = screen.getByRole('button', { name: /search global catalog/i });
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('displays 403 Forbidden boundary when user attempts unauthorized access to private collection', () => {
    const handleLoginRedirect = vi.fn();
    render(
      <ErrorState
        title="Access Forbidden (403)"
        message="You do not have permission to view this private collection. Please sign in with the collection owner's credentials."
        onRetry={handleLoginRedirect}
      />
    );

    expect(screen.getByText('Access Forbidden (403)')).toBeInTheDocument();
    expect(
      screen.getByText(/you do not have permission to view this private collection/i)
    ).toBeInTheDocument();
  });

  it('handles 429 Rate Limit Exceeded gracefully with warning banner', () => {
    render(
      <ErrorState
        compact
        message="Too many requests (429): Rate limiter active. Sliding window resets shortly."
      />
    );

    expect(
      screen.getByText(/too many requests \(429\): rate limiter active/i)
    ).toBeInTheDocument();
  });

  it('handles 500 Ingestion Pipeline Failure with retry capability', () => {
    const handleReingest = vi.fn();
    render(
      <ErrorState
        title="PDF Processing Failure (500)"
        message="PyMuPDF parser detected corrupted EOF marker in uploaded manuscript. Try re-uploading an uncompressed PDF."
        onRetry={handleReingest}
      />
    );

    expect(screen.getByText('PDF Processing Failure (500)')).toBeInTheDocument();
    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainBtn);
    expect(handleReingest).toHaveBeenCalledTimes(1);
  });
});
