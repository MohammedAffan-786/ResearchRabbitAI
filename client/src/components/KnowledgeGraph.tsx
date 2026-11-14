import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Sparkles, 
  Network, 
  Plus, 
  Layers, 
  Calendar, 
  Filter, 
  Share2,
  X,
  BookOpen,
  ArrowRight,
  LayoutGrid
} from 'lucide-react';
import { GraphData, GraphNode, GraphLink, Paper } from '../../../shared/types';

interface KnowledgeGraphProps {
  graphData: GraphData;
  onExpandNode: (paperId: string) => Promise<void>;
  onSelectPaperForAi: (paperId: string) => void;
  onToggleSelectPaper: (paper: Paper) => void;
  selectedPaperIds: string[];
  libraryPapers: Paper[];
  viewMode?: 'flow' | 'network';
  onViewModeChange?: (mode: 'flow' | 'network') => void;
}

const CLUSTER_COLORS: Record<number, { bg: string; border: string; label: string }> = {
  1: { bg: '#3b82f6', border: '#1d4ed8', label: 'Natural Language Processing' },
  2: { bg: '#8b5cf6', border: '#6d28d9', label: 'Computer Vision' },
  3: { bg: '#10b981', border: '#047857', label: 'Bioinformatics & Genetics' },
  4: { bg: '#f59e0b', border: '#d97706', label: 'Quantum Computing' },
  5: { bg: '#ec4899', border: '#be185d', label: 'Reinforcement Learning' },
  6: { bg: '#06b6d4', border: '#0e7490', label: 'Foundational Systems' },
};

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  graphData,
  onExpandNode,
  onSelectPaperForAi,
  onToggleSelectPaper,
  selectedPaperIds,
  libraryPapers,
  viewMode,
  onViewModeChange
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [layoutMode, setLayoutMode] = useState<'force' | 'timeline' | 'cluster'>('force');
  const [minCitationsFilter, setMinCitationsFilter] = useState(0);
  const [expanding, setExpanding] = useState(false);

  // D3 zoom behavior ref
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !graphData.nodes.length) return;

    const width = containerRef.current.clientWidth || 900;
    const height = containerRef.current.clientHeight || 650;

    // Filter nodes by citation threshold
    const filteredNodes = graphData.nodes.filter(n => n.citations >= minCitationsFilter);
    const nodeIds = new Set(filteredNodes.map(n => n.id));

    const filteredLinks = graphData.links.filter(l => {
      const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Defs for gradients and arrow markers
    const defs = svg.append('defs');
    
    // Arrow markers
    defs.append('marker')
      .attr('id', 'arrow-cites')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    // Create main container for zoom/pan
    const g = svg.append('g');
    gRef.current = g;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // D3 Force Simulation setup
    const simulation = d3.forceSimulation<GraphNode>(filteredNodes)
      .force('link', d3.forceLink<GraphNode, any>(filteredLinks).id(d => d.id).distance(d => 135 / (d.weight || 1)))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 24));

    // Custom layout forces based on layoutMode
    if (layoutMode === 'timeline') {
      const years = filteredNodes.map(n => n.year);
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      const yearScale = d3.scaleLinear().domain([minYear, maxYear]).range([120, width - 150]);

      simulation
        .force('x', d3.forceX<GraphNode>(d => yearScale(d.year)).strength(1.2))
        .force('y', d3.forceY(height / 2).strength(0.1));
    } else if (layoutMode === 'cluster') {
      const clusterCenters: Record<number, { x: number; y: number }> = {
        1: { x: width * 0.25, y: height * 0.35 },
        2: { x: width * 0.75, y: height * 0.35 },
        3: { x: width * 0.3, y: height * 0.75 },
        4: { x: width * 0.7, y: height * 0.75 },
        5: { x: width * 0.5, y: height * 0.2 },
        6: { x: width * 0.5, y: height * 0.5 },
      };

      simulation
        .force('x', d3.forceX<GraphNode>(d => clusterCenters[d.group || 6]?.x || width / 2).strength(0.8))
        .force('y', d3.forceY<GraphNode>(d => clusterCenters[d.group || 6]?.y || height / 2).strength(0.8));
    }

    // Render Links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredLinks)
      .enter()
      .append('line')
      .attr('stroke', d => {
        const isAuthored = (
          d.type === 'authored' || 
          d.type === 'author_collaboration' || 
          d.type === 'author' || 
          String(d.source).startsWith('author-') || 
          String(d.target).startsWith('author-')
        );
        if (isAuthored) return '#059669'; // Solid Green: Shared Authorship
        if (d.type === 'cites' || d.type === 'citation') return '#2563eb'; // Solid Blue: Direct Citation
        return '#9333ea'; // Dashed Purple: Semantic Similarity
      })
      .attr('stroke-width', d => {
        const isAuthored = (
          d.type === 'authored' || 
          d.type === 'author_collaboration' || 
          d.type === 'author' || 
          String(d.source).startsWith('author-') || 
          String(d.target).startsWith('author-')
        );
        if (isAuthored) return 2.4;
        if (d.type === 'cites' || d.type === 'citation') return 2.4;
        return 2.0;
      })
      .attr('stroke-dasharray', d => {
        const isAuthored = (
          d.type === 'authored' || 
          d.type === 'author_collaboration' || 
          d.type === 'author' || 
          String(d.source).startsWith('author-') || 
          String(d.target).startsWith('author-')
        );
        const isCitation = d.type === 'cites' || d.type === 'citation';
        return (!isAuthored && !isCitation) ? '6,6' : 'none';
      })
      .attr('stroke-opacity', 0.85)
      .attr('marker-end', d => {
        const isCitation = d.type === 'cites' || d.type === 'citation';
        return isCitation ? 'url(#arrow-cites)' : 'none';
      });

    // Node sizing helper based on citations
    function getNodeRadius(d: any): number {
      const base = 8;
      const citationBonus = Math.min(Math.log10((d.citations || 0) + 1) * 3.5, 18);
      return (d.isSeed ? base + 6 : base) + citationBonus;
    }

    // Render Nodes Group
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('.node')
      .data(filteredNodes)
      .enter()
      .append('g')
      .attr('class', 'node cursor-pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Outer glow for Seed nodes or Uploaded PDFs
    node.filter(d => !!d.isSeed || !!d.isUploaded)
      .append('circle')
      .attr('r', d => getNodeRadius(d) + 5)
      .attr('fill', 'none')
      .attr('stroke', d => d.isUploaded ? '#10b981' : '#3b82f6')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.8);

    // Node circles
    node.append('circle')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => CLUSTER_COLORS[d.group || 6]?.bg || '#3b82f6')
      .attr('stroke', d => CLUSTER_COLORS[d.group || 6]?.border || '#1d4ed8')
      .attr('stroke-width', 2)
      .attr('class', 'transition-all duration-200');

    // Node labels
    node.append('text')
      .text(d => {
        const rawTitle = d.title || (d as any).label || (d as any).name || 'Scholarly Node';
        const titleWords = String(rawTitle).split(' ');
        return titleWords.slice(0, 3).join(' ') + (titleWords.length > 3 ? '...' : '');
      })
      .attr('x', d => getNodeRadius(d) + 6)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#94a3b8')
      .attr('class', 'select-none pointer-events-none drop-shadow-xs');

    // Node Interactivity
    node.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
    });

    node.on('mouseenter', (event, d) => {
      setHoveredNode(d);
      
      // Highlight neighbors
      const connectedNodeIds = new Set<string>([d.id]);
      filteredLinks.forEach(l => {
        const sId = (l.source as any).id || l.source;
        const tId = (l.target as any).id || l.target;
        if (sId === d.id) connectedNodeIds.add(tId);
        if (tId === d.id) connectedNodeIds.add(sId);
      });

      node.attr('opacity', n => connectedNodeIds.has(n.id) ? 1 : 0.2);
      link.attr('stroke-opacity', l => {
        const sId = (l.source as any).id || l.source;
        const tId = (l.target as any).id || l.target;
        return (sId === d.id || tId === d.id) ? 1 : 0.05;
      });
    });

    node.on('mouseleave', () => {
      setHoveredNode(null);
      node.attr('opacity', 1);
      link.attr('stroke-opacity', 0.6);
    });

    // Background click deselects
    svg.on('click', () => {
      setSelectedNode(null);
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, layoutMode, minCitationsFilter]);

  // Zoom control helpers
  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(500).call(
      zoomRef.current.transform,
      d3.zoomIdentity
    );
  };

  // Find full paper details for selected node
  const fullPaper = selectedNode ? libraryPapers.find(p => p.id === selectedNode.id) : null;

  return (
    <div className="relative w-full h-full flex overflow-hidden bg-slate-900 text-slate-100">
      
      {/* Canvas Area */}
      <div ref={containerRef} className="relative flex-1 h-full w-full">
        
        {/* Floating Top Control Bar (Unified Layout & View Switcher) */}
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2.5 bg-slate-800/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-lg text-xs">
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Layout Mode Toggles */}
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-700/60">
              <button
                onClick={() => setLayoutMode('force')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  layoutMode === 'force' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Force Network
              </button>
              <button
                onClick={() => setLayoutMode('timeline')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  layoutMode === 'timeline' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Timeline (By Year)
              </button>
              <button
                onClick={() => setLayoutMode('cluster')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  layoutMode === 'cluster' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Field Clusters
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

            {/* Citations Threshold */}
            <div className="flex items-center gap-2 text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Min Citations:</span>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={minCitationsFilter}
                onChange={(e) => setMinCitationsFilter(parseInt(e.target.value, 10))}
                className="w-20 accent-emerald-500 cursor-pointer"
              />
              <span className="font-mono text-[11px] text-emerald-400">{minCitationsFilter}</span>
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

        {/* Floating Zoom Controls - Elevated */}
        <div className="absolute bottom-10 right-6 z-20 flex flex-col gap-1.5 bg-slate-800/95 backdrop-blur-md p-2 rounded-2xl border border-slate-700/80 shadow-2xl">
          <button
            onClick={() => handleZoom(1.3)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/70 rounded-xl transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.7)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/70 rounded-xl transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/70 rounded-xl transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Graph Stats & Cluster Legend - Elevated & Enlarged */}
        <div className="absolute bottom-10 left-6 z-20 bg-slate-800/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700/90 shadow-2xl text-xs space-y-2.5 max-w-sm select-none">
          <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-700/60 pb-2 gap-3">
            <span className="font-bold text-slate-100 text-xs">Knowledge Network Stats</span>
            <span className="text-emerald-400 font-mono text-xs font-bold">
              {graphData.nodes.length} papers • {graphData.links.length} connections
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {Object.entries(CLUSTER_COLORS).map(([key, item]) => (
              <div key={key} className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: item.bg }} />
                <span className="truncate text-slate-200 font-medium text-[11.5px]" title={item.label}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SVG Element */}
        <svg 
          ref={svgRef} 
          className="w-full h-full graph-canvas bg-radial from-slate-800/40 via-slate-900 to-slate-950" 
        />

        {/* Hover Tooltip */}
        {hoveredNode && !selectedNode && (
          <div 
            className="absolute z-20 pointer-events-none bg-slate-900/95 text-white border border-slate-700 p-3 rounded-xl shadow-xl max-w-sm text-xs space-y-1.5 backdrop-blur-md animate-in fade-in"
            style={{ 
              left: Math.min((hoveredNode.x || 0) + 20, 600), 
              top: Math.max((hoveredNode.y || 0) - 40, 20) 
            }}
          >
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                {hoveredNode.year || '2023'}
              </span>
              <span className="text-slate-400 font-semibold truncate">
                {(hoveredNode.authors || []).slice(0, 2).map((a: any) => typeof a === 'string' ? a : (a?.name || 'Author')).join(', ') || 'Scholarly Authors'}
              </span>
            </div>
            <p className="font-bold text-white text-sm leading-snug">{hoveredNode.title || (hoveredNode as any).label || 'Scholarly Node'}</p>
            <p className="text-emerald-400 font-medium">{(hoveredNode.citations || 0).toLocaleString()} citations</p>
          </div>
        )}

      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="w-96 h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl z-30 animate-in slide-in-from-right duration-200">
          
          <div className="space-y-4">
            
            {/* Header / Close */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                  {selectedNode.year || '2023'}
                </span>
                <span className="text-xs text-slate-400 font-semibold uppercase">
                  {CLUSTER_COLORS[selectedNode.group || 6]?.label}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-white leading-tight">
              {selectedNode.title || (selectedNode as any).label || 'Scholarly Node'}
            </h3>

            {/* Authors */}
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Authors</span>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {(selectedNode.authors || []).map((a: any) => typeof a === 'string' ? a : (a?.name || 'Author')).join(', ') || 'Academic Researchers'}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Citations</span>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                  {selectedNode.citations.toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Node Type</span>
                <p className="text-xs font-semibold text-slate-200 mt-1">
                  {selectedNode.isSeed ? '🌟 Seed Paper' : '🕸️ Network Node'}
                </p>
              </div>
            </div>

            {/* Abstract preview */}
            {fullPaper?.abstract && (
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 uppercase font-semibold">Abstract</span>
                <p className="text-xs text-slate-300 leading-relaxed max-h-44 overflow-y-auto pr-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                  {fullPaper.abstract}
                </p>
              </div>
            )}

          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            
            {/* Expand Graph Button */}
            <button
              onClick={async () => {
                setExpanding(true);
                await onExpandNode(selectedNode.id);
                setExpanding(false);
              }}
              disabled={expanding}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60"
            >
              {expanding ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Expand Network (+5 Connected Papers)</span>
            </button>

            {/* Chat with AI */}
            <button
              onClick={() => onSelectPaperForAi(selectedNode.id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Ask AI About This Paper</span>
            </button>

            {/* Add to selection basket */}
            {fullPaper && (
              <button
                onClick={() => onToggleSelectPaper(fullPaper)}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  selectedPaperIds.includes(fullPaper.id)
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {selectedPaperIds.includes(fullPaper.id) ? 'Selected in Basket' : 'Add to Selection Basket'}
                </span>
              </button>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
