import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download, RefreshCw } from 'lucide-react';

interface GraphControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onResetLayout?: () => void;
  onExportJson?: () => void;
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetLayout,
  onExportJson,
}) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-xs text-slate-700 dark:text-slate-300">
      {onZoomIn && (
        <button
          onClick={onZoomIn}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      )}
      {onZoomOut && (
        <button
          onClick={onZoomOut}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      )}
      {onFitView && (
        <button
          onClick={onFitView}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Fit View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
      {onResetLayout && (
        <button
          onClick={onResetLayout}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Reset Layout"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
      {onExportJson && (
        <button
          onClick={onExportJson}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Export Graph Network JSON"
        >
          <Download className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
