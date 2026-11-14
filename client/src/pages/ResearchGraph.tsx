import React, { useState } from 'react';
import { ResearchFlowGraph } from '../components/graph/ResearchFlowGraph';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
import { GraphData, Paper } from '../../../shared/types';

interface ResearchGraphPageProps {
  graphData: GraphData;
  onExpandNode: (paperId: string) => Promise<void>;
  onSelectPaperForAi: (paperId: string) => void;
  onToggleSelectPaper: (paper: Paper) => void;
  selectedPaperIds: string[];
  libraryPapers: Paper[];
}

export const ResearchGraph: React.FC<ResearchGraphPageProps> = (props) => {
  const [viewMode, setViewMode] = useState<'flow' | 'network'>('flow');

  return (
    <div className="w-full h-full relative animate-in fade-in flex flex-col bg-slate-900 overflow-hidden">
      <div className="flex-1 w-full h-full">
        {viewMode === 'flow' ? (
          <ResearchFlowGraph 
            {...props} 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
          />
        ) : (
          <KnowledgeGraph 
            {...props} 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
          />
        )}
      </div>
    </div>
  );
};

export default ResearchGraph;
