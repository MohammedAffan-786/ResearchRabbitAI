import React, { useState } from 'react';
import { LiteratureReviewView } from '../components/LiteratureReviewView';
import { PrismaReview } from '../components/PrismaReview';
import { LiteratureReview as LitReviewType, Paper, PrismaProject } from '../../../shared/types';
import { BookOpen, FileCheck2 } from 'lucide-react';

interface LiteratureReviewPageProps {
  reviews: LitReviewType[];
  papers: Paper[];
  prismaProjects?: PrismaProject[];
  onCreatePrismaProject?: (title: string, question: string) => Promise<void>;
  onScreenPaper?: (projectId: string, paperId: string, stage: any, reason?: string) => Promise<void>;
  onDeleteReview: (id: string) => Promise<void>;
  onExportReview: (reviewId: string, format: 'markdown' | 'csv') => Promise<void>;
  onInspectPaper: (paper: Paper) => void;
}

export const LiteratureReview: React.FC<LiteratureReviewPageProps> = ({
  reviews,
  papers,
  prismaProjects = [],
  onCreatePrismaProject,
  onScreenPaper,
  onDeleteReview,
  onExportReview,
  onInspectPaper,
}) => {
  const [subView, setSubView] = useState<'reviews' | 'prisma'>('reviews');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      {/* Top Toggle between Systematic Reviews & PRISMA 2020 Protocol */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Literature Reviews & PRISMA Protocols
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Synthesize cross-paper thematic matrices or conduct systematic PRISMA 2020 screenings.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <button
            onClick={() => setSubView('reviews')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              subView === 'reviews'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Thematic Reviews ({reviews.length})</span>
          </button>

          <button
            onClick={() => setSubView('prisma')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              subView === 'prisma'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>PRISMA 2020 Projects</span>
          </button>
        </div>
      </div>

      {subView === 'reviews' ? (
        <LiteratureReviewView
          reviews={reviews}
          papers={papers}
          onDeleteReview={onDeleteReview}
          onExportReview={onExportReview}
          onInspectPaper={onInspectPaper}
        />
      ) : (
        <PrismaReview
          papers={papers}
          prismaProjects={prismaProjects}
          onCreateProject={onCreatePrismaProject || (async () => {})}
          onScreenPaper={onScreenPaper || (async () => {})}
          reviews={reviews}
          onExportReview={onExportReview}
          onInspectPaper={onInspectPaper}
        />
      )}
    </div>
  );
};

export default LiteratureReview;
