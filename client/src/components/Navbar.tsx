import React from 'react';
import { 
  LayoutDashboard,
  Search, 
  Network, 
  FolderKanban, 
  Sparkles, 
  FileCheck2, 
  Upload, 
  BookOpen, 
  Layers,
  BarChart3,
  User,
  LogOut
} from 'lucide-react';
import { useResearchStore } from '../store/useResearchStore';

export type ActiveTab = 'dashboard' | 'search' | 'graph' | 'library' | 'ai' | 'prisma' | 'reviews' | 'analytics';

interface NavbarProps {
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
  totalLibraryCount
}) => {
  const { user, logout } = useResearchStore();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'search', label: 'Discover', icon: Search, badge: null },
    { id: 'graph', label: 'Citation Graph', icon: Network, badge: null },
    { id: 'library', label: 'Collections', icon: FolderKanban, badge: totalLibraryCount },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles, badge: 'RAG' },
    { id: 'prisma', label: 'PRISMA Review', icon: FileCheck2, badge: null },
    { id: 'reviews', label: 'Reviews', icon: BookOpen, badge: null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: 'New' },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#090d16]/90 border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => setActiveTab('search')}>
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-bold text-sm shadow-xs border border-slate-800 dark:border-slate-200 transition-all">
              🐇
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-sm">
                ResearchRabbit
              </span>
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>FastAPI • Qdrant</span>
              </div>
            </div>
          </div>

          {/* Segmented Navigation Bar (Linear Style) */}
          <nav className="hidden lg:flex items-center gap-0.5 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700/80 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                      isActive 
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50' 
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action cluster: Auth, Upload, Basket */}
          <div className="flex items-center gap-1.5">
            {/* User Auth */}
            {user ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="font-medium text-slate-700 dark:text-slate-300 max-w-[100px] truncate">{user.full_name || user.email}</span>
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-rose-500 p-0.5 ml-0.5 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all cursor-pointer shadow-xs"
              >
                <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>Sign In</span>
              </button>
            )}

            {/* Upload PDF */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all shadow-xs cursor-pointer"
              title="Upload PDF paper for PyMuPDF intelligence extraction"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Upload PDF</span>
            </button>

            {/* Selection Basket */}
            <button
              onClick={onOpenExport}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                selectedPaperIds.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Basket</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedPaperIds.length > 0
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {selectedPaperIds.length}
              </span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
