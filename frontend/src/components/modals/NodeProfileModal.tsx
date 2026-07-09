'use client';

import { GraphNode } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

interface NodeProfileModalProps {
  node: GraphNode;
  onClose: () => void;
}

function StatRow({ label, value, color = 'var(--silver-200)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
      <span className="text-label">{label}</span>
      <span className="text-mono" style={{ fontSize: '13px', fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

export default function NodeProfileModal({ node, onClose }: NodeProfileModalProps) {
  const { isAdmin } = useAuthStore();

  const {
    workspaceMode,
    modifyUserNode,
    removeUserNode,
    setRootNode,
    primaryNodeId,
    setPrimaryNode,
    highlightNeighbors,
    visibleLinks,
  } = useGraphStore();

  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  const isReal = node.nodeType === 'REAL';

  // Form states
  const [fullName, setFullName] = useState(node.fullName);
  const [nodeType, setNodeType] = useState<'REAL' | 'DEMO'>(node.nodeType);
  const [username, setUsername] = useState(node.username || '');
  const [email, setEmail] = useState(node.email || '');
  const [phone, setPhone] = useState(node.phone || '');
  const [company, setCompany] = useState(node.company || '');
  const [cluster, setCluster] = useState(node.cluster || '');
  const [tagsInput, setTagsInput] = useState(node.tags ? node.tags.join(', ') : '');
  const [influenceScore, setInfluenceScore] = useState(node.influenceScore || 50);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

// Sync state if node changes
  useEffect(() => {
    // Initial optimistic state from the graph
    setFullName(node.fullName);
    setNodeType(node.nodeType);
    setUsername(node.username || '');
    setEmail(node.email || '');
    setPhone(node.phone || '');
    setCompany(node.company || '');
    setCluster(node.cluster || '');
    setTagsInput(node.tags ? node.tags.join(', ') : '');
    setInfluenceScore(node.influenceScore || 50);
    setActiveTab('view');
    setErrorMsg('');

    // Fetch live, fresh data from the server
    let active = true;
    import('@/services/api').then(({ fetchNodeV2 }) => {
      fetchNodeV2(node.id).then(liveNode => {
        if (!active) return;
        setFullName(liveNode.fullName);
        setNodeType(liveNode.nodeType);
        setUsername(liveNode.username || '');
        setEmail(liveNode.email || '');
        setPhone(liveNode.phone || '');
        setCompany(liveNode.company || '');
        setCluster(liveNode.cluster || '');
        setTagsInput(liveNode.tags ? liveNode.tags.join(', ') : '');
        setInfluenceScore(liveNode.influenceScore || 50);
      }).catch(err => console.warn('Failed to fetch live node details:', err));
    });

    return () => { active = false; };
  }, [node.id]); // only refetch if node ID changes, optimistic update otherwise

  const totalConn = node.connectionCount || 0;
  const realRatio = totalConn > 0 ? Math.round((node.realConnections / totalConn) * 100) : 0;
  const influencePercent = Math.min(100, node.influenceScore);
  const centralityPercent = Math.round((node.centrality || 0) * 100);

  // Find strongest connection
  const myEdges = visibleLinks.filter(e => {
    const src = typeof e.source === 'string' ? e.source : e.source.id;
    const tgt = typeof e.target === 'string' ? e.target : e.target.id;
    return (src === node.id || tgt === node.id) && e.edgeType === 'REAL_EDGE';
  });
  const strongestEdge = myEdges.sort((a, b) => b.weight - a.weight)[0];

  // Derive Advanced Relationship Intelligence V3.0
  const strategicReach = totalConn + Math.round((node.influenceScore / 100) * 12 * 0.4);
  const warmIntroPct = Math.min(99, Math.round(node.influenceScore * 0.85));
  const propagationScore = Math.min(98, Math.round(node.influenceScore * 0.92 + (node.realConnections * 1.5)));
  const connectorClassification = node.realConnections > 5 ? 'Community Hub Bridger' : 'Cluster Connector';

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await modifyUserNode(node.id, {
        fullName: fullName.trim(),
        // nodeType is intentionally omitted — it is immutable after creation.
        // The graphStore strips it before calling the v2 API.
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        cluster: cluster.trim() || undefined,
        tags,
        influenceScore,
      });
      setActiveTab('view');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update node configuration.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSoftDelete() {
    if (!confirm(`Are you sure you want to soft delete "${node.fullName}"?\n\nThis will hide the node from the network, but retain the metadata record in database archives.`)) {
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await removeUserNode(node.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete node.');
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
