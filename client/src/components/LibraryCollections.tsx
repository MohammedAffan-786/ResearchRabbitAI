import React, { useState } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Sparkles, 
  Network, 
  Download, 
  Trash2, 
  Star, 
  FileText, 
  Edit3,
  ExternalLink,
  BookOpen,
  Share2,
  Search,
  Check,
  Copy,
  Tag,
  ArrowUpDown,
  X,
  Globe,
  Filter
} from 'lucide-react';
import { Paper, Collection } from '../../../shared/types';
import { api } from '../services/api';
import { useResearchStore } from '../store/useResearchStore';

interface LibraryCollectionsProps {
  collections: Collection[];
  papers: Paper[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onCreateCollection: (name: string, description: string) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  onRemovePaperFromCollection: (collectionId: string, paperId: string) => Promise<void>;
  onInspectPaper: (paper: Paper) => void;
  onOpenGraphWithCollection: (collectionId: string) => void;
  onSynthesizeCollection: (collection: Collection) => void;
  onExportCollection: (collection: Collection) => void;
  onUpdatePaperStatus: (paperId: string, status: Paper['readingStatus']) => Promise<void>;
  onUpdatePaperRating: (paperId: string, rating: number) => Promise<void>;
  onUpdatePaperNotes: (paperId: string, notes: string) => Promise<void>;
}

export const LibraryCollections: React.FC<LibraryCollectionsProps> = ({
  collections,
  papers,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onDeleteCollection,
  onRemovePaperFromCollection,
  onInspectPaper,
  onOpenGraphWithCollection,
  onSynthesizeCollection,
  onExportCollection,
  onUpdatePaperStatus,
  onUpdatePaperRating,
  onUpdatePaperNotes
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchInCol, setSearchInCol] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'title' | 'authors'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'citations' | 'year' | 'title'>('default');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');

  const { setActiveTab, setSearchInitialQuery } = useResearchStore();

  // Summary & Share modals
  const [collectionSummary, setCollectionSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [shareData, setShareData] = useState<{ isPublic: boolean; shareUrl: string | null } | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  const activeCollection = collections.find(c => c.id === selectedCollectionId) || null;

  // Match relevance evaluator
  const getMatchInfo = (p: Paper, query: string, scope: 'all' | 'title' | 'authors') => {
    const q = query.toLowerCase().trim();
    if (!q) return { matches: true, score: 0, location: null, snippet: '' };

    const title = (p.title || '').toLowerCase();
    const abstract = (p.abstract || '').toLowerCase();
    const authorsStr = (p.authors || []).map(a => typeof a === 'string' ? a : (a.name || '')).join(' ').toLowerCase();

    let score = 0;
    let location: 'title' | 'author' | 'abstract' | null = null;
    let snippet = '';

    const titleMatches = title.includes(q);
    const authorMatches = authorsStr.includes(q);
    const abstractMatches = abstract.includes(q);

    if (titleMatches) {
      score += 100;
      if (title.startsWith(q)) score += 50;
      location = 'title';
    }

    if (authorMatches && (scope === 'all' || scope === 'authors')) {
      score += 50;
      if (!location) location = 'author';
    }

    if (abstractMatches && scope === 'all') {
      score += 10;
      if (!location) {
        location = 'abstract';
        const idx = abstract.indexOf(q);
        const start = Math.max(0, idx - 30);
        const end = Math.min(abstract.length, idx + q.length + 40);
        snippet = (start > 0 ? '...' : '') + (p.abstract || '').substring(start, end) + (end < abstract.length ? '...' : '');
      }
    }

    let matches = false;
    if (scope === 'title') matches = titleMatches;
    else if (scope === 'authors') matches = authorMatches;
    else matches = titleMatches || authorMatches || abstractMatches;

    return { matches, score, location, snippet };
  };

  // Filter papers
  let displayedPapers = papers;
  if (activeCollection) {
    displayedPapers = papers.filter(p => activeCollection.paperIds.includes(p.id));
  }
  if (statusFilter !== 'all') {
    displayedPapers = displayedPapers.filter(p => p.readingStatus === statusFilter);
  }
  if (searchInCol.trim()) {
    displayedPapers = displayedPapers.filter(p => getMatchInfo(p, searchInCol, searchScope).matches);
  }

  // Sort: when searching with default sort, prioritize relevance score (Title matches first)
  if (sortBy === 'citations') {
    displayedPapers = [...displayedPapers].sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
  } else if (sortBy === 'year') {
    displayedPapers = [...displayedPapers].sort((a, b) => (b.year || 0) - (a.year || 0));
  } else if (sortBy === 'title') {
    displayedPapers = [...displayedPapers].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (searchInCol.trim()) {
    // Relevance ordering: title matches > author matches > abstract matches
    displayedPapers = [...displayedPapers].sort((a, b) => {
      const scoreA = getMatchInfo(a, searchInCol, searchScope).score;
      const scoreB = getMatchInfo(b, searchInCol, searchScope).score;
      return scoreB - scoreA;
    });
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    await onCreateCollection(newColName, newColDesc);
    setNewColName('');
    setNewColDesc('');
    setShowCreateModal(false);
  };

  const handleSaveNotes = async (paperId: string) => {
    await onUpdatePaperNotes(paperId, currentNotes);
    setEditingNotesId(null);
  };

  const handleSummarize = async () => {
    if (!activeCollection) return;
    setSummarizing(true);
    try {
      const res = await api.summarizeCollection(activeCollection.id);
      setCollectionSummary(res.summary);
    } catch (e) {
      console.warn('Summarize failed', e);
    } finally {
      setSummarizing(false);
    }
  };

  const handleToggleShare = async () => {
    if (!activeCollection) return;
    try {
      const res = await api.shareCollection(activeCollection.id);
      setShareData({
        isPublic: res.isPublic,
        shareUrl: `${window.location.origin}/collection/public/${res.shareToken}`
      });
    } catch (e) {
      console.warn('Share toggle failed', e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Library & Collections
        </h1>
        <p className="text-xs sm:text-sm text-[var(--muted)]">
          Organize academic literature, attach critical methodology notes, share collections, and curate evidence groups.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Collections Sidebar & Status Filter */}
        <div className="space-y-4">
          
          {/* Header & Create Button */}
          <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-primary-500" />
                <span>Collections</span>
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1 rounded-md bg-[var(--canvas)] text-[var(--foreground)] hover:bg-[var(--border)] transition cursor-pointer"
                title="Create new collection"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Collection List */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  onSelectCollection(null);
                  setCollectionSummary(null);
                  setShareData(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                  selectedCollectionId === null
                    ? 'bg-primary-600 text-white font-semibold shadow-xs'
                    : 'text-[var(--muted)] hover:bg-[var(--canvas)] hover:text-[var(--foreground)]'
                }`}
              >
                <span>All Catalog Papers</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  selectedCollectionId === null
                    ? 'bg-primary-700 text-white'
                    : 'bg-[var(--canvas)] text-[var(--muted)] border border-[var(--border)]'
                }`}>
                  {papers.length}
                </span>
              </button>

              {collections.map(col => {
                const isSelected = selectedCollectionId === col.id;
                return (
                  <div
                    key={col.id}
                    className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-primary-600 text-white font-semibold shadow-xs'
                        : 'text-[var(--muted)] hover:bg-[var(--canvas)] hover:text-[var(--foreground)]'
                    }`}
                    onClick={() => {
                      onSelectCollection(col.id);
                      setCollectionSummary(null);
                      setShareData(null);
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: col.color || '#6366f1' }} 
                      />
                      <span className="truncate">{col.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isSelected
                          ? 'bg-primary-700 text-white'
                          : 'bg-[var(--canvas)] text-[var(--muted)] border border-[var(--border)]'
                      }`}>
                        {col.paperIds.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete collection "${col.name}"?`)) {
                            onDeleteCollection(col.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-rose-500 p-0.5 transition"
                        title="Delete collection"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reading Status Filter */}
          <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)] shadow-xs space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Filter by Reading Status
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: 'all', label: 'All Statuses' },
                { id: 'starred', label: 'Starred' },
                { id: 'reading', label: 'Reading' },
                { id: 'to-read', label: 'To Read' },
                { id: 'completed', label: 'Completed' },
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                    statusFilter === st.id
                      ? 'bg-primary-500/10 text-primary-500 border border-primary-500/30 font-semibold'
                      : 'bg-[var(--canvas)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Papers List & Collection Actions */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Active Collection Header & Quick Actions */}
          <div className="bg-[var(--surface)] rounded-xl p-4 sm:p-5 border border-[var(--border)] shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[var(--foreground)]">
                    {activeCollection ? activeCollection.name : 'All Library Papers'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--canvas)] border border-[var(--border)] text-[var(--muted)] text-[11px] font-mono">
                    {displayedPapers.length} papers
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {activeCollection?.description || 'Curated peer-reviewed publications and ingested research PDFs.'}
                </p>
              </div>

              {/* Quick Actions for this collection */}
              {activeCollection && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={handleSummarize}
                    disabled={summarizing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium shadow-xs transition cursor-pointer disabled:opacity-50"
                    title="Generate executive synthesis of this collection"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{summarizing ? 'Summarizing...' : 'AI Summary'}</span>
                  </button>

                  <button
                    onClick={() => onSynthesizeCollection(activeCollection)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--canvas)] hover:border-primary-500/50 text-[var(--foreground)] text-xs font-medium transition cursor-pointer"
                    title="Generate full systematic literature review"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary-500" />
                    <span>Literature Review</span>
                  </button>

                  <button
                    onClick={() => onOpenGraphWithCollection(activeCollection.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--canvas)] hover:border-primary-500/50 text-[var(--foreground)] text-xs font-medium transition cursor-pointer"
                  >
                    <Network className="w-3.5 h-3.5 text-primary-500" />
                    <span>Graph View</span>
                  </button>

                  <button
                    onClick={handleToggleShare}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--canvas)] hover:border-primary-500/50 text-[var(--foreground)] text-xs font-medium transition cursor-pointer"
                    title="Share collection publicly"
                  >
                    <Share2 className="w-3.5 h-3.5 text-primary-500" />
                    <span>Share</span>
                  </button>

                  <button
                    onClick={() => onExportCollection(activeCollection)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--canvas)] hover:border-primary-500/50 text-[var(--foreground)] text-xs font-medium transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--muted)]" />
                    <span>Export</span>
                  </button>
                </div>
              )}
            </div>

            {/* In-Collection Search & Sort Bar */}
            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    placeholder="Search within this collection by keyword, author, or title..."
                    value={searchInCol}
                    onChange={(e) => setSearchInCol(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-[var(--canvas)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-primary-500"
                  />
                  {searchInCol && (
                    <button
                      onClick={() => setSearchInCol('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] text-xs p-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end flex-wrap">
                  {/* Scope Selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      Scope:
                    </span>
                    <select
                      value={searchScope}
                      onChange={(e) => setSearchScope(e.target.value as any)}
                      className="px-2 py-1 rounded-lg bg-[var(--canvas)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-primary-500"
                    >
                      <option value="all">All Fields</option>
                      <option value="title">Title Only</option>
                      <option value="authors">Authors Only</option>
                    </select>
                  </div>

                  {/* Sort Selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                      <ArrowUpDown className="w-3 h-3" />
                      Sort:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-2 py-1 rounded-lg bg-[var(--canvas)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-primary-500"
                    >
                      <option value="default">{searchInCol.trim() ? 'Best Match (Relevance)' : 'Default'}</option>
                      <option value="citations">Most Citations</option>
                      <option value="year">Newest Year</option>
                      <option value="title">Title (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Global search quick link banner when searching */}
              {searchInCol.trim() && (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs">
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium truncate">
                    Showing {displayedPapers.length} matching paper(s) in catalog.
                  </span>
                  <button
                    onClick={() => {
                      setSearchInitialQuery(searchInCol);
                      setActiveTab('search');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0"
                  >
                    <Globe className="w-3 h-3" />
                    <span>Search 250M+ Global Papers in Discover →</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Collection Summary Box */}
          {collectionSummary && (
            <div className="p-4 rounded-xl bg-[var(--canvas)] border border-primary-500/30 text-xs text-[var(--foreground)] space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary-500 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Executive Collection Synthesis
                </span>
                <button
                  onClick={() => setCollectionSummary(null)}
                  className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs"
                >
                  Dismiss
                </button>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{collectionSummary}</p>
            </div>
          )}

          {/* Share Modal Box */}
          {shareData && (
            <div className="p-4 rounded-xl bg-[var(--canvas)] border border-indigo-500/30 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-500 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Share2 className="w-3.5 h-3.5" />
                  Public Collection Link
                </span>
                <button
                  onClick={() => setShareData(null)}
                  className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs"
                >
                  Close
                </button>
              </div>
              <p className="text-[var(--muted)]">
                {shareData.isPublic
                  ? 'Anyone with this link can view this curated collection without logging in:'
                  : 'This collection is currently private.'}
              </p>
              {shareData.shareUrl && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareData.shareUrl}
                    className="flex-1 p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)]"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareData.shareUrl || '');
                      setCopiedShare(true);
                      setTimeout(() => setCopiedShare(false), 2000);
                    }}
                    className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs flex items-center gap-1 transition"
                  >
                    {copiedShare ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedShare ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Papers Cards */}
          <div className="space-y-3">
            {displayedPapers.length === 0 ? (
              <div className="text-center py-12 bg-[var(--surface)] rounded-xl border border-dashed border-[var(--border)] p-8 space-y-3">
                <FileText className="w-8 h-8 text-[var(--muted)] mx-auto" />
                <h3 className="text-sm font-semibold text-[var(--foreground)]">No papers match criteria</h3>
                <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
                  {searchInCol.trim()
                    ? `No publications matching "${searchInCol}" were found in your local catalog.`
                    : 'Add papers from Discover, ingest research PDFs, or clear search filters.'}
                </p>
                {searchInCol.trim() && (
                  <button
                    onClick={() => {
                      setSearchInitialQuery(searchInCol);
                      setActiveTab('search');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Search 250M+ Global Papers for "{searchInCol}"</span>
                  </button>
                )}
              </div>
            ) : (
              displayedPapers.map(paper => {
                const matchInfo = searchInCol.trim() ? getMatchInfo(paper, searchInCol, searchScope) : null;
                return (
                  <div
                    key={paper.id}
                    className="bg-[var(--surface)] rounded-xl p-4 sm:p-5 border border-[var(--border)] hover:border-primary-500/30 transition shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-[var(--canvas)] text-[var(--foreground)] border border-[var(--border)] text-[11px] font-mono">
                            {paper.year}
                          </span>
                          <span className="text-xs text-[var(--muted)] font-medium">
                            {paper.venue || 'Peer-Reviewed Literature'}
                          </span>
                          <span className="text-xs text-primary-500 font-mono font-medium">
                            {(paper.citationCount || 0).toLocaleString()} citations
                          </span>

                          {/* Match reason badge */}
                          {matchInfo && matchInfo.location === 'title' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Matched in Title</span>
                            </span>
                          )}
                          {matchInfo && matchInfo.location === 'author' && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-[10px] font-semibold">
                              Matched in Author
                            </span>
                          )}
                          {matchInfo && matchInfo.location === 'abstract' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[10px] font-medium" title={matchInfo.snippet}>
                              Matched in Abstract
                            </span>
                          )}
                        </div>

                        <h3
                          onClick={() => onInspectPaper(paper)}
                          className="text-base font-semibold text-[var(--foreground)] hover:text-primary-500 cursor-pointer leading-snug transition"
                        >
                          {paper.title}
                        </h3>

                        <p className="text-xs text-[var(--muted)] truncate">
                          {(paper.authors || []).map(a => typeof a === 'string' ? a : a.name).join(', ')}
                        </p>

                        {/* Match excerpt snippet when matched in abstract */}
                        {matchInfo && matchInfo.location === 'abstract' && matchInfo.snippet && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 italic bg-amber-50 dark:bg-amber-950/40 rounded px-2.5 py-1 mt-1 border border-amber-200/60 dark:border-amber-800/60">
                            Excerpt: "{matchInfo.snippet}"
                          </p>
                        )}
                      </div>

                    {/* Delete from collection button */}
                    {activeCollection && (
                      <button
                        onClick={() => onRemovePaperFromCollection(activeCollection.id, paper.id)}
                        className="text-[var(--muted)] hover:text-rose-500 p-1 rounded-lg hover:bg-[var(--canvas)] transition cursor-pointer"
                        title="Remove from this collection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* TLDR */}
                  {paper.tldr && (
                    <div className="p-2.5 rounded-lg bg-[var(--canvas)] border border-[var(--border)] text-xs text-[var(--foreground)] flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" />
                      <p>{paper.tldr}</p>
                    </div>
                  )}

                  {/* Research Notes */}
                  <div className="bg-[var(--canvas)] rounded-lg p-3 border border-[var(--border)] text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[var(--foreground)] font-medium">
                      <span className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                        <Edit3 className="w-3 h-3" />
                        <span>Critical Research Notes & Methodology Annotations</span>
                      </span>
                      {editingNotesId !== paper.id ? (
                        <button
                          onClick={() => {
                            setEditingNotesId(paper.id);
                            setCurrentNotes(paper.userNotes || '');
                          }}
                          className="text-[11px] text-primary-500 hover:underline cursor-pointer font-medium"
                        >
                          {paper.userNotes ? 'Edit Note' : '+ Add Note'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveNotes(paper.id)}
                            className="text-[11px] text-primary-500 font-semibold hover:underline cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingNotesId(null)}
                            className="text-[11px] text-[var(--muted)] hover:underline cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {editingNotesId === paper.id ? (
                      <textarea
                        value={currentNotes}
                        onChange={(e) => setCurrentNotes(e.target.value)}
                        placeholder="Add methodology critique, dataset questions, or theoretical notes..."
                        rows={3}
                        className="w-full p-2 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-primary-500 text-[var(--foreground)]"
                      />
                    ) : (
                      <p className="text-[var(--muted)] italic text-[11px]">
                        {paper.userNotes || 'No private notes attached yet.'}
                      </p>
                    )}
                  </div>

                  {/* Footer status & rating */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                    <div className="flex items-center gap-2.5">
                      <select
                        value={paper.readingStatus || 'to-read'}
                        onChange={(e) => onUpdatePaperStatus(paper.id, e.target.value as any)}
                        className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--canvas)] text-[var(--foreground)] font-medium text-xs focus:outline-none focus:border-primary-500"
                      >
                        <option value="to-read">To Read</option>
                        <option value="reading">Reading</option>
                        <option value="completed">Completed</option>
                        <option value="starred">Starred</option>
                      </select>

                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            onClick={() => onUpdatePaperRating(paper.id, s)}
                            className="cursor-pointer text-slate-300 dark:text-slate-700 hover:text-amber-400 transition"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                (paper.userRating || 0) >= s
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-300 dark:text-slate-700'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {paper.openAccessPdfUrl && (
                      <a
                        href={paper.openAccessPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[var(--muted)] hover:text-primary-500 transition font-medium text-xs"
                      >
                        <span>Open PDF</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                </div>
              );
            })
          )}
          </div>

        </div>

      </div>

      {/* Create Collection Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-2xl p-5 max-w-md w-full shadow-xl border border-[var(--border)] animate-fadeIn space-y-3">
            <h3 className="text-base font-semibold text-[var(--foreground)]">Create Collection</h3>
            <p className="text-xs text-[var(--muted)]">
              Group research papers by project, topic, or systematic literature review.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Collection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State-Space Models & Mamba"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--canvas)] text-xs text-[var(--foreground)] focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Goals and scope for this research group..."
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--canvas)] text-xs text-[var(--foreground)] focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--canvas)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium shadow-xs transition"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
