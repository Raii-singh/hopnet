'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { GraphNode, GraphEdge } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';
import { useAuthStore } from '@/store/authStore';
import { fetchPath } from '@/services/api';
import NodeProfileModal from '@/components/modals/NodeProfileModal';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'rgba(0,0,0,0.2)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
        <span className="text-label" style={{ color: '#ffffff', fontSize: '11px' }}>Syncing Subgraph…</span>
      </div>
    </div>
  )
});

interface PersonalProfileViewProps {
  profile: GraphNode;
  databaseNodes: GraphNode[];
  visibleLinks: GraphEdge[];
}

export default function PersonalProfileView({ profile, databaseNodes, visibleLinks }: PersonalProfileViewProps) {
  const router = useRouter();
  const { setRootNode, primaryNodeId, setPrimaryNode } = useGraphStore();
  const { isAdmin } = useAuthStore();
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null);

  // Local graph & pathfinding states
  const miniGraphRef = useRef<any>(null);
  const [localDepth, setLocalDepth] = useState(1);
  const [neighborhoodNodes, setNeighborhoodNodes] = useState<GraphNode[]>([]);
  const [neighborhoodLinks, setNeighborhoodLinks] = useState<GraphEdge[]>([]);

  const [searchTarget, setSearchTarget] = useState('');
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<GraphNode | null>(null);
  const [tracedPath, setTracedPath] = useState<GraphNode[]>([]);
  const [pathCost, setPathCost] = useState<number | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());

  const isReal = profile.nodeType === 'REAL';
  const totalConn = profile.connectionCount || 0;

  // Direct edges for this profile
  const profileEdges = visibleLinks.filter(e => {
    const src = typeof e.source === 'string' ? e.source : (e.source as any).id;
    const tgt = typeof e.target === 'string' ? e.target : (e.target as any).id;
    return src === profile.id || tgt === profile.id;
  });

  // Intelligence calculations
  const realNodesCount = databaseNodes.filter(n => n.nodeType === 'REAL' && n.id !== profile.id).length;
  const reachabilityScore = totalConn === 0 ? 0 : Math.round((profile.influenceScore / 100) * (totalConn + realNodesCount * 0.4));
  const warmIntroPct = totalConn === 0 ? 0 : Math.min(99, Math.round(profile.influenceScore * 0.85));
  const propagationScore = totalConn === 0 ? 0 : Math.min(98, Math.round(profile.influenceScore * 0.92 + (profile.realConnections * 1.5)));
  const connectorClassification = totalConn === 0 ? 'Unconnected Identity' : profile.realConnections > 5 ? 'Hub Bridger' : 'Deep Connector';

  // Best bridge node
  const bestBridge = databaseNodes
    .filter(n => n.nodeType === 'REAL' && n.id !== profile.id)
    .sort((a, b) => b.influenceScore - a.influenceScore)[0];

  // Strongest trust links
  const strongestLinks = profileEdges
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(edge => {
      const srcId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
      const tgtId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
      const otherId = srcId === profile.id ? tgtId : srcId;
      const otherPerson = databaseNodes.find(n => n.id === otherId);
      return { edge, otherPerson };
    });

  // Extract optional metadata fields cleanly
  const bio = profile.metadata?.bio || profile.metadata?.description || null;
  const location = profile.metadata?.location || null;
  const education = profile.metadata?.education || null;
  const website = profile.metadata?.website || null;
  const githubUrl = profile.metadata?.githubUrl || (profile.username ? `https://github.com/${profile.username}` : null);
  const twitterHandle = profile.twitterHandle || profile.metadata?.twitterHandle || null;

  // Build client-side neighborhood graph
  useEffect(() => {
    if (!profile) return;
    const adj = new Map<string, { neighborId: string; edge: GraphEdge }[]>();
    for (const edge of visibleLinks) {
      const src = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
      const tgt = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
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
        visitedEdges.add(edge.id);
        if (!visitedNodes.has(neighborId)) {
          visitedNodes.add(neighborId);
          queue.push({ nodeId: neighborId, hop: hop + 1 });
        }
      }
    }

    const localNodes = databaseNodes.filter(n => visitedNodes.has(n.id)).map(n => ({ ...n }));
    const localLinks = visibleLinks.filter(e => visitedEdges.has(e.id)).map(e => ({ ...e }));

    setNeighborhoodNodes(localNodes);
    setNeighborhoodLinks(localLinks);

    setTimeout(() => {
      miniGraphRef.current?.zoomToFit(400, 30);
    }, 300);
  }, [profile, localDepth, databaseNodes, visibleLinks]);

  // Pathfinder Autocomplete search
  const handleTargetSearch = (q: string) => {
    setSearchTarget(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const results = databaseNodes.filter(n =>
      n.id !== profile.id &&
      (n.fullName.toLowerCase().includes(q.toLowerCase()) ||
        n.publicId.toLowerCase().includes(q.toLowerCase()) ||
        n.company?.toLowerCase().includes(q.toLowerCase()))
    ).slice(0, 5);
    setSearchResults(results);
  };

  const handleTracePath = async (targetNode: GraphNode) => {
    setSelectedTarget(targetNode);
    setSearchResults([]);
    setSearchTarget(targetNode.fullName);

    try {
      const pathRes = await fetchPath(profile.id, targetNode.id);
      if (pathRes && pathRes.path) {
        const mappedPath = pathRes.path
          .map(id => databaseNodes.find(n => n.id === id))
          .filter(Boolean) as GraphNode[];
        setTracedPath(mappedPath);
        setPathCost(pathRes.totalCost);

        const nodeIds = new Set(pathRes.path);
        const edgeIds = new Set<string>();
        for (let i = 0; i < pathRes.path.length - 1; i++) {
          const src = pathRes.path[i];
          const tgt = pathRes.path[i + 1];
          const edge = visibleLinks.find(e => {
            const s = typeof e.source === 'string' ? e.source : (e.source as any).id;
            const t = typeof e.target === 'string' ? e.target : (e.target as any).id;
            return (s === src && t === tgt) || (s === tgt && t === src);
          });
          if (edge) edgeIds.add(edge.id);
        }
        setHighlightedNodeIds(nodeIds);
        setHighlightedEdgeIds(edgeIds);

        if (!neighborhoodNodes.some(n => n.id === targetNode.id)) {
          setLocalDepth(2);
        }
      } else {
        setTracedPath([]);
        setPathCost(null);
        setHighlightedNodeIds(new Set());
        setHighlightedEdgeIds(new Set());
      }
    } catch {
      setTracedPath([]);
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

  const getNodeColor = useCallback((node: any) => {
    const n = node as GraphNode;
    if (n.id === profile.id) return '#ffffff';
    if (highlightedNodeIds.has(n.id)) return '#ffffff';
    return n.nodeType === 'REAL' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)';
  }, [profile.id, highlightedNodeIds]);

  const getNodeSize = useCallback((node: any) => {
    const n = node as GraphNode;
    const base = n.nodeType === 'REAL' ? 4 + (n.influenceScore / 100) * 3 : 3;
    if (n.id === profile.id) return base * 1.5;
    if (highlightedNodeIds.has(n.id)) return base * 1.3;
    return base;
  }, [profile.id, highlightedNodeIds]);

  const getLinkColor = useCallback((link: any) => {
    const e = link as GraphEdge;
    if (highlightedEdgeIds.has(e.id)) return '#ffffff';
    return e.edgeType === 'REAL_EDGE' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)';
  }, [highlightedEdgeIds]);

  const getLinkWidth = useCallback((link: any) => {
    const e = link as GraphEdge;
    if (highlightedEdgeIds.has(e.id)) return 2.5;
    return e.edgeType === 'REAL_EDGE' ? 0.9 : 0.5;
  }, [highlightedEdgeIds]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', alignItems: 'start' }}>
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── LEFT HALF: POLISHED LINKEDIN-STYLE PROFESSIONAL PROFILE ────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Profile Card Header */}
        <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle Top Accent */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: isReal
              ? 'linear-gradient(90deg, #ffffff, var(--silver-400), #ffffff)'
              : 'linear-gradient(90deg, #f59e0b, #d97706)',
          }} />

          <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
            {/* Avatar Circle */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
              background: isReal
                ? 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))'
                : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(180,83,9,0.15))',
              border: `2px solid ${isReal ? 'rgba(255,255,255,0.25)' : 'rgba(245,158,11,0.4)'}`,
              boxShadow: '0 0 25px rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', fontWeight: 800, color: isReal ? '#ffffff' : '#f59e0b',
            }}>
              {profile.fullName.charAt(0)}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.02em', margin: 0 }}>
                  {profile.fullName}
                </h1>
                <span className={`badge ${isReal ? 'badge-real' : 'badge-demo'}`}>
                  {isReal ? '● REAL' : '○ DEMO'}
                </span>
              </div>

              <div className="text-mono" style={{ fontSize: '11px', color: 'var(--silver-400)', marginTop: '3px' }}>
                {profile.publicId} {profile.username && `· @${profile.username}`}
              </div>

              <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginTop: '6px' }}>
                {profile.company ? `${profile.company}` : profile.cluster ? `${profile.cluster} Cluster Member` : 'Professional Profile'}
              </div>

              {location && (
                <div style={{ fontSize: '11.5px', color: 'var(--silver-400)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  📍 {location}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              className="glass-button font-semibold"
              onClick={() => { setPrimaryNode(profile.id); router.push('/'); }}
              style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.06)', color: '#ffffff' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Focus in Graph
            </button>
            <button
              className="glass-button font-semibold"
              onClick={() => setPrimaryNode(profile.id)}
              style={{
                flex: 1, justifyContent: 'center',
                background: (primaryNodeId === profile.id || primaryNodeId === profile.publicId) ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.06)',
                color: '#eab308', borderColor: 'rgba(234,179,8,0.3)'
              }}
            >
              {(primaryNodeId === profile.id || primaryNodeId === profile.publicId) ? '⭐ Primary Identity' : '⭐ Set Primary'}
            </button>
            <button
              className="glass-button"
              disabled={!isAdmin}
              title={!isAdmin ? 'SUDO Mode Required' : ''}
              onClick={() => setEditingNode(profile)}
              style={{ padding: '6px 14px', color: '#ffffff', opacity: !isAdmin ? 0.4 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer' }}
            >
              ✏️ Edit {!isAdmin && '🔒'}
            </button>
          </div>
        </div>

        {/* Professional About / Bio Section */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div className="text-label" style={{ marginBottom: '10px', color: '#ffffff', fontWeight: 700 }}>About & Overview</div>
          {bio ? (
            <p style={{ color: 'var(--silver-300)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              {bio}
            </p>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--silver-500)', fontStyle: 'italic' }}>
              No biography summary registered for this profile.
            </div>
          )}
        </div>

        {/* Company & Footprint Section */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div className="text-label" style={{ marginBottom: '12px', color: '#ffffff', fontWeight: 700 }}>Company & Industry Footprint</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px 12px', borderRadius: '6px' }}>
              <div className="text-label" style={{ fontSize: '9px' }}>Company</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>
                {profile.company || 'Not Specified'}
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px 12px', borderRadius: '6px' }}>
              <div className="text-label" style={{ fontSize: '9px' }}>Cluster Hub</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--silver-200)', marginTop: '2px' }}>
                {profile.cluster || 'Unclustered'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--silver-400)' }}>
            Data Ingestion Source: <span className="text-mono" style={{ color: '#ffffff' }}>{profile.sourceConnectors?.join(', ') || 'Manual Input'}</span>
          </div>
        </div>

        {/* Education & Credentials */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div className="text-label" style={{ marginBottom: '10px', color: '#ffffff', fontWeight: 700 }}>Education & Credentials</div>
          {education ? (
            <div style={{ fontSize: '13px', color: 'var(--silver-200)', fontWeight: 500 }}>
              🎓 {education}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--silver-500)', fontStyle: 'italic' }}>
              No education records indexed.
            </div>
          )}
        </div>

        {/* Skills & Tag Pills */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div className="text-label" style={{ marginBottom: '10px', color: '#ffffff', fontWeight: 700 }}>Skills & Domain Tags</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {profile.tags && profile.tags.length > 0 ? (
              profile.tags.map(tag => (
                <span key={tag} style={{
                  padding: '3px 10px', borderRadius: '100px',
                  fontSize: '11px', fontWeight: 500,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                }}>
                  {tag}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--silver-500)', fontStyle: 'italic' }}>
                No tags registered.
              </span>
            )}
          </div>
        </div>

        {/* Public Social & Contact Handles */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div className="text-label" style={{ marginBottom: '12px', color: '#ffffff', fontWeight: 700 }}>Public Handles & Contact</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'E-mail Address', val: profile.email, link: profile.email ? `mailto:${profile.email}` : null },
              { label: 'Phone Number', val: profile.phone, link: null },
              { label: 'Website', val: website, link: website },
              { label: 'LinkedIn', val: profile.linkedinUrl ? 'linkedin.com/in/' + profile.publicId : null, link: profile.linkedinUrl },
              { label: 'GitHub', val: githubUrl ? 'github.com/' + (profile.username || profile.publicId) : null, link: githubUrl },
              { label: 'X / Twitter', val: twitterHandle ? '@' + twitterHandle.replace('@','') : null, link: twitterHandle ? `https://twitter.com/${twitterHandle.replace('@','')}` : null },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                <span className="text-label">{item.label}</span>
                {item.val && item.link ? (
                  <a href={item.link} target="_blank" rel="noreferrer" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }} className="hover-link">
                    {item.val} ↗
                  </a>
                ) : item.val ? (
                  <span className="text-mono" style={{ color: 'var(--silver-200)' }}>{item.val}</span>
                ) : (
                  <span style={{ color: 'var(--silver-600)', fontSize: '11px' }}>Not indexed</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>


      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── RIGHT HALF: HOPNET RELATIONSHIP INTELLIGENCE ENGINE ─────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Intelligence Engine Header Card */}
        <div className="glass-panel" style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              HOPNet Relationship Intelligence
            </h2>
          </div>
          <p style={{ color: 'var(--silver-400)', fontSize: '12px', lineHeight: 1.4, margin: 0 }}>
            Graph-aware metrics, reachability, centrality, and trust topology calculated directly from active Neo4j relationships.
          </p>
        </div>

        {/* Network Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { label: 'Total Connections', val: totalConn, color: '#ffffff' },
            { label: 'Real Connections', val: profile.realConnections, color: '#ffffff' },
            { label: 'Demo Connections', val: profile.demoConnections, color: 'var(--silver-500)' },
            { label: 'Influence Score', val: profile.influenceScore, color: '#ffffff' },
            { label: 'Strategic Reach', val: reachabilityScore, color: 'var(--silver-200)' },
            { label: 'Network Centrality', val: `${Math.round((profile.centrality || 0) * 100)}%`, color: '#ffffff' },
            { label: 'Avg Path Distance', val: profile.avgPathDistance?.toFixed(1) || '—', color: 'var(--silver-300)' },
            { label: 'Cluster Placement', val: profile.cluster || '—', color: 'var(--silver-400)' },
          ].map(m => (
            <div key={m.label} className="glass-panel" style={{ padding: '12px 14px' }}>
              <div className="text-label" style={{ marginBottom: '4px', fontSize: '9.5px' }}>{m.label}</div>
              <div className="text-mono" style={{ fontSize: '18px', fontWeight: 700, color: m.color }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Intelligence Derived Insights */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div className="text-label" style={{ marginBottom: '14px', color: '#ffffff', fontWeight: 700 }}>Derived Network Insights</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '6px' }}>
              <div className="text-label" style={{ fontSize: '9px' }}>Classification</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>{connectorClassification}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '6px' }}>
              <div className="text-label" style={{ fontSize: '9px' }}>Warm Intro Success</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>{warmIntroPct}%</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '6px' }}>
              <div className="text-label" style={{ fontSize: '9px' }}>Influence Dissemination</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--silver-300)', marginTop: '2px' }}>{propagationScore}%</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '6px' }}>
              <div className="text-label" style={{ fontSize: '9px' }}>Best Bridge Node</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--silver-200)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {bestBridge ? bestBridge.fullName : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Strongest Trust Links */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div className="text-label" style={{ color: '#ffffff', fontWeight: 700 }}>Strongest Direct Trust Links</div>
            <span className="text-mono" style={{ fontSize: '11px', color: 'var(--silver-500)' }}>{profileEdges.length} links</span>
          </div>

          {strongestLinks.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--silver-500)', fontStyle: 'italic' }}>
              No direct relationships registered for this person.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {strongestLinks.map(({ edge, otherPerson }, idx) => (
                <div key={edge.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
                }}>
