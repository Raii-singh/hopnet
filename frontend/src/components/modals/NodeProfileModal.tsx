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

