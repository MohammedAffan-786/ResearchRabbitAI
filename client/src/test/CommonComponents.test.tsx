import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSpinner } from '../components/common/LoadingState';

describe('Common UI Components Suite', () => {
  it('renders Badge with custom variants and icons', () => {
    render(<Badge variant="emerald">Verified Peer-Reviewed</Badge>);
    expect(screen.getByText('Verified Peer-Reviewed')).toBeInTheDocument();
  });

  it('renders Button with click handler and disabled loading state', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button variant="primary" onClick={handleClick}>
        Synthesize
      </Button>
    );

    const button = screen.getByRole('button', { name: /synthesize/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Re-render in loading state
    rerender(
      <Button variant="primary" isLoading onClick={handleClick}>
        Synthesize
      </Button>
    );
    expect(button).toBeDisabled();
  });

  it('renders EmptyState with action callbacks', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No Saved Collections"
        description="Create your first research folder to organize papers."
        actionLabel="Create Folder"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('No Saved Collections')).toBeInTheDocument();
    const actionBtn = screen.getByRole('button', { name: /create folder/i });
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders ErrorState with retry callback', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Ingestion Failed"
        message="PyMuPDF encountered corrupted byte stream"
        onRetry={handleRetry}
      />
    );

    expect(screen.getByText('Ingestion Failed')).toBeInTheDocument();
    expect(screen.getByText(/PyMuPDF encountered corrupted byte stream/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders LoadingSpinner with custom label', () => {
    render(<LoadingSpinner label="Extracting embedding vectors..." />);
    expect(screen.getByText('Extracting embedding vectors...')).toBeInTheDocument();
  });
});
