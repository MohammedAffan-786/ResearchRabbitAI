import React from 'react';
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
  ChevronLeft,
  ChevronRight,
  Database,
  Cpu,
  Layers
} from 'lucide-react';
import { useResearchStore } from '../../store/useResearchStore';

export type NavTabId =
  | 'dashboard'
  | 'search'
  | 'graph'
  | 'library'
  | 'ai'
  | 'prisma'
  | 'reviews'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onOpenAuth: () => void;
  totalLibraryCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onOpenUpload,
  onOpenExport,
  onOpenAuth,
  totalLibraryCount,
}) => {
  const { activeTab, setActiveTab, user, logout, theme, toggleTheme } = useResearchStore();

  const navSections = [
    {
      title: 'DISCOVERY',
      items: [
        { id: 'dashboard' as NavTabId, label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'search' as NavTabId, label: 'Discover', icon: Search, badge: null },
        { id: 'graph' as NavTabId, label: 'Citation Graph', icon: Network, badge: null },
      ]
    },
    {
      title: 'WORKSPACE',
      items: [
        { id: 'library' as NavTabId, label: 'Collections', icon: FolderKanban, badge: totalLibraryCount },
        { id: 'ai' as NavTabId, label: 'AI Assistant', icon: Sparkles, badge: 'RAG' },
        { id: 'prisma' as NavTabId, label: 'PRISMA Review', icon: FileCheck2, badge: null },
        { id: 'reviews' as NavTabId, label: 'Reviews', icon: BookOpen, badge: null },
      ]
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { id: 'analytics' as NavTabId, label: 'Analytics', icon: BarChart3, badge: 'Live' },
        { id: 'settings' as NavTabId, label: 'Settings', icon: Settings, badge: null },
      ]
    }
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-xl transition-all duration-200 select-none z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-slate-200/80 dark:border-slate-800/80">
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer min-w-0"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-950 dark:from-indigo-600 dark:to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-xs border border-indigo-500/20 flex-shrink-0">
            🐇
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-sm truncate">
                ResearchRabbit
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                FastAPI • Qdrant
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick Action Button: Upload Paper */}
      <div className="p-3">
        <button
          onClick={onOpenUpload}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-xs shadow-indigo-500/25 transition-all cursor-pointer active:scale-98 ${
            isCollapsed ? 'px-2' : ''
          }`}
          title="Upload Research PDF"
        >
          <Upload className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Ingest PDF Paper</span>}
        </button>
      </div>

      {/* Nav items list grouped by section */}
      <nav className="flex-1 px-2.5 space-y-4 overflow-y-auto scrollbar-none py-1">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-0.5">
            {!isCollapsed && (
              <div className="px-2.5 pb-1 text-[10px] font-bold tracking-wider text-slate-400/80 dark:text-slate-500 uppercase">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs border border-indigo-200/60 dark:border-indigo-800/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge !== null && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                            isActive
                              ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section: Engine status, User, Theme */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
        {!isCollapsed && (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Ollama Engine</span>
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">qwen3:4b</span>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span>Vector Store</span>
              <span className="font-mono">768d Qdrant</span>
            </div>
          </div>
        )}

        <button
          onClick={onOpenExport}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          title="Export Citations"
        >
          <Download className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {!isCollapsed && <span>Export Citations</span>}
        </button>

        <div className="flex items-center justify-between gap-1 pt-1">
          {/* Theme switch */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {!isCollapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>

          {/* User profile / login */}
          {user ? (
            <div className="flex items-center gap-1.5">
              {!isCollapsed && (
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate max-w-[90px]">
                  {user.full_name || user.email.split('@')[0]}
                </span>
              )}
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Sign in / Register"
            >
              <User className="w-3.5 h-3.5" />
              {!isCollapsed && <span>Sign In</span>}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
