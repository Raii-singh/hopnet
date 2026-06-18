'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { GraphNode } from '@/types/graph';
import { ProviderId } from '@/providers/graphProvider';

export default function PathfinderPanel() {
  const {
    allNodes,
    workspaceMode,
    tracedPath,
    pathCost,
    focusMode,
    tracePathAction,
    clearTracedPath,
    activeProvider,
    providerCapabilities,
  } = useGraphStore();

  const isImdb = activeProvider === 'imdb';
  const accentColor = providerCapabilities.accentColor;

  const [isOpen, setIsOpen] = useState(false);
  const [startQuery, setStartQuery] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  
  const [startResults, setStartResults] = useState<any[]>([]);
  const [targetResults, setTargetResults] = useState<any[]>([]);
  
  const [selectedStart, setSelectedStart] = useState<any>(null);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [traversalError, setTraversalError] = useState(false);

  // Set default start node to active primary node when visibleNodes are loaded
  useEffect(() => {
    const { visibleNodes, primaryNodeId, rootNodeId } = useGraphStore.getState();
    if (visibleNodes.length > 0 && !selectedStart) {
      const activePrimary = visibleNodes.find(n => n.id === primaryNodeId || n.publicId === primaryNodeId)
        || visibleNodes.find(n => n.id === rootNodeId)
        || visibleNodes[0];
      if (activePrimary) {
        setSelectedStart(activePrimary);
        setStartQuery(activePrimary.fullName);
      }
    }
  }, [selectedStart]);

  useEffect(() => {
    if (startQuery.trim().length < 2) {
      setStartResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { dataSource, allNodes } = useGraphStore.getState();
      if (dataSource === 'api-v2' || dataSource === 'api') {
        import('@/services/api').then(({ searchPersonsV2 }) => {
          searchPersonsV2(startQuery).then(res => setStartResults(res.data.slice(0, 5))).catch(() => setStartResults([]));
        });
      } else {
        const results = allNodes.filter(n =>
          n.fullName.toLowerCase().includes(startQuery.toLowerCase()) ||
          n.publicId.toLowerCase().includes(startQuery.toLowerCase())
        ).slice(0, 5);
        setStartResults(results);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [startQuery]);

  useEffect(() => {
    if (targetQuery.trim().length < 2) {
      setTargetResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { dataSource, allNodes } = useGraphStore.getState();
      if (dataSource === 'api-v2' || dataSource === 'api') {
        import('@/services/api').then(({ searchPersonsV2 }) => {
          searchPersonsV2(targetQuery).then(res => {
            setTargetResults(res.data.filter(n => n.id !== selectedStart?.id).slice(0, 5));
          }).catch(() => setTargetResults([]));
        });
      } else {
        const results = allNodes.filter(n =>
