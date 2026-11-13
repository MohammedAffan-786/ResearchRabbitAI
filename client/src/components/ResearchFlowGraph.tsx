import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GraphData, Paper } from '../../../shared/types';
import { Sparkles, Plus, Flame, Network, Filter, Info, ShieldCheck, Tag } from 'lucide-react';
import { useResearchStore } from '../store/useResearchStore';

interface ResearchFlowGraphProps {
  graphData: GraphData;
  onExpandNode: (paperId: string) => Promise<void>;
  onSelectPaperForAi: (paperId: string) => void;
  onToggleSelectPaper: (paper: Paper) => void;
  selectedPaperIds: string[];
  libraryPapers: Paper[];
}

const CLUSTER_COLORS: Record<number, string> = {
  1: '#6366f1', // NLP / Transformers (Indigo)
  2: '#8b5cf6', // Vision (Violet)
  3: '#10b981', // Bio / Medicine (Emerald)
  4: '#f59e0b', // Quantum / Physics (Amber)
  5: '#ec4899', // RL / Alignment (Pink)
  6: '#06b6d4'  // Systems / RAG (Cyan)
};

export const ResearchFlowGraph: React.FC<ResearchFlowGraphProps> = ({
  graphData,
  onExpandNode,
  onSelectPaperForAi,
  selectedPaperIds
}) => {
  const { theme } = useResearchStore();
  const isDark = theme === 'dark';
  const [edgeFilter, setEdgeFilter] = useState<'all' | 'cites' | 'semantic' | 'author'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Filtered nodes
  const filteredGraphNodes = useMemo(() => {
    if (!searchFilter.trim()) return graphData.nodes || [];
    const term = searchFilter.toLowerCase();
    return (graphData.nodes || []).filter(n =>
      (n.title || '').toLowerCase().includes(term) ||
      (n.authors || []).some(a => (a || '').toLowerCase().includes(term)) ||
      (n.fields || []).some(f => (f || '').toLowerCase().includes(term))
    );
  }, [graphData.nodes, searchFilter]);

  // Convert graphData nodes to ReactFlow nodes
  const initialNodes: Node[] = useMemo(() => {
    const total = filteredGraphNodes.length || 1;
    const radius = Math.min(420, total * 35);

    return filteredGraphNodes.map((n, idx) => {
      // Circular layout
      const angle = (idx / total) * 2 * Math.PI;
      const r = radius * (0.65 + (idx % 3) * 0.2);
      const x = 500 + r * Math.cos(angle);
      const y = 350 + r * Math.sin(angle);

      const color = CLUSTER_COLORS[n.group || 1] || '#6366f1';
      const isSelected = selectedPaperIds.includes(n.id);
      const isTopicNode = n.nodeType === 'topic';

      if (isTopicNode) {
        return {
          id: n.id,
          position: { x, y },
          data: {
            label: (
              <div className={`p-2.5 rounded-full px-4 border shadow-sm flex items-center gap-2 text-xs font-semibold ${
                isDark ? 'bg-slate-900 border-cyan-500/40 text-cyan-400' : 'bg-cyan-50 border-cyan-300 text-cyan-800'
              }`}>
                <Tag className="w-3.5 h-3.5" />
                <span>{n.title}</span>
              </div>
            )
          }
        };
      }

      return {
        id: n.id,
        position: { x, y },
        data: {
          label: (
            <div className={`p-3 rounded-xl backdrop-blur-md text-xs transition-all duration-150 min-w-[210px] max-w-[250px] shadow-sm ${
              isDark 
                ? 'bg-slate-900/95 text-slate-100 border border-slate-800' 
                : 'bg-white/95 text-slate-900 border border-slate-200'
            } ${
              isSelected ? 'ring-2 ring-primary-500 border-primary-500' : 'hover:border-primary-400'
            }`}>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white font-mono" style={{ backgroundColor: color }}>
                  {n.year || 'N/A'}
                </span>
                <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-amber-500" />
                  {(n.citations || 0).toLocaleString()}
                </span>
              </div>
              <p className={`font-semibold line-clamp-2 leading-snug ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{n.title}</p>
              <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{(n.authors || []).slice(0, 2).join(', ') || 'Scholarly Authors'}</p>
              
              <div className={`flex items-center gap-1.5 mt-2.5 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpandNode(n.id);
                  }}
                  className="px-2 py-1 rounded-md bg-primary-600 hover:bg-primary-500 text-white font-medium text-[10px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                  title="Expand citations"
                >
                  <Plus className="w-3 h-3" />
                  <span>Expand</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPaperForAi(n.id);
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1 cursor-pointer transition ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-primary-500" />
                  <span>Ask AI</span>
                </button>
              </div>
            </div>
          )
        }
      };
    });
  }, [filteredGraphNodes, selectedPaperIds, onExpandNode, onSelectPaperForAi, isDark]);

  // Convert graphData links to ReactFlow edges with visual distinction
  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(filteredGraphNodes.map(n => n.id));

    return graphData.links
      .filter(link => {
        const source = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const target = typeof link.target === 'object' ? (link.target as any).id : link.target;
        if (!nodeIds.has(source) || !nodeIds.has(target)) return false;

        if (edgeFilter === 'cites') return link.type === 'cites';
        if (edgeFilter === 'semantic') return link.type === 'semantic_similarity';
        if (edgeFilter === 'author') return link.type === 'author_collaboration';
        return true;
      })
      .map((link, idx) => {
        const source = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const target = typeof link.target === 'object' ? (link.target as any).id : link.target;
        const isVerifiedCitation = link.type === 'cites' || link.isVerifiedCitation;
        const isSemanticSimilarity = link.type === 'semantic_similarity';
        const isAuthorCollaboration = link.type === 'author_collaboration';

        let strokeColor = '#6366f1';
        let strokeDasharray = undefined;

        if (isVerifiedCitation) {
          strokeColor = isDark ? '#60a5fa' : '#2563eb'; // Solid Blue
        } else if (isSemanticSimilarity) {
          strokeColor = isDark ? '#c084fc' : '#9333ea'; // Purple
          strokeDasharray = '5 5'; // Dashed
        } else if (isAuthorCollaboration) {
          strokeColor = isDark ? '#34d399' : '#059669'; // Emerald Green
        }

        return {
          id: link.id || `e-${source}-${target}-${idx}`,
          source,
          target,
          animated: isVerifiedCitation,
          style: {
            stroke: strokeColor,
            strokeWidth: isVerifiedCitation ? 2.0 : 1.4,
            strokeDasharray,
            opacity: 0.75
          },
          markerEnd: isVerifiedCitation ? {
            type: MarkerType.ArrowClosed,
            color: strokeColor
          } : undefined
        };
      });
  }, [graphData.links, filteredGraphNodes, edgeFilter, isDark]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className={`w-full h-[calc(100vh-3.5rem)] relative transition-colors duration-150 ${
      isDark ? 'bg-[#090d16]' : 'bg-[#fcfcfd]'
    }`}>
      
      {/* Floating Header Dock (Filter Bar & Stats) */}
      <div className={`absolute top-4 left-4 z-10 backdrop-blur-md px-4 py-2.5 rounded-xl border text-xs flex flex-wrap items-center gap-3 shadow-sm transition ${
        isDark 
          ? 'bg-slate-900/90 border-slate-800 text-slate-300' 
          : 'bg-white/90 border-slate-200 text-slate-700'
      }`}>
        <span className="font-semibold flex items-center gap-2 text-[var(--foreground)]">
          <Network className="w-4 h-4 text-primary-500" />
          <span>Citation Network</span>
        </span>
        <span className="text-[var(--muted)]">•</span>

        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEdgeFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
              edgeFilter === 'all'
                ? 'bg-primary-600 text-white font-semibold'
                : 'hover:bg-[var(--canvas)] text-[var(--muted)]'
            }`}
          >
            All Edges ({graphData.links.length})
          </button>
          <button
            onClick={() => setEdgeFilter('cites')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1 ${
              edgeFilter === 'cites'
                ? 'bg-blue-600 text-white font-semibold'
                : 'hover:bg-[var(--canvas)] text-[var(--muted)]'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-blue-400" />
            <span>Verified Citations</span>
          </button>
          <button
            onClick={() => setEdgeFilter('semantic')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
              edgeFilter === 'semantic'
                ? 'bg-purple-600 text-white font-semibold'
                : 'hover:bg-[var(--canvas)] text-[var(--muted)]'
            }`}
          >
            Semantic Clusters
          </button>
          <button
            onClick={() => setEdgeFilter('author')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
              edgeFilter === 'author'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'hover:bg-[var(--canvas)] text-[var(--muted)]'
            }`}
          >
            Co-Authors
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Filter nodes..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[var(--canvas)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-primary-500 w-32 sm:w-44"
          />
        </div>
      </div>

      {/* Relationship Legend (Bottom Right Dock) */}
      <div className={`absolute bottom-4 right-4 z-10 backdrop-blur-md p-3.5 rounded-xl border text-xs shadow-sm space-y-2 ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white/90 border-slate-200 text-slate-700'
      }`}>
        <p className="font-semibold text-[11px] uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          <span>Relationship Legend</span>
        </p>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-blue-500 shrink-0" />
            <span>Solid Blue: Verified Direct Citation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-purple-500 shrink-0" />
            <span>Dashed Purple: Semantic Similarity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-emerald-500 shrink-0" />
            <span>Solid Green: Shared Authorship</span>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="w-full h-full"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color={isDark ? '#1e293b' : '#cbd5e1'} 
        />
        <Controls 
          className={`rounded-xl! border! shadow-xs! ${
            isDark 
              ? 'bg-slate-900! border-slate-800! fill-slate-300!' 
              : 'bg-white! border-slate-200! fill-slate-600!'
          }`} 
        />
        <MiniMap
          nodeColor={isDark ? '#6366f1' : '#4f46e5'}
          maskColor={isDark ? 'rgba(9, 13, 22, 0.75)' : 'rgba(248, 250, 252, 0.75)'}
          className={`rounded-xl! border! ${
            isDark ? 'bg-slate-900! border-slate-800!' : 'bg-white! border-slate-200!'
          }`}
        />
      </ReactFlow>

    </div>
  );
};
