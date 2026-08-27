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
