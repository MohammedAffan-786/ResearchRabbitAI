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

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('rr_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch (e) {
    // fallback
  }
  return 'light';
};

export const useResearchStore = create<ResearchState>((set) => {
  const initialTheme = getInitialTheme();
  if (typeof document !== 'undefined') {
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      if (document.body) document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      if (document.body) document.body.classList.remove('dark');
    }
  }

  return {
    theme: initialTheme,
    toggleTheme: () =>
      set((state) => {
        const next = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('rr_theme', next);
        if (typeof document !== 'undefined') {
          if (next === 'dark') {
            document.documentElement.classList.add('dark');
            if (document.body) document.body.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
            if (document.body) document.body.classList.remove('dark');
          }
        }
        return { theme: next };
      }),
    setTheme: (theme) => {
      localStorage.setItem('rr_theme', theme);
      if (typeof document !== 'undefined') {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          if (document.body) document.body.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
          if (document.body) document.body.classList.remove('dark');
        }
      }
      set({ theme });
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
