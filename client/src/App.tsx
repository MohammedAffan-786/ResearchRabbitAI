import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navbar, Sidebar, SelectionBasketBar } from './components/layout';
import {
  Dashboard,
  Search,
  ResearchGraph,
  Assistant,
  Collections,
  LiteratureReview,
  Analytics,
  Settings,
} from './pages';
import { ExportModal } from './components/ExportModal';
import { PdfUploadModal } from './components/papers/PdfUploadModal';
import { PaperDetailModal } from './components/papers/PaperDetailModal';
import { AuthModal } from './components/AuthModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { api } from './services/api';
import { useResearchStore } from './store/useResearchStore';
import { Paper, SearchFilters, SearchResult } from '../../shared/types';

export const App: React.FC = () => {
  const queryClient = useQueryClient();

  const {
    activeTab,
    setActiveTab,
    selectedPaperIds,
    toggleSelectPaper,
    removePaperFromBasket,
    clearSelection,
    selectedCollectionId,
    setSelectedCollectionId,
    toastMessage,
    showToast,
  } = useResearchStore();

  // Ensure light mode across <html> and <body>
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      try {
        localStorage.removeItem('rr_theme');
      } catch (e) {}
    }
  }, []);

  // Search state
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [inspectedPaper, setInspectedPaper] = useState<Paper | null>(null);

  // TanStack Queries for caching & real-time sync
  const { data: papersData } = useQuery({
    queryKey: ['papers'],
    queryFn: () => api.getPapers(),
  });

  const { data: collectionsData } = useQuery({
    queryKey: ['collections'],
    queryFn: () => api.getCollections(),
  });

  const { data: graphData } = useQuery({
    queryKey: ['graph'],
    queryFn: () => api.getGraph(),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => api.getReviews(),
  });

  const { data: prismaData } = useQuery({
    queryKey: ['prisma'],
    queryFn: () => api.getPrismaProjects(),
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.getAnalytics(),
  });

  const papers = papersData?.papers || [];
  const collections = collectionsData || [];
  const reviews = reviewsData || [];
  const prismaProjects = prismaData || [];
  const activeGraph = graphData || { nodes: [], links: [] };

  // Initial default search
  React.useEffect(() => {
    const runInitialSearch = async () => {
      try {
        const res = await api.search({ query: 'transformer attention' });
        setSearchResult(res);
      } catch (e) {
        console.warn('Initial search error:', e);
      }
    };
    runInitialSearch();
  }, []);

  // Search execution
  const handleSearch = async (filters: SearchFilters) => {
    setSearchLoading(true);
    try {
      const res = await api.search(filters);
      setSearchResult(res);
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    } catch (err: any) {
      showToast('Search execution failed: ' + err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  // Graph expansion
  const handleExpandGraphNode = async (paperId: string) => {
    try {
      const res = await api.expandGraphNode(paperId);
      if (res.newNodes && res.newNodes.length > 0) {
        queryClient.setQueryData(['graph'], (old: any) => {
          if (!old) return old;
          const existingIds = new Set(old.nodes.map((n: any) => n.id));
          const uniqueNewNodes = res.newNodes.filter((n: any) => !existingIds.has(n.id));
          return {
            nodes: [...old.nodes, ...uniqueNewNodes],
            links: [...old.links, ...res.newLinks],
          };
        });
        showToast(`Expanded graph with +${res.newNodes.length} connected papers`);
      } else {
        showToast('All immediate connected papers are already visualized');
      }
    } catch (e) {
      showToast('Failed to expand graph');
    }
  };

  // Open AI Assistant with paper
  const handleOpenAiWithPaper = (paper: Paper) => {
    if (!selectedPaperIds.includes(paper.id)) {
      toggleSelectPaper(paper.id);
    }
    setActiveTab('ai');
  };

  // Literature Review Synthesis
  const handleGenerateLiteratureReview = async (topic?: string, paperIds?: string[]) => {
    const ids = paperIds && paperIds.length > 0 ? paperIds : selectedPaperIds;
    if (ids.length === 0) {
      showToast('Select at least 1 paper to synthesize a review');
      return;
    }
    const t = topic || 'Academic Synthesis and Methodological Trends';
    try {
      await api.synthesizeLiteratureReview(t, ids);
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setActiveTab('reviews');
      showToast('Systematic literature review synthesized successfully!');
    } catch (err: any) {
      showToast('Synthesis failed: ' + err.message);
    }
  };

  // Collections Actions
  const handleCreateCollection = async (name: string, description: string) => {
    try {
      await api.createCollection({ name, description });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      showToast(`Created collection "${name}"`);
    } catch (e) {
      showToast('Failed to create collection');
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await api.deleteCollection(id);
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      if (selectedCollectionId === id) setSelectedCollectionId(null);
      showToast('Collection deleted');
    } catch (e) {
      showToast('Failed to delete collection');
    }
  };

  const handleAddToCollection = async (collectionId: string, paperId: string) => {
    try {
      await api.addPaperToCollection(collectionId, paperId);
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      showToast('Paper saved to collection');
    } catch (e) {
      showToast('Failed to add paper to collection');
    }
  };

  const handleRemoveFromCollection = async (collectionId: string, paperId: string) => {
    try {
      await api.removePaperFromCollection(collectionId, paperId);
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      showToast('Paper removed from collection');
    } catch (e) {
      showToast('Failed to remove paper');
    }
  };

  // Paper status updates
  const handleUpdatePaperStatus = async (paperId: string, status: Paper['readingStatus']) => {
    try {
      await api.updatePaper(paperId, { readingStatus: status });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      showToast(`Marked as ${status}`);
    } catch (e) {
      showToast('Failed to update status');
    }
  };

  const handleUpdatePaperRating = async (paperId: string, rating: number) => {
    try {
      await api.updatePaper(paperId, { userRating: rating });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    } catch (e) {
      showToast('Failed to update rating');
    }
  };

  const handleUpdatePaperNotes = async (paperId: string, notes: string) => {
    try {
      await api.updatePaper(paperId, { userNotes: notes });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      showToast('Research notes saved');
    } catch (e) {
      showToast('Failed to save notes');
    }
  };

  // Target papers in basket
  const selectedPapers = papers.filter((p) => selectedPaperIds.includes(p.id));

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f1f4f9] dark:bg-[#121620] text-slate-800 dark:text-slate-100 flex font-sans transition-colors duration-200">
      {/* Toast Notification (Linear Style) */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-medium px-3.5 py-2 rounded-xl shadow-lg border border-slate-700/80 dark:border-slate-200 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Responsive Collapsible Sidebar - Fixed & Sticky to 100vh */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        totalLibraryCount={papers.length}
        collections={collections}
        onSelectCollection={(colId) => {
          setSelectedCollectionId(colId);
          setActiveTab('library');
        }}
        onCreateCollection={() => setActiveTab('library')}
      />

      {/* Main Content Area - Full height with internal scroll for right page */}
      <div className="flex-1 flex flex-col h-screen max-h-screen min-w-0 overflow-hidden">
        {/* Top Navbar - Pinned header */}
        <div className="shrink-0 z-20">
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedPaperIds={selectedPaperIds}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            totalLibraryCount={papers.length}
          />
        </div>

        {/* Dynamic Page Router - Only the right white page scrolls */}
        <main className={`flex-1 min-h-0 ${activeTab === 'graph' ? 'h-full overflow-hidden' : 'overflow-y-auto pb-24'}`}>
          <ErrorBoundary>
            {activeTab === 'dashboard' && (
            <Dashboard
              onOpenPaper={(paper) => setInspectedPaper(paper)}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {activeTab === 'search' && (
            <Search
              onSearch={handleSearch}
              searchResult={searchResult}
              loading={searchLoading}
              selectedPaperIds={selectedPaperIds}
              onToggleSelectPaper={(paper) => toggleSelectPaper(paper.id)}
              onOpenGraphWithSeed={(paperId) => {
                api.getGraph([paperId]).then((g) => {
                  queryClient.setQueryData(['graph'], g);
                  setActiveTab('graph');
                });
              }}
              onOpenAiWithPaper={handleOpenAiWithPaper}
              onInspectPaper={(paper) => setInspectedPaper(paper)}
              collections={collections}
              onAddToCollection={handleAddToCollection}
              onUpdatePaperStatus={handleUpdatePaperStatus}
              onUpdatePaperRating={handleUpdatePaperRating}
            />
          )}

          {activeTab === 'graph' && (
            <ResearchGraph
              graphData={activeGraph}
              onExpandNode={handleExpandGraphNode}
              onSelectPaperForAi={(paperId) => {
                if (!selectedPaperIds.includes(paperId)) {
                  toggleSelectPaper(paperId);
                }
                setActiveTab('ai');
              }}
              onToggleSelectPaper={(paper) => toggleSelectPaper(paper.id)}
              selectedPaperIds={selectedPaperIds}
              libraryPapers={papers}
            />
          )}

          {activeTab === 'library' && (
            <Collections
              collections={collections}
              papers={papers}
              selectedCollectionId={selectedCollectionId}
              onSelectCollection={setSelectedCollectionId}
              onCreateCollection={handleCreateCollection}
              onDeleteCollection={handleDeleteCollection}
              onRemovePaperFromCollection={handleRemoveFromCollection}
              onInspectPaper={(paper) => setInspectedPaper(paper)}
              onOpenGraphWithCollection={(colId) => {
                const col = collections.find((c) => c.id === colId);
                if (col) {
                  api.getGraph(col.paperIds).then((g) => {
                    queryClient.setQueryData(['graph'], g);
                    setActiveTab('graph');
                  });
                }
              }}
              onSynthesizeCollection={(col) => {
                handleGenerateLiteratureReview(`Systematic Review: ${col.name}`, col.paperIds);
              }}
              onExportCollection={(col) => {
                useResearchStore.setState({ selectedPaperIds: col.paperIds });
                setIsExportOpen(true);
              }}
              onUpdatePaperStatus={handleUpdatePaperStatus}
              onUpdatePaperRating={handleUpdatePaperRating}
              onUpdatePaperNotes={handleUpdatePaperNotes}
            />
          )}

          {activeTab === 'ai' && (
            <Assistant
              papers={papers}
              selectedPaperIds={selectedPaperIds}
              onToggleSelectPaper={(paper) => toggleSelectPaper(paper.id)}
              onAskQuestion={(q, ids, m, prov, key) => api.askQuestion(q, ids, m, prov, key)}
              onGenerateLiteratureReview={(topic, ids) => handleGenerateLiteratureReview(topic, ids)}
              onInspectPaper={(paper) => setInspectedPaper(paper)}
            />
          )}

          {(activeTab === 'prisma' || activeTab === 'reviews') && (
            <LiteratureReview
              reviews={reviews}
              papers={papers}
              prismaProjects={prismaProjects}
              onCreatePrismaProject={async (title, q) => {
                await api.createPrismaProject({ title, researchQuestion: q });
                queryClient.invalidateQueries({ queryKey: ['prisma'] });
              }}
              onScreenPaper={async (pId, paperId, stage, reason) => {
                await api.screenPaper(pId, paperId, stage, reason);
                queryClient.invalidateQueries({ queryKey: ['prisma'] });
              }}
              onDeleteReview={async (id) => {
                await api.deleteReview(id);
                queryClient.invalidateQueries({ queryKey: ['reviews'] });
              }}
              onExportReview={async (revId, fmt) => {
                const text = await api.exportReview(revId, fmt);
                const ext = fmt === 'csv' ? 'csv' : 'md';
                const type = fmt === 'csv' ? 'text/csv' : 'text/markdown';
                const blob = new Blob([text], { type });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `review_${revId}.${ext}`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              onInspectPaper={(paper) => setInspectedPaper(paper)}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics
              analyticsData={
                analyticsData || {
                  citationsByYear: [],
                  fieldsDistribution: [],
                  impactBreakdown: [],
                  topAuthors: [],
                  totalPapers: papers.length,
                  totalCitations: 0,
                }
              }
            />
          )}

          {activeTab === 'settings' && <Settings />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Floating Bottom Basket Tray */}
      <SelectionBasketBar
        selectedPapers={selectedPapers}
        onClearSelection={clearSelection}
        onRemovePaper={removePaperFromBasket}
        onOpenAiWithSelection={() => setActiveTab('ai')}
        onOpenGraphWithSelection={() => setActiveTab('graph')}
        onGenerateLiteratureReview={() => handleGenerateLiteratureReview()}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Export Citations Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        selectedPaperIds={selectedPaperIds}
        allPapers={papers}
      />

      {/* PDF Upload Modal */}
      <PdfUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        collections={collections}
        onUploadSuccess={(newPaper) => {
          queryClient.invalidateQueries({ queryKey: ['papers'] });
          queryClient.invalidateQueries({ queryKey: ['graph'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
          showToast(`Ingested "${newPaper.title}" via PyMuPDF`);
        }}
      />

      {/* Paper Inspector Modal */}
      <PaperDetailModal
        paper={inspectedPaper}
        onClose={() => setInspectedPaper(null)}
        onOpenGraphWithSeed={(seedId) => {
          api.getGraph([seedId]).then((g) => {
            queryClient.setQueryData(['graph'], g);
            setActiveTab('graph');
          });
        }}
        onOpenAiWithPaper={handleOpenAiWithPaper}
        onToggleSelectPaper={(paper) => toggleSelectPaper(paper.id)}
        isSelected={inspectedPaper ? selectedPaperIds.includes(inspectedPaper.id) : false}
      />

      {/* JWT Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
};

export default App;
