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
  const { theme } = useResearchStore();
  const isDark = theme === 'dark';
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
      const initialRadius = Math.max(380, total * 36);
      return {
        id: n.id,
        x: 650 + initialRadius * Math.cos(angle),
        y: 450 + initialRadius * Math.sin(angle),
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
      .force('charge', d3.forceManyBody().strength(-1600))
      .force('center', d3.forceCenter(700, 500))
      .force('collision', d3.forceCollide().radius((d: any) => {
        const isAuthorOrTopic = (
          d.raw.type === 'author' || 
          d.raw.nodeType === 'author' || 
          d.raw.type === 'topic' || 
          d.raw.nodeType === 'topic'
        );
        return isAuthorOrTopic ? 130 : 210;
      }))
      .force('link', d3.forceLink(simLinks).id((d: any) => d.id).distance(280).strength(0.25))
      .stop();

    // Run static ticks to settle layout
    for (let i = 0; i < 110; ++i) simulation.tick();

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
            <div className={`p-3.5 rounded-xl backdrop-blur-md text-xs transition-all duration-150 w-[260px] shadow-md select-none ${
              isDark 
                ? 'bg-slate-900/95 text-slate-100 border border-slate-700/80 shadow-black/40' 
                : 'bg-white/95 text-slate-900 border border-slate-300 shadow-slate-200/60'
            } ${
              isSelected ? 'ring-2 ring-primary-500 border-primary-500' : 'hover:border-primary-400'
            }`}>
              <div className="flex items-center justify-between gap-1 mb-2">
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-bold text-white font-mono tracking-tight" 
                  style={{ backgroundColor: color }}
                >
                  {n.year || '2023'}
                </span>
                <span className="text-[11px] text-amber-500 font-bold flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-amber-500" />
                  {(n.citations || 0).toLocaleString()}
                </span>
              </div>
              <p 
                className={`font-semibold line-clamp-2 leading-snug text-xs ${isDark ? 'text-slate-100' : 'text-slate-900'}`} 
                title={paperTitle}
              >
                {paperTitle}
              </p>
              <p className={`text-[11px] truncate mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {authorList}
              </p>
              
              <div className={`flex items-center gap-1.5 mt-2.5 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpandNode(n.id);
                  }}
                  className="px-2 py-1 rounded-md bg-primary-600 hover:bg-primary-500 text-white font-medium text-[10px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                  title="Expand citations to discover related papers"
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
                  title="Send to AI Assistant basket"
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
    <div className={`w-full h-[calc(100vh-3.5rem)] relative transition-colors duration-150 ${
      isDark ? 'bg-[#090d16]' : 'bg-[#fcfcfd]'
    }`}>
      
      {/* Floating Header Dock (Filter Bar, Search & Integrated View Mode Switcher) */}
      <div className={`absolute top-4 left-4 right-4 z-10 backdrop-blur-md px-3.5 py-2 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2.5 shadow-sm transition ${
        isDark 
          ? 'bg-slate-900/90 border-slate-800 text-slate-300' 
          : 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-200/60'
      }`}>
        {/* Left: Brand / Title, Filters, and Search */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold flex items-center gap-1.5 text-[var(--foreground)] shrink-0">
            <Network className="w-4 h-4 text-primary-500" />
            <span>Citation Network</span>
          </span>
          <span className="text-[var(--muted)] hidden sm:inline">•</span>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setEdgeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                edgeFilter === 'all'
                  ? 'bg-primary-600 text-white font-semibold shadow-xs'
                  : 'hover:bg-[var(--canvas)] text-[var(--muted)]'
              }`}
            >
              All Edges ({graphData.links?.length || 0})
            </button>
            <button
              onClick={() => setEdgeFilter('cites')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1 cursor-pointer ${
                edgeFilter === 'cites'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'hover:bg-[var(--canvas)] text-[var(--muted)]'
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
                  : 'hover:bg-[var(--canvas)] text-[var(--muted)]'
              }`}
            >
              Semantic Clusters
            </button>
            <button
              onClick={() => setEdgeFilter('author')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                edgeFilter === 'author'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
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
              className="px-2.5 py-1 rounded-lg bg-[var(--canvas)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-primary-500 w-28 sm:w-36 transition"
            />
          </div>
        </div>

        {/* Right: Integrated View Switcher */}
        {onViewModeChange && (
          <div className="flex items-center gap-1 bg-[var(--canvas)] border border-[var(--border)] rounded-lg p-0.5 shrink-0 ml-auto">
            <button
              onClick={() => onViewModeChange('flow')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                viewMode === 'flow'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
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
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
              title="D3 Force-Directed Network Graph"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Force Network</span>
            </button>
          </div>
        )}
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
