import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { useResearchStore } from '../store/useResearchStore';

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ResearchRabbit AI Frontend Suite', () => {
  it('renders the brand logo and navigation bar', () => {
    renderWithProviders(<App />);
    expect(screen.getAllByText('ResearchRabbit').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/FastAPI • Qdrant/).length).toBeGreaterThan(0);
  });

  it('renders dashboard search input and navigation tabs across sidebar and navbar', () => {
    renderWithProviders(<App />);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Discover').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Citation Graph').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Collections/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Analytics').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);

    // In Dashboard view
    expect(screen.getByPlaceholderText(/Ask any research question/i)).toBeInTheDocument();

    // Switch to Discover tab
    const discoverButtons = screen.getAllByText('Discover');
    act(() => {
      fireEvent.click(discoverButtons[0]);
    });
    expect(screen.getByPlaceholderText(/Search research questions/i)).toBeInTheDocument();
  });

  it('manages Zustand selection basket state and theme toggling', () => {
    const { toggleSelectPaper, clearSelection, toggleTheme } = useResearchStore.getState();
    expect(useResearchStore.getState().selectedPaperIds).toHaveLength(0);

    toggleSelectPaper('test-paper-1');
    expect(useResearchStore.getState().selectedPaperIds).toContain('test-paper-1');

    toggleSelectPaper('test-paper-1');
    expect(useResearchStore.getState().selectedPaperIds).toHaveLength(0);

    toggleSelectPaper('test-paper-2');
    clearSelection();
    expect(useResearchStore.getState().selectedPaperIds).toHaveLength(0);

    expect(useResearchStore.getState().theme).toBe('light');
    toggleTheme();
    expect(useResearchStore.getState().theme).toBe('light');
  });

  it('can navigate to the Settings page with hybrid search tuning', () => {
    renderWithProviders(<App />);
    const settingsButtons = screen.getAllByText('Settings');
    act(() => {
      fireEvent.click(settingsButtons[0]);
    });
    expect(screen.getByText(/Platform Settings & Intelligence Configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/Hybrid Search & Reranking Tuning/i)).toBeInTheDocument();
  });
});
