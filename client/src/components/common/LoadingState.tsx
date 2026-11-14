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
    <div className="space-y-3.5 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#171c28]/80 shadow-xs relative overflow-hidden space-y-3.5 animate-pulse"
        >
          {/* Shimmer bar effect */}
          <div className="flex items-center gap-2">
            <div className="h-4.5 w-14 bg-slate-200 dark:bg-[#242c3d] rounded-md"></div>
            <div className="h-4.5 w-24 bg-slate-200 dark:bg-[#242c3d] rounded-md"></div>
            <div className="h-4.5 w-28 bg-slate-200 dark:bg-[#242c3d] rounded-md"></div>
            <div className="h-4.5 w-16 bg-slate-200 dark:bg-[#242c3d] rounded-md ml-auto"></div>
          </div>
          <div className="space-y-1.5">
            <div className="h-5 w-5/6 bg-slate-200 dark:bg-[#242c3d] rounded-lg"></div>
            <div className="h-4 w-1/2 bg-slate-100 dark:bg-[#1c2230] rounded-md"></div>
          </div>
          <div className="h-10 w-full bg-slate-100/70 dark:bg-[#141824] rounded-xl border border-slate-200/40 dark:border-white/5"></div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-20 bg-slate-200 dark:bg-[#242c3d] rounded-lg"></div>
              <div className="h-7 w-20 bg-slate-200 dark:bg-[#242c3d] rounded-lg"></div>
            </div>
            <div className="h-4 w-28 bg-slate-100 dark:bg-[#1c2230] rounded-md"></div>
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
