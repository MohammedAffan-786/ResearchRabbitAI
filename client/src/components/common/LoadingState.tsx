import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-2.5 py-6 ${className}`}>
      <Loader2 className={`${sizeClasses} text-indigo-600 dark:text-indigo-400 animate-spin`} />
      {label && (
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
};

interface SkeletonCardProps {
  count?: number;
}

export const SkeletonCardList: React.FC<SkeletonCardProps> = ({ count = 3 }) => {
  return (
    <div className="space-y-3 w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
          <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="space-y-1.5 pt-2">
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/60 rounded"></div>
            <div className="h-3 w-5/6 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading scholarly intelligence...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60">
          <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-800 dark:text-slate-200">{message}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Querying PostgreSQL, Qdrant vectors, and scholarly sources...
      </p>
    </div>
  );
};
