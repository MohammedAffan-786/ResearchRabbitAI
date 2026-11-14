import { create } from 'zustand';
import { Paper, Collection, LiteratureReview, PrismaProject, GraphData } from '../../../shared/types';

interface User {
  id: string;
  email: string;
  full_name?: string;
  institution?: string;
}

interface ResearchState {
  // Theme state (Linear/Notion dark & light modes)
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Auth state
  user: User | null;
  token: string | null;
  setUser: (user: User | null, token: string | null) => void;
  logout: () => void;

  // Selected Papers basket
  selectedPaperIds: string[];
  toggleSelectPaper: (paperId: string) => void;
  removePaperFromBasket: (paperId: string) => void;
  clearSelection: () => void;

  // Active view tab
  activeTab: 'dashboard' | 'search' | 'graph' | 'library' | 'ai' | 'prisma' | 'reviews' | 'analytics' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'search' | 'graph' | 'library' | 'ai' | 'prisma' | 'reviews' | 'analytics' | 'settings') => void;

  // Cross-tab search trigger
  searchInitialQuery: string;
  setSearchInitialQuery: (q: string) => void;

  // Active collection filter
  selectedCollectionId: string | null;
  setSelectedCollectionId: (id: string | null) => void;

  // Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

export const useResearchStore = create<ResearchState>((set) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('rr_theme');
    } catch (e) {}
  }
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
    if (document.body) document.body.classList.remove('dark');
  }

  return {
    theme: 'light',
    toggleTheme: () => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
        if (document.body) document.body.classList.remove('dark');
      }
      set({ theme: 'light' });
    },
    setTheme: () => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
        if (document.body) document.body.classList.remove('dark');
      }
      set({ theme: 'light' });
    },

    user: null,
    token: localStorage.getItem('rr_token'),
    setUser: (user, token) => {
      if (token) localStorage.setItem('rr_token', token);
      else localStorage.removeItem('rr_token');
      set({ user, token });
    },
    logout: () => {
      localStorage.removeItem('rr_token');
      localStorage.removeItem('rr_refresh_token');
      set({ user: null, token: null });
    },

    selectedPaperIds: [],
    toggleSelectPaper: (paperId) =>
      set((state) => ({
        selectedPaperIds: state.selectedPaperIds.includes(paperId)
          ? state.selectedPaperIds.filter((id) => id !== paperId)
          : [...state.selectedPaperIds, paperId],
      })),
    removePaperFromBasket: (paperId) =>
      set((state) => ({
        selectedPaperIds: state.selectedPaperIds.filter((id) => id !== paperId),
      })),
    clearSelection: () => set({ selectedPaperIds: [] }),

    activeTab: 'dashboard',
    setActiveTab: (activeTab) => set({ activeTab }),

    searchInitialQuery: '',
    setSearchInitialQuery: (searchInitialQuery) => set({ searchInitialQuery }),

    selectedCollectionId: null,
    setSelectedCollectionId: (selectedCollectionId) => set({ selectedCollectionId }),

    toastMessage: null,
    showToast: (msg) => {
      set({ toastMessage: msg });
      setTimeout(() => set({ toastMessage: null }), 3200);
    },
  };
});
