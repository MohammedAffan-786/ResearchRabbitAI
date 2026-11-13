import {
  Paper,
  Collection,
  LiteratureReview,
  PrismaProject,
  GraphData,
  SearchFilters,
  SearchResult,
  AskQuestionResponse,
  PaperIntelligence,
  DocumentJob,
  DashboardOverview,
  UserProfile
} from '../../../shared/types';

const BASE_URL = '/api';

const getHeaders = (isJson = true) => {
  const headers: Record<string, string> = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('rr_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const api = {
  // Auth
  login: async (formData: FormData): Promise<{ access_token: string; refresh_token: string; user: any }> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  register: async (data: { email: string; password: string; full_name?: string; institution?: string }): Promise<any> => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  refreshToken: async (refreshToken: string): Promise<{ access_token: string; refresh_token: string; user: any }> => {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    if (!res.ok) throw new Error('Token refresh failed');
    return res.json();
  },

  getProfile: async (): Promise<UserProfile> => {
    const res = await fetch(`${BASE_URL}/auth/profile`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  },

  updateProfile: async (data: { full_name?: string; institution?: string }): Promise<UserProfile> => {
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  logout: async (): Promise<void> => {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getHeaders(false)
      });
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('rr_token');
    localStorage.removeItem('rr_refresh_token');
  },

  // Dashboard
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    const res = await fetch(`${BASE_URL}/dashboard/overview`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to load dashboard overview');
    return res.json();
  },

  logActivity: async (activity_type: string, title: string, metadata_json?: Record<string, any>): Promise<any> => {
    try {
      const res = await fetch(`${BASE_URL}/dashboard/activity`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ activity_type, title, metadata_json })
      });
      return res.json();
    } catch {
      return null;
    }
  },

  // Search
  search: async (filters: SearchFilters): Promise<SearchResult> => {
    const params = new URLSearchParams();
    if (filters.query) params.append('q', filters.query);
    if (filters.yearStart) params.append('yearStart', filters.yearStart.toString());
    if (filters.yearEnd) params.append('yearEnd', filters.yearEnd.toString());
    if (filters.minCitations) params.append('minCitations', filters.minCitations.toString());
    if (filters.fieldOfStudy) params.append('field', filters.fieldOfStudy);
    if (filters.openAccessOnly) params.append('openAccess', 'true');
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.source && filters.source !== 'all') params.append('provider', filters.source);
    if (filters.provider && filters.provider !== 'all') params.append('provider', filters.provider);

    const res = await fetch(`${BASE_URL}/papers/search?${params.toString()}`, {
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  getScholarlyProviders: async (): Promise<{
    providers: Array<{
      id: string;
      name: string;
      attribution: string;
      terms_of_service: string;
      available: boolean;
    }>;
    cacheStats: {
      size: number;
      hits: number;
      misses: number;
      default_ttl_seconds: number;
    };
  }> => {
    const res = await fetch(`${BASE_URL}/search/providers`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch scholarly providers');
    return res.json();
  },

  getAiProviders: async (): Promise<{
    llmProviders: Array<{
      id: string;
      name: string;
      default_model: string;
      available: boolean;
      requires_api_key: boolean;
      active: boolean;
    }>;
    embeddingProviders: Array<{
      id: string;
      name: string;
      dimension: number;
      available: boolean;
      requires_api_key: boolean;
      active: boolean;
    }>;
  }> => {
    const res = await fetch(`${BASE_URL}/assistant/providers`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch AI providers');
    return res.json();
  },

  resolveDoi: async (doi: string): Promise<any> => {
    const res = await fetch(`${BASE_URL}/search/doi/${encodeURIComponent(doi)}`, { headers: getHeaders(false) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `Failed to resolve DOI ${doi}` }));
      throw new Error(err.detail || `Failed to resolve DOI ${doi}`);
    }
    return res.json();
  },

  // Papers
  getPapers: async (collectionId?: string): Promise<{ papers: Paper[]; total: number }> => {
    const url = collectionId ? `${BASE_URL}/papers?collectionId=${collectionId}` : `${BASE_URL}/papers`;
    const res = await fetch(url, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch papers');
    return res.json();
  },

  getPaper: async (id: string): Promise<{ paper: Paper; similar: { earlierWork: Paper[]; laterWork: Paper[]; similarWork: Paper[] } }> => {
    const res = await fetch(`${BASE_URL}/papers/${id}`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch paper');
    return res.json();
  },

  getPaperIntelligence: async (id: string): Promise<{ paperId: string; title: string; intelligence: PaperIntelligence }> => {
    const res = await fetch(`${BASE_URL}/papers/${id}/intelligence`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch paper intelligence');
    return res.json();
  },

  updatePaper: async (id: string, updates: Partial<Paper>): Promise<Paper> => {
    const res = await fetch(`${BASE_URL}/papers/${id}`, {
      method: 'PATCH',
      headers: getHeaders(true),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update paper');
    return res.json();
  },

  deletePaper: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/papers/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error('Failed to delete paper');
  },

  uploadPdf: async (file: File, collectionId?: string): Promise<{ success: boolean; paper: Paper; message: string }> => {
    const formData = new FormData();
    formData.append('pdf', file);
    if (collectionId) formData.append('collectionId', collectionId);

    const token = localStorage.getItem('rr_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/papers/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  uploadPdfAsync: async (file: File, collectionId?: string): Promise<DocumentJob> => {
    const formData = new FormData();
    formData.append('pdf', file);
    if (collectionId) formData.append('collectionId', collectionId);

    const token = localStorage.getItem('rr_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/papers/upload/async`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Async upload failed' }));
      throw new Error(err.detail || 'Async upload failed');
    }
    return res.json();
  },

  getUploadStatus: async (jobId: string): Promise<DocumentJob> => {
    const res = await fetch(`${BASE_URL}/papers/upload/status/${jobId}`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to get job status');
    return res.json();
  },

  // Knowledge Graph
  getGraph: async (seeds?: string[], filters?: { minYear?: number; maxYear?: number; linkType?: string; topic?: string }): Promise<GraphData> => {
    const params = new URLSearchParams();
    if (seeds && seeds.length > 0) params.append('seeds', seeds.join(','));
    if (filters?.minYear) params.append('minYear', filters.minYear.toString());
    if (filters?.maxYear) params.append('maxYear', filters.maxYear.toString());
    if (filters?.linkType) params.append('linkType', filters.linkType);
    if (filters?.topic) params.append('topic', filters.topic);

    const url = `${BASE_URL}/graph?${params.toString()}`;
    const res = await fetch(url, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch graph data');
    return res.json();
  },

  expandGraphNode: async (paperId: string): Promise<{ newNodes: any[]; newLinks: any[] }> => {
    const res = await fetch(`${BASE_URL}/graph/expand`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ paperId })
    });
    if (!res.ok) throw new Error('Failed to expand graph');
    return res.json();
  },

  // Collections
  getCollections: async (): Promise<Collection[]> => {
    const res = await fetch(`${BASE_URL}/collections`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch collections');
    return res.json();
  },

  createCollection: async (data: { name: string; description?: string; color?: string; icon?: string; tags?: string[] }): Promise<Collection> => {
    const res = await fetch(`${BASE_URL}/collections`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create collection');
    return res.json();
  },

  updateCollection: async (id: string, updates: Partial<Collection>): Promise<Collection> => {
    const res = await fetch(`${BASE_URL}/collections/${id}`, {
      method: 'PATCH',
      headers: getHeaders(true),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update collection');
    return res.json();
  },

  deleteCollection: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/collections/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error('Failed to delete collection');
  },

  addPaperToCollection: async (collectionId: string, paperId: string): Promise<Collection> => {
    const res = await fetch(`${BASE_URL}/collections/${collectionId}/papers`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ paperId })
    });
    if (!res.ok) throw new Error('Failed to add paper to collection');
    return res.json();
  },

  removePaperFromCollection: async (collectionId: string, paperId: string): Promise<Collection> => {
    const res = await fetch(`${BASE_URL}/collections/${collectionId}/papers/${paperId}`, {
      method: 'DELETE',
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error('Failed to remove paper from collection');
    return res.json();
  },

  searchCollection: async (collectionId: string, query: string): Promise<{ collectionId: string; collectionName: string; query: string; results: Paper[]; total: number }> => {
    const res = await fetch(`${BASE_URL}/collections/${collectionId}/search?q=${encodeURIComponent(query)}`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to search collection');
    return res.json();
  },

  shareCollection: async (collectionId: string): Promise<{ id: string; isPublic: boolean; shareToken: string; shareUrl: string | null }> => {
    const res = await fetch(`${BASE_URL}/collections/${collectionId}/share`, {
      method: 'POST',
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error('Failed to share collection');
    return res.json();
  },

  getPublicCollection: async (shareToken: string): Promise<Collection> => {
    const res = await fetch(`${BASE_URL}/collections/public/${shareToken}`);
    if (!res.ok) throw new Error('Failed to load shared collection');
    return res.json();
  },

  summarizeCollection: async (collectionId: string): Promise<{ collectionId: string; collectionName: string; summary: string; paperCount: number }> => {
    const res = await fetch(`${BASE_URL}/collections/${collectionId}/summarize`, {
      method: 'POST',
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error('Failed to summarize collection');
    return res.json();
  },

  // AI Assistant (RAG)
  askQuestion: async (
    question: string,
    paperIds: string[],
    mode = 'comprehensive',
    modelProvider?: string,
    userApiKey?: string
  ): Promise<AskQuestionResponse> => {
    const payload: Record<string, any> = { question, paperIds, mode };
    if (modelProvider) payload.modelProvider = modelProvider;
    if (userApiKey) payload.userApiKey = userApiKey;

    const res = await fetch(`${BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('AI query failed');
    return res.json();
  },

  synthesizeLiteratureReview: async (topic: string, paperIds: string[], collectionName?: string): Promise<LiteratureReview> => {
    const res = await fetch(`${BASE_URL}/ai/synthesize`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ topic, paperIds, collectionName })
    });
    if (!res.ok) throw new Error('Synthesis failed');
    return res.json();
  },

  getReviews: async (): Promise<LiteratureReview[]> => {
    const res = await fetch(`${BASE_URL}/ai/reviews`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  deleteReview: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/ai/reviews/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error('Failed to delete review');
  },

  // PRISMA
  getPrismaProjects: async (): Promise<PrismaProject[]> => {
    const res = await fetch(`${BASE_URL}/prisma`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch PRISMA projects');
    return res.json();
  },

  createPrismaProject: async (data: { title: string; researchQuestion: string }): Promise<PrismaProject> => {
    const res = await fetch(`${BASE_URL}/prisma`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create PRISMA project');
    return res.json();
  },

  screenPaper: async (projectId: string, paperId: string, stage: string, exclusionReason?: string): Promise<PrismaProject> => {
    const res = await fetch(`${BASE_URL}/prisma/${projectId}/screen`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ paperId, stage, exclusionReason })
    });
    if (!res.ok) throw new Error('Failed to screen paper');
    return res.json();
  },

  // Analytics
  getAnalytics: async (): Promise<any> => {
    const res = await fetch(`${BASE_URL}/analytics/overview`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Export
  exportCitations: async (paperIds: string[], format: 'bibtex' | 'ris' | 'text', style = 'apa'): Promise<any> => {
    const res = await fetch(`${BASE_URL}/export`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ paperIds, format, style })
    });
    if (format === 'bibtex' || format === 'ris') {
      return res.text();
    }
    return res.json();
  },

  exportReview: async (reviewId: string, format: 'markdown' | 'csv'): Promise<string> => {
    const res = await fetch(`${BASE_URL}/export/review`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ reviewId, format })
    });
    return res.text();
  }
};
