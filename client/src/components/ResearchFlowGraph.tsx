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
  // Always maintain deep cosmic dark background matching Force Network graph
  const isDark = true;
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
    <div className="w-full h-full relative overflow-hidden bg-radial from-slate-800/40 via-slate-900 to-slate-950 text-slate-100">
      
      {/* Floating Header Dock (Filter Bar & Stats) */}
      <div className="absolute top-4 left-4 z-10 backdrop-blur-md px-4 py-2.5 rounded-xl border text-xs flex flex-wrap items-center gap-3 shadow-lg bg-slate-800/90 border-slate-700/80 text-slate-200 transition">
        <span className="font-semibold flex items-center gap-2 text-slate-100">
          <Network className="w-4 h-4 text-emerald-400" />
          <span>Citation Network</span>
        </span>
        <span className="text-slate-600">•</span>

        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEdgeFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
              edgeFilter === 'all'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            All Edges ({graphData.links?.length || 0})
          </button>
          <button
            onClick={() => setEdgeFilter('cites')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1 cursor-pointer ${
              edgeFilter === 'cites'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-blue-300" />
            <span>Verified Citations</span>
          </button>
          <button
            onClick={() => setEdgeFilter('semantic')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
              edgeFilter === 'semantic'
                ? 'bg-purple-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            Semantic Clusters
          </button>
          <button
            onClick={() => setEdgeFilter('author')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
              edgeFilter === 'author'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
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
            className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-32 sm:w-44 transition"
          />
        </div>
      </div>

      {/* Relationship Legend (Bottom Right Dock - Elevated & Enlarged) */}
      <div className="absolute bottom-10 right-6 z-20 backdrop-blur-md p-4 rounded-2xl border border-slate-700/90 shadow-2xl space-y-2.5 bg-slate-800/95 text-slate-100 min-w-[280px] select-none">
        <p className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-slate-700/60 pb-2">
          <Info className="w-4 h-4 text-emerald-400" />
          <span>Relationship Legend</span>
        </p>
        <div className="space-y-2 text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-1 rounded-full bg-blue-400 shrink-0 shadow-sm" />
            <span className="text-slate-200">Solid Blue: Verified Direct Citation</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-1 border-t-2 border-dashed border-purple-400 shrink-0" />
            <span className="text-slate-200">Dashed Purple: Semantic Similarity</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-1 rounded-full bg-emerald-400 shrink-0 shadow-sm" />
            <span className="text-slate-200">Solid Green: Shared Authorship</span>
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
          gap={22} 
          size={1.2} 
          color="#334155" 
        />
        <Controls 
          position="bottom-left"
          style={{ bottom: '2.5rem', left: '1.5rem' }}
          className="rounded-2xl! border! shadow-2xl! bg-slate-800/95! border-slate-700/80! fill-slate-300! text-slate-300!" 
        />
        <MiniMap
          nodeColor="#6366f1"
          maskColor="rgba(15, 23, 42, 0.75)"
          className="rounded-xl! border! bg-slate-900/90! border-slate-700/80!"
        />
      </ReactFlow>

    </div>
  );
};
