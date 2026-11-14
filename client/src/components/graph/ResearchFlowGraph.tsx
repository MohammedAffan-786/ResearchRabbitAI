import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
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
import { GraphData, Paper } from '../../../../shared/types';
import { Sparkles, Plus, Flame, Network, Filter, Info, ShieldCheck, Tag, User, LayoutGrid } from 'lucide-react';
import { useResearchStore } from '../../store/useResearchStore';

interface ResearchFlowGraphProps {
  graphData: GraphData;
  onExpandNode: (paperId: string) => Promise<void>;
  onSelectPaperForAi: (paperId: string) => void;
  onToggleSelectPaper: (paper: Paper) => void;
  selectedPaperIds: string[];
  libraryPapers: Paper[];
  viewMode?: 'flow' | 'network';
  onViewModeChange?: (mode: 'flow' | 'network') => void;
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
  selectedPaperIds,
  viewMode,
  onViewModeChange
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
      (n.title || (n as any).label || '').toLowerCase().includes(term) ||
      (n.authors || []).some(a => {
        const name = typeof a === 'string' ? a : (a as any)?.name || '';
        return name.toLowerCase().includes(term);
      }) ||
      (n.fields || []).some(f => (f || '').toLowerCase().includes(term))
    );
  }, [graphData.nodes, searchFilter]);

  // Convert graphData nodes to ReactFlow nodes with collision-free D3 force layout
  const initialNodes: Node[] = useMemo(() => {
    if (!filteredGraphNodes.length) return [];
    const total = filteredGraphNodes.length;

    // Simulation nodes setup
    const simNodes = filteredGraphNodes.map((n, idx) => {
      const angle = (idx / total) * 2 * Math.PI;
      const initialRadius = Math.max(420, total * 45);
      return {
        id: n.id,
        x: 750 + initialRadius * Math.cos(angle),
        y: 500 + initialRadius * Math.sin(angle),
        raw: n
      };
    });

    const nodeIds = new Set(simNodes.map(sn => sn.id));

    // Simulation links to pull connected papers closer
    const simLinks = (graphData.links || [])
      .map(l => ({
        source: typeof l.source === 'object' ? (l.source as any).id : l.source,
        target: typeof l.target === 'object' ? (l.target as any).id : l.target,
      }))
      .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

    // D3 force simulation with collision radius to eliminate any card overlap
    const simulation = d3.forceSimulation(simNodes as any)
      .force('charge', d3.forceManyBody().strength(-2200))
      .force('center', d3.forceCenter(750, 500))
      .force('collision', d3.forceCollide().radius((d: any) => {
        const isAuthorOrTopic = (
          d.raw.type === 'author' || 
          d.raw.nodeType === 'author' || 
          d.raw.type === 'topic' || 
          d.raw.nodeType === 'topic'
        );
        return isAuthorOrTopic ? 150 : 255;
      }))
      .force('link', d3.forceLink(simLinks).id((d: any) => d.id).distance(320).strength(0.15))
      .stop();

    // Run static ticks to settle layout
    for (let i = 0; i < 140; ++i) simulation.tick();

    return simNodes.map((simNode) => {
      const n = simNode.raw;
      const x = simNode.x;
      const y = simNode.y;

      const isAuthorNode = (n as any).type === 'author' || n.nodeType === 'author';
      const isTopicNode = (n as any).type === 'topic' || n.nodeType === 'topic';
      const isSelected = selectedPaperIds.includes(n.id);
      const color = CLUSTER_COLORS[n.group || 1] || '#6366f1';

      if (isAuthorNode) {
        const authorName = (n as any).label || n.title || 'Scholarly Author';
        return {
          id: n.id,
          position: { x, y },
          data: {
            label: (
              <div className={`p-2 px-3.5 rounded-full border shadow-sm flex items-center gap-2 text-xs font-semibold select-none ${
                isDark 
                  ? 'bg-slate-900 border-emerald-500/40 text-emerald-300 shadow-emerald-950/20' 
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-emerald-100'
              }`}>
                <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate max-w-[140px]">{authorName}</span>
                <span className="text-[10px] opacity-75 font-mono">{(n.citations || 0).toLocaleString()} cites</span>
              </div>
            )
          }
        };
      }

      if (isTopicNode) {
        return {
          id: n.id,
          position: { x, y },
          data: {
            label: (
              <div className={`p-2.5 px-4 rounded-full border shadow-sm flex items-center gap-2 text-xs font-semibold select-none ${
                isDark 
                  ? 'bg-slate-900 border-cyan-500/40 text-cyan-300 shadow-cyan-950/20' 
                  : 'bg-cyan-50 border-cyan-300 text-cyan-800 shadow-cyan-100'
              }`}>
                <Tag className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span className="truncate max-w-[160px]">{n.title || (n as any).label}</span>
              </div>
            )
          }
        };
      }

      // Format author string safely
      const authorList = (n.authors && Array.isArray(n.authors) && n.authors.length > 0)
        ? n.authors
            .slice(0, 2)
            .map((a: any) => (typeof a === 'string' ? a : a?.name || a?.full_name || 'Author'))
            .join(', ')
        : 'Academic Researchers';

      const paperTitle = n.title || (n as any).label || 'Seminal Research Publication';

      return {
        id: n.id,
        position: { x, y },
        data: {
          label: (
            <div className={`p-4 rounded-2xl backdrop-blur-md transition-all duration-150 w-[290px] select-none bg-[#181d2a]/95 text-slate-100 border border-slate-700/80 shadow-2xl shadow-black/60 ${
              isSelected ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-emerald-950/40' : 'hover:border-slate-500/90 hover:shadow-2xl'
            }`}>
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span 
                  className="px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white font-mono tracking-tight shadow-xs" 
                  style={{ backgroundColor: color }}
                >
                  {n.year || '2023'}
                </span>
                <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />
                  {(n.citations || 0).toLocaleString()}
                </span>
              </div>
              <p 
                className="font-semibold line-clamp-2 leading-snug text-[13px] text-slate-100" 
                title={paperTitle}
              >
                {paperTitle}
              </p>
              <p className="text-xs truncate mt-1.5 text-slate-400 font-medium">
                {authorList}
              </p>
              
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-700/60">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpandNode(n.id);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                  title="Expand citations to discover related papers"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Expand</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPaperForAi(n.id);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60"
                  title="Send to AI Assistant basket"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ask AI</span>
                </button>
              </div>
            </div>
          )
        }
      };
    });
  }, [filteredGraphNodes, graphData.links, selectedPaperIds, onExpandNode, onSelectPaperForAi, isDark]);

  // Convert graphData links to ReactFlow edges with visual distinction matching the relationship legend
  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(filteredGraphNodes.map(n => n.id));
    const authorNodeIds = new Set(
      filteredGraphNodes
        .filter(n => (n as any).type === 'author' || n.nodeType === 'author' || String(n.id).startsWith('author-'))
        .map(n => n.id)
    );

    return (graphData.links || [])
      .filter(link => {
        const source = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const target = typeof link.target === 'object' ? (link.target as any).id : link.target;
        if (!nodeIds.has(source) || !nodeIds.has(target)) return false;

        const isCitation = link.type === 'cites' || link.type === 'citation' || Boolean(link.isVerifiedCitation);
        const isAuthored = (
          link.type === 'authored' || 
          link.type === 'author_collaboration' || 
          link.type === 'author' || 
          authorNodeIds.has(source) || 
          authorNodeIds.has(target)
        );
        const isSemantic = !isCitation && !isAuthored;

        if (edgeFilter === 'cites') return isCitation;
        if (edgeFilter === 'semantic') return isSemantic;
        if (edgeFilter === 'author') return isAuthored;
        return true;
      })
      .map((link, idx) => {
        const source = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const target = typeof link.target === 'object' ? (link.target as any).id : link.target;
        
        const isAuthorCollaboration = (
          link.type === 'authored' || 
          link.type === 'author_collaboration' || 
          link.type === 'author' || 
          authorNodeIds.has(source) || 
          authorNodeIds.has(target)
        );
        const isVerifiedCitation = !isAuthorCollaboration && (link.type === 'cites' || link.type === 'citation' || Boolean(link.isVerifiedCitation));
        const isSemanticSimilarity = !isAuthorCollaboration && !isVerifiedCitation;

        let strokeColor = isDark ? '#60a5fa' : '#2563eb';
        let strokeDasharray: string | undefined = undefined;
        let strokeWidth = 2.0;

        if (isAuthorCollaboration) {
          // Solid Green: Shared Authorship
          strokeColor = isDark ? '#34d399' : '#059669';
          strokeWidth = 2.4;
          strokeDasharray = 'none';
        } else if (isVerifiedCitation) {
          // Solid Blue: Verified Direct Citation (strictly solid line with arrow marker)
          strokeColor = isDark ? '#60a5fa' : '#2563eb';
          strokeWidth = 2.4;
          strokeDasharray = 'none';
        } else if (isSemanticSimilarity) {
          // Dashed Purple: Semantic Similarity
          strokeColor = isDark ? '#c084fc' : '#9333ea';
          strokeWidth = 2.0;
          strokeDasharray = '6 6';
        }

        return {
          id: link.id || `e-${source}-${target}-${idx}`,
          source,
          target,
          animated: false,
          style: {
            stroke: strokeColor,
            strokeWidth,
            strokeDasharray,
            opacity: 0.85
          },
          markerEnd: isVerifiedCitation ? {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 14,
            height: 14
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
      
      {/* Floating Header Dock (Filter Bar, Search & Integrated View Mode Switcher) */}
      <div className="absolute top-4 left-4 right-4 z-10 backdrop-blur-md px-3.5 py-2 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2.5 shadow-lg bg-slate-800/90 border-slate-700/80 text-slate-200 transition">
        {/* Left: Brand / Title, Filters, and Search */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold flex items-center gap-1.5 text-slate-100 shrink-0">
            <Network className="w-4 h-4 text-emerald-400" />
            <span>Citation Network</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
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
              className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-28 sm:w-36 transition"
            />
          </div>
        </div>

        {/* Right: Integrated View Switcher */}
        {onViewModeChange && (
          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700/80 rounded-lg p-0.5 shrink-0 ml-auto">
            <button
              onClick={() => onViewModeChange('flow')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                viewMode === 'flow'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Lineage Flow Cards view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Card Flow</span>
            </button>
            <button
              onClick={() => onViewModeChange('network')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                viewMode === 'network'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="D3 Force-Directed Network Graph"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Force Network</span>
            </button>
          </div>
        )}
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
