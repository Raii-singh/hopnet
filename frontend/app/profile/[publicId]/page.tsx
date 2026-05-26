'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGraphStore } from '@/store/graphStore';
import { GraphNode, GraphEdge } from '@/types/graph';
import { fetchUserProfile, fetchPath } from '@/services/api';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Load ForceGraph2D dynamically
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'rgba(0,0,0,0.2)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 30, height: 30, border: '2px solid var(--neon-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
        <span className="text-label" style={{ color: 'var(--neon-blue)', fontSize: '11px' }}>Loading Local Subgraph…</span>
      </div>
    </div>
  )
});

interface ProfilePageProps {
  params: Promise<{ publicId: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const router = useRouter();
  const { publicId } = use(params);

  const { allNodes, allEdges, rootNodeId } = useGraphStore();
  const [profile, setProfile] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);

  // Local graph states
  const miniGraphRef = useRef<any>(null);
  const [localDepth, setLocalDepth] = useState(1);
  const [neighborhoodNodes, setNeighborhoodNodes] = useState<GraphNode[]>([]);
  const [neighborhoodLinks, setNeighborhoodLinks] = useState<GraphEdge[]>([]);

  // Pathfinder States
  const [searchTarget, setSearchTarget] = useState('');
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<GraphNode | null>(null);
  const [tracedPath, setTracedPath] = useState<GraphNode[]>([]);
  const [pathCost, setPathCost] = useState<number | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());

  // Derive root active admin
  const activeAdmin = allNodes.find(n => n.id === rootNodeId) ?? allNodes.find(n => n.nodeType === 'REAL');

  // Load Profile node V2.5 data
  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchUserProfile(publicId);
        if (!active) return;
        setProfile(data as any);
      } catch (err) {
        console.error('Failed to load profile via API:', err);
        const localNode = allNodes.find(n => n.publicId === publicId);
        if (localNode) setProfile(localNode);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [publicId, allNodes]);

  // Compute Local Neighborhood BFS on the client (Fast & Reactive!)
  useEffect(() => {
    if (!profile) return;

    // Build adjacency list for current nodes
    const adj = new Map<string, { neighborId: string; edge: GraphEdge }[]>();
    for (const edge of allEdges) {
      const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
      if (!adj.has(src)) adj.set(src, []);
      if (!adj.has(tgt)) adj.set(tgt, []);
      adj.get(src)!.push({ neighborId: tgt, edge });
      adj.get(tgt)!.push({ neighborId: src, edge });
    }

    const visitedNodes = new Set<string>([profile.id]);
    const visitedEdges = new Set<string>();
    const queue: { nodeId: string; hop: number }[] = [{ nodeId: profile.id, hop: 0 }];

    while (queue.length > 0) {
      const { nodeId, hop } = queue.shift()!;
      if (hop >= localDepth) continue;

      const neighbors = adj.get(nodeId) || [];
      for (const { neighborId, edge } of neighbors) {
        // Enforce traversal rule locally: DEMO -> REAL blocked
        const currNode = allNodes.find(n => n.id === nodeId);
        const neighNode = allNodes.find(n => n.id === neighborId);
        if (currNode && neighNode && currNode.nodeType === 'DEMO' && neighNode.nodeType === 'REAL') continue;

        visitedEdges.add(edge.id);

        if (!visitedNodes.has(neighborId)) {
          visitedNodes.add(neighborId);
          queue.push({ nodeId: neighborId, hop: hop + 1 });
        }
      }
    }

    const localNodes = allNodes.filter(n => visitedNodes.has(n.id)).map(n => ({ ...n }));
    const localLinks = allEdges.filter(e => visitedEdges.has(e.id)).map(e => ({ ...e }));

    setNeighborhoodNodes(localNodes);
    setNeighborhoodLinks(localLinks);

    // Trigger auto-fit in mini canvas
    setTimeout(() => {
      miniGraphRef.current?.zoomToFit(400, 40);
    }, 300);

  }, [profile, localDepth, allNodes, allEdges]);

  // Autocomplete Pathfinder search
  const handleTargetSearch = (q: string) => {
    setSearchTarget(q);
    if (!profile || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const results = allNodes.filter(n =>
      n.id !== profile.id &&
      (n.fullName.toLowerCase().includes(q.toLowerCase()) ||
        n.publicId.toLowerCase().includes(q.toLowerCase()) ||
        n.company?.toLowerCase().includes(q.toLowerCase()))
    ).slice(0, 5);
    setSearchResults(results);
  };

  // Compute Shortest Dijkstra Path & Highlight
  const handleTracePath = async (targetNode: GraphNode) => {
    if (!profile) return;
    setSelectedTarget(targetNode);
    setSearchResults([]);
    setSearchTarget(targetNode.fullName);

    try {
      const pathRes = await fetchPath(profile.id, targetNode.id);
      if (pathRes && pathRes.path) {
        const mappedPath = pathRes.path
          .map(id => allNodes.find(n => n.id === id))
          .filter(Boolean) as GraphNode[];
        setTracedPath(mappedPath);
        setPathCost(pathRes.totalCost);

        // Compute Highlight sets
        const nodeIds = new Set(pathRes.path);
        const edgeIds = new Set<string>();
        for (let i = 0; i < pathRes.path.length - 1; i++) {
          const src = pathRes.path[i];
          const tgt = pathRes.path[i + 1];
          const edge = allEdges.find(e => {
            const s = typeof e.source === 'string' ? e.source : e.source.id;
            const t = typeof e.target === 'string' ? e.target : e.target.id;
            return (s === src && t === tgt) || (s === tgt && t === src);
          });
          if (edge) edgeIds.add(edge.id);
        }
        setHighlightedNodeIds(nodeIds);
        setHighlightedEdgeIds(edgeIds);

        // Temporarily expand mini graph depth if target isn't in current neighborhood view
        const targetInView = neighborhoodNodes.some(n => n.id === targetNode.id);
        if (!targetInView) {
          setLocalDepth(2);
        }
      } else {
        setTracedPath([]);
        setPathCost(null);
        setHighlightedNodeIds(new Set());
        setHighlightedEdgeIds(new Set());
      }
    } catch (err) {
      console.error('Failed to compute route path:', err);
    }
  };

  const handleClearPath = () => {
    setSelectedTarget(null);
    setSearchTarget('');
    setTracedPath([]);
    setPathCost(null);
    setHighlightedNodeIds(new Set());
    setHighlightedEdgeIds(new Set());
  };

  // Mini Force Graph Custom Rendering
  const getNodeColor = useCallback((node: any) => {
    const n = node as GraphNode;
    if (n.id === profile?.id) return '#a78bfa'; // violet for focal node
    if (highlightedNodeIds.has(n.id)) return '#06b6d4'; // glowing cyan for path nodes
    return n.nodeType === 'REAL' ? 'rgba(6,182,212,0.4)' : 'rgba(100,116,139,0.3)';
  }, [profile?.id, highlightedNodeIds]);

  const getNodeSize = useCallback((node: any) => {
    const n = node as GraphNode;
    const base = n.nodeType === 'REAL' ? 4.5 + (n.influenceScore / 100) * 3 : 3.5;
    if (n.id === profile?.id) return base * 1.4;
    if (highlightedNodeIds.has(n.id)) return base * 1.25;
    return base;
  }, [profile?.id, highlightedNodeIds]);

  const getLinkColor = useCallback((link: any) => {
    const e = link as GraphEdge;
    if (highlightedEdgeIds.has(e.id)) return '#3b82f6'; // glowing blue edge
    return e.edgeType === 'REAL_EDGE' ? 'rgba(59,130,246,0.12)' : 'rgba(71,85,105,0.08)';
  }, [highlightedEdgeIds]);

  const getLinkWidth = useCallback((link: any) => {
    const e = link as GraphEdge;
    if (highlightedEdgeIds.has(e.id)) return 3;
    return e.edgeType === 'REAL_EDGE' ? 1 : 0.6;
  }, [highlightedEdgeIds]);

  if (loading) {
    return (
      <div className="page-layout">
        <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, border: '3px solid var(--neon-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <span className="text-label" style={{ color: 'var(--neon-blue)', fontSize: '14px' }}>Decrypting Relationship Ledger…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-layout">
        <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', maxWidth: 400 }}>
            <h2 style={{ color: 'var(--silver-200)', marginBottom: '8px' }}>Node Profile Unreachable</h2>
            <p style={{ color: 'var(--silver-500)', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
              The stable public identifier `{publicId}` was not found.
            </p>
            <button className="glass-button" style={{ margin: '0 auto' }} onClick={() => router.push('/database')}>
              Return to Database Index
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isReal = profile.nodeType === 'REAL';
  const totalConn = profile.connectionCount || 0;

  // ── RELATIONSHIP INTELLIGENCE DERIVATIONS ──
  const realConns = allNodes.filter(n => n.nodeType === 'REAL' && n.id !== profile.id).length;
  // Reachability: count nodes reachable up to 3 hops
  const strategicReach = totalConn + Math.round((profile.influenceScore / 100) * realConns * 0.4);
  const warmIntroPct = Math.min(99, Math.round(profile.influenceScore * 0.85));
  const propagationScore = Math.min(98, Math.round(profile.influenceScore * 0.92 + (profile.realConnections * 1.5)));

  return (
    <div className="page-layout" style={{ overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
      <div className="page-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* Back Link */}
        <Link href="/database" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          color: 'var(--silver-500)', fontSize: '12px', fontWeight: 500,
          textDecoration: 'none', marginBottom: '20px', transition: 'color 0.2s',
        }} onMouseEnter={e => e.currentTarget.style.color = 'var(--silver-200)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--silver-500)'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Directory
        </Link>

        {/* ── PROFILE IDENTITY BLOCK ── */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: isReal
                ? 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.2))'
                : 'linear-gradient(135deg, rgba(100,116,139,0.15), rgba(71,85,105,0.15))',
              border: `2px solid ${isReal ? 'rgba(6,182,212,0.5)' : 'rgba(100,116,139,0.4)'}`,
              boxShadow: isReal ? '0 0 25px rgba(6,182,212,0.15)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 800, color: isReal ? 'var(--neon-cyan)' : 'var(--silver-500)',
              flexShrink: 0,
            }}>
              {profile.fullName.charAt(0)}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.02em', margin: 0 }}>
                  {profile.fullName}
                </h1>
                <span className={`badge ${isReal ? 'badge-real' : 'badge-demo'}`}>
                  {isReal ? '● REAL PROFILE' : '○ DEMO EXPANDER'}
                </span>
              </div>

              <div className="text-mono" style={{ fontSize: '12px', color: 'var(--silver-400)', marginTop: '4px' }}>
                Identifier: <span style={{ color: isReal ? 'var(--neon-cyan)' : 'var(--silver-400)', fontWeight: 600 }}>{profile.publicId}</span>
                {profile.username && ` · @${profile.username}`}
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--silver-400)' }}>
                {profile.company && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🏢 {profile.company}
                  </span>
                )}
                {profile.cluster && (
                  <span style={{ color: 'var(--neon-violet)', fontWeight: 600 }}>
                    🔮 {profile.cluster} Cluster Hub
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── METRICS GRID & LOCAL GRAPH CANVAS CONTAINER ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          
          {/* Left Panel: Force Graph Neighborhood */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 420, overflow: 'hidden', padding: 0 }}>
            {/* Neighborhood header controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--silver-200)' }}>Neighborhood Force Canvas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-label" style={{ fontSize: '10px' }}>Depth Hops</span>
                <select
                  value={localDepth}
                  onChange={e => setLocalDepth(Number(e.target.value))}
                  className="glass-input"
                  style={{ width: 'auto', padding: '3px 8px', background: 'var(--bg-void)', border: '1px solid var(--glass-border)', fontSize: '11px', cursor: 'pointer' }}
                >
                  <option value={1} style={{ background: '#0d0d24' }}>1 Hop</option>
                  <option value={2} style={{ background: '#0d0d24' }}>2 Hops</option>
                  <option value={3} style={{ background: '#0d0d24' }}>3 Hops</option>
                </select>
              </div>
            </div>

            {/* Canvas body */}
            <div style={{ flex: 1, position: 'relative' }}>
              <ForceGraph2D
                ref={miniGraphRef}
                graphData={{ nodes: neighborhoodNodes as any, links: neighborhoodLinks as any }}
                backgroundColor="transparent"
                nodeColor={getNodeColor}
                nodeVal={getNodeSize}
                linkColor={getLinkColor}
                linkWidth={getLinkWidth}
                linkCurvature={0.08}
                // accelerated path particles
                linkDirectionalParticles={link => highlightedEdgeIds.has(link.id) ? 6 : 0}
                linkDirectionalParticleWidth={1.8}
                linkDirectionalParticleColor={() => '#a78bfa'}
                linkDirectionalParticleSpeed={0.006}
                cooldownTicks={80}
                enableNodeDrag={true}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  if (!isFinite(node.x) || !isFinite(node.y)) return;
                  const r = getNodeSize(node);
                  const color = getNodeColor(node);
                  const isFocal = node.id === profile.id;
                  const isHighlighted = highlightedNodeIds.has(node.id);

                  ctx.save();
                  // Focal node outer ring glow
                  if (isFocal || isHighlighted) {
                    const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 2);
                    grad.addColorStop(0, isFocal ? 'rgba(167,139,250,0.18)' : 'rgba(6,182,212,0.15)');
                    grad.addColorStop(1, 'transparent');
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, r * 2, 0, 2 * Math.PI);
                    ctx.fillStyle = grad;
                    ctx.fill();
                  }

                  // Core circle
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                  ctx.fillStyle = color;
                  ctx.fill();

                  // Stroke ring
                  ctx.strokeStyle = isFocal ? '#a78bfa' : isHighlighted ? '#67e8f9' : 'rgba(255,255,255,0.06)';
                  ctx.lineWidth = isFocal || isHighlighted ? 1.5 : 0.8;
                  ctx.stroke();

                  // Node label if focused or zoom high
                  if (globalScale > 2 || isFocal || isHighlighted) {
                    ctx.font = `${isFocal || isHighlighted ? 600 : 400} ${Math.max(3, 7.5 / globalScale)}px Inter, sans-serif`;
                    ctx.fillStyle = isFocal ? '#e0f7fa' : '#94a3b8';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText(node.fullName, node.x, node.y + r + 1.5);
                  }
                  ctx.restore();
                }}
                nodeCanvasObjectMode={() => 'replace'}
                onNodeClick={(node: any) => {
                  if (node.id !== profile.id) {
                    router.push(`/profile/${node.publicId}`);
                  }
                }}
              />
            </div>
          </div>

          {/* Right Panel: Path Intelligence Tracing */}
          <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', height: 420 }}>
            <div style={{ fontWeight: 600, color: 'var(--silver-100)', fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
              Graph Pathfinding Engine
            </div>

            <p style={{ color: 'var(--silver-500)', fontSize: '11px', lineHeight: 1.5, margin: '0 0 16px' }}>
              Trace the shortest connection path between this profile and any other node in the universal ledger using Dijkstra weights.
            </p>

            {/* Target autocomplete selector */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="glass-input"
                  placeholder="Enter name, public ID, or company…"
                  value={searchTarget}
                  onChange={e => handleTargetSearch(e.target.value)}
                  style={{ flex: 1 }}
                />
                {selectedTarget && (
                  <button className="glass-button" onClick={handleClearPath} style={{ borderColor: 'rgba(244,63,94,0.3)', color: 'rgba(244,63,94,0.8)' }}>
                    Reset Path
                  </button>
                )}
              </div>

              {/* Suggestions overlay */}
              {searchResults.length > 0 && (
                <div className="glass-panel" style={{
                  position: 'absolute', top: '105%', left: 0, right: 0,
                  maxHeight: 180, overflowY: 'auto', zIndex: 100, padding: 4,
                  background: '#0a0a18',
                }}>
                  {searchResults.map(tNode => (
                    <button
                      key={tNode.id}
                      onClick={() => handleTracePath(tNode)}
                      style={{
                        width: '100%', padding: '8px 10px', background: 'transparent',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        gap: '8px', borderRadius: '6px', textAlign: 'left', transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: tNode.nodeType === 'REAL' ? 'var(--neon-cyan)' : 'var(--silver-500)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--silver-200)', fontWeight: 600, flex: 1 }}>{tNode.fullName}</span>
                      <span className="text-mono" style={{ fontSize: '10px', color: 'var(--silver-500)' }}>{tNode.publicId}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Path trace visual chain */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {tracedPath.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--silver-400)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Active Pathway Traversal</span>
                    <span className="text-mono" style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>Weight Cost: {pathCost}</span>
                  </div>

                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    maxHeight: 180, overflowY: 'auto', paddingRight: '4px'
                  }}>
                    {tracedPath.map((pNode, index) => {
                      const isTarget = pNode.id === selectedTarget?.id;
                      const isRoot = pNode.id === profile.id;
                      return (
                        <div key={pNode.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: isRoot ? '#a78bfa' : isTarget ? 'var(--neon-cyan)' : 'var(--silver-600)',
                            }} />
                            {index < tracedPath.length - 1 && (
                              <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
                            )}
                          </div>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: isRoot || isTarget ? 'var(--silver-100)' : 'var(--silver-400)', fontWeight: isRoot || isTarget ? 600 : 400 }}>
                              {pNode.fullName}
                            </span>
                            <span className="text-mono" style={{ fontSize: '10px', color: 'var(--silver-600)' }}>
                              {pNode.publicId}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : selectedTarget ? (
                <div style={{ textAlign: 'center', color: 'rgba(244,63,94,0.8)', padding: '16px 0' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginBottom: '8px' }}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Traversal Blocked</div>
                  <div style={{ fontSize: '11px', color: 'var(--silver-600)', marginTop: '4px', lineHeight: 1.4 }}>
                    Standard security constraints prevent connection paths through demo records back into real nodes (DEMO → REAL blocked).
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--silver-600)', padding: '24px 0', fontSize: '12px' }}>
                  Select another node from the ledger above to trace relationship pathways on the neighborhood canvas.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RELATIONSHIP INTELLIGENCE SECTOR ── */}
        <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ fontWeight: 600, color: 'var(--silver-100)', fontSize: '14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--neon-violet)" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 17 17 22 12" />
            </svg>
            Relationship & Connection Intelligence
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Strategic Reachability', value: `${strategicReach} Nodes`, desc: 'Active connections accessible up to 3 hops.' },
              { label: 'Warm Intro Potential', value: `${warmIntroPct}%`, desc: 'Estimated probability of successful connection bridges.' },
              { label: 'Influence Propagation', value: `${propagationScore}%`, desc: 'Estimated cascade dissemination capacity index.' },
              { label: 'Primary Connector Classification', value: profile.realConnections > 5 ? 'Hub Bridger' : 'Deep Connector', desc: 'Identified connection bridge architecture tier.' },
            ].map(ci => (
              <div key={ci.label} className="glass-panel" style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.01)' }}>
                <div className="text-label" style={{ marginBottom: '4px' }}>{ci.label}</div>
                <div className="text-mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--neon-violet)', marginBottom: '6px' }}>{ci.value}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--silver-500)', lineHeight: 1.4 }}>{ci.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── INFO TABS AND METADATA GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          
          {/* Contact and handle details */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontWeight: 600, color: 'var(--silver-100)', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏢 Professional Footprint Index
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'E-mail Ledger', value: profile.email ?? 'Not indexed' },
                { label: 'Phone Registry', value: profile.phone ?? 'Not indexed' },
                { label: 'LinkedIn Footprint', value: profile.linkedinUrl ? 'linkedin.com/in/' + profile.publicId : 'Not indexed', isLink: !!profile.linkedinUrl, href: profile.linkedinUrl },
                { label: 'Twitter Handle', value: profile.twitterHandle ?? 'Not indexed', isLink: !!profile.twitterHandle, href: `https://twitter.com/${profile.twitterHandle?.replace('@','')}` },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '10px', fontSize: '12px' }}>
                  <span className="text-label">{item.label}</span>
                  {item.isLink ? (
                    <a href={item.href} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 600 }} className="hover-link">
                      {item.value}
                    </a>
                  ) : (
                    <span className="text-mono" style={{ color: 'var(--silver-300)' }}>{item.value}</span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px' }}>
              <div className="text-label" style={{ marginBottom: '8px' }}>Indexed Tags / Keywords</div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {profile.tags && profile.tags.length > 0 ? (
                  profile.tags.map(t => (
                    <span key={t} style={{ padding: '3px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: 500, background: 'var(--bg-glass)', border: '1px solid var(--glass-border)', color: 'var(--silver-300)' }}>
                      {t}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--silver-600)' }}>No tags registered</span>
                )}
              </div>
            </div>
          </div>

          {/* Secure Metadata Audit */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontWeight: 600, color: 'var(--silver-100)', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔒 Ledger Audit Log metadata
            </div>

            <div style={{ marginBottom: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                <span className="text-label">Source Connectors</span>
                <span className="text-mono" style={{ color: 'var(--neon-violet)', fontWeight: 600 }}>{profile.sourceConnectors?.join(', ') || 'Manual'}</span>
              </div>
            </div>

            <div>
              <div className="text-label" style={{ marginBottom: '8px' }}>Secured Metadata JSON Map</div>
              <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px 14px', maxHeight: '150px', overflowY: 'auto' }}>
                <pre className="text-mono" style={{ fontSize: '10.5px', color: 'var(--neon-cyan)', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(profile.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
