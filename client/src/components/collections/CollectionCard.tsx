import React from 'react';
import { Folder, Network, Sparkles, Download, Trash2, Layers } from 'lucide-react';
import { Collection } from '../../../../shared/types';
import { Badge } from '../common/Badge';

interface CollectionCardProps {
  collection: Collection;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenGraph?: (collectionId: string) => void;
  onSynthesize?: (collection: Collection) => void;
  onExport?: (collection: Collection) => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  isSelected,
  onSelect,
  onDelete,
  onOpenGraph,
  onSynthesize,
  onExport,
}) => {
  return (
    <div
      onClick={() => onSelect(collection.id)}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 shadow-xs'
          : 'bg-white dark:bg-[#171c28] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Folder className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {collection.name}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{collection.paperIds.length} papers</span>
              {collection.isPublic && (
                <Badge variant="emerald" size="xs">
                  Public
                </Badge>
              )}
            </div>
          </div>
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(collection.id);
            }}
            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete Collection"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {collection.description && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {collection.description}
        </p>
      )}

      {/* Action shortcuts */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
        {onOpenGraph && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenGraph(collection.id);
            }}
            className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
            title="View Collection Graph"
          >
            <Network className="w-3 h-3 text-indigo-500" />
            <span>Graph</span>
          </button>
        )}

        {onSynthesize && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSynthesize(collection);
            }}
            className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
            title="Synthesize Literature Review"
          >
            <Sparkles className="w-3 h-3 text-purple-500" />
            <span>Synthesize</span>
          </button>
        )}

        {onExport && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport(collection);
            }}
            className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
            title="Export Citations"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
        )}
      </div>
    </div>
  );
};
