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
