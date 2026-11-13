import React, { useState } from 'react';
import {
  LayoutDashboard,
  Search,
  Network,
  FolderKanban,
  Sparkles,
  FileCheck2,
  BookOpen,
  BarChart3,
  Settings,
  Upload,
  Download,
  Sun,
  Moon,
  User,
  LogOut,
  Menu,
  X,
  Layers,
  ChevronRight,
  Database,
  Cpu
} from 'lucide-react';
import { useResearchStore } from '../../store/useResearchStore';

export type ActiveTab =
  | 'dashboard'
  | 'search'
  | 'graph'
  | 'library'
  | 'ai'
  | 'prisma'
  | 'reviews'
  | 'analytics'
  | 'settings';

export interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedPaperIds: string[];
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onOpenAuth: () => void;
  totalLibraryCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedPaperIds,
  onOpenUpload,
  onOpenExport,
  onOpenAuth,
  totalLibraryCount,
}) => {
  const { user, logout, theme, toggleTheme } = useResearchStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabLabels: Record<ActiveTab, { label: string; icon: React.ElementType; section: string }> = {
    dashboard: { label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
    search: { label: 'Discover', icon: Search, section: 'Discovery' },
    graph: { label: 'Citation Graph', icon: Network, section: 'Visualization' },
    library: { label: 'Collections', icon: FolderKanban, section: 'Workspace' },
    ai: { label: 'AI Assistant', icon: Sparkles, section: 'Intelligence' },
    prisma: { label: 'PRISMA Review', icon: FileCheck2, section: 'Synthesis' },
    reviews: { label: 'Reviews', icon: BookOpen, section: 'Synthesis' },
    analytics: { label: 'Analytics', icon: BarChart3, section: 'Metrics' },
    settings: { label: 'Settings', icon: Settings, section: 'Platform' },
  };

  const currentTab = tabLabels[activeTab] || tabLabels.dashboard;
  const ActiveIcon = currentTab.icon;

  const mobileNavItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'search' as ActiveTab, label: 'Discover', icon: Search, badge: null },
    { id: 'graph' as ActiveTab, label: 'Citation Graph', icon: Network, badge: null },
    { id: 'library' as ActiveTab, label: 'Collections', icon: FolderKanban, badge: totalLibraryCount },
    { id: 'ai' as ActiveTab, label: 'AI Assistant', icon: Sparkles, badge: 'RAG' },
    { id: 'prisma' as ActiveTab, label: 'PRISMA Review', icon: FileCheck2, badge: null },
    { id: 'reviews' as ActiveTab, label: 'Reviews', icon: BookOpen, badge: null },
    { id: 'analytics' as ActiveTab, label: 'Analytics', icon: BarChart3, badge: 'Live' },
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/60 transition-colors duration-150">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          
          {/* LEFT: Contextual Breadcrumb (Desktop) / Mobile Brand Header */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Brand Logo & Trigger */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                  🐇
                </div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
                  ResearchRabbit
                </span>
              </div>
            </div>

            {/* Desktop Breadcrumb: Replaces redundant tabs with clean workspace context */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-medium tracking-wide">
                {currentTab.section}
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-semibold border border-slate-200/50 dark:border-slate-700/50 shadow-2xs">
                <ActiveIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>{currentTab.label}</span>
              </div>
            </div>
          </div>

          {/* CENTER: Sleek Omni-Search Trigger Bar (Perplexity / Linear Style) */}
          <div className="hidden xl:flex flex-1 max-w-sm mx-auto">
            <button
              onClick={() => setActiveTab('search')}
              className="w-full flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer shadow-2xs group"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="flex-1 text-left truncate text-slate-400 dark:text-slate-400 font-normal">
                Search academic literature, DOIs, authors...
              </span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 border border-slate-300/50 dark:border-slate-700/50">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* RIGHT: System Status + Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Live Ollama Engine Status Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium select-none shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold">Ollama: qwen3:4b</span>
              <span className="text-emerald-500/40">•</span>
              <span>768d Qdrant</span>
            </div>

            {/* Ingest PDF Button */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-xs shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
              title="Upload PDF Research Document"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload PDF</span>
            </button>

            {/* Export Citations Button */}
            <button
              onClick={onOpenExport}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
              title="Export Citations in BibTeX, APA, RIS"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* User Profile / Auth Button */}
            {user ? (
              <div className="flex items-center gap-2 pl-1.5 border-l border-slate-200 dark:border-slate-800">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* MOBILE NAVIGATION DRAWER */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200 dark:border-slate-800 space-y-1 animate-in fade-in slide-in-from-top-1">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/50 dark:border-indigo-800/50'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
