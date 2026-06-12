'use client';

import { useGraphStore } from '@/store/graphStore';
import { GraphNode } from '@/types/graph';
import { useState, useEffect } from 'react';
import { searchPersonsV2 } from '@/services/api';

export default function GraphControls() {
  const {
    hopDepth, showDemoNodes, searchQuery, focusMode,
    setHopDepth, toggleDemoNodes, setSearchQuery,
    resetGraph, setRootNode, allNodes, visibleNodes,
    providerCapabilities, activeProvider, dataSource,
    activeEdgeTypes, minTrustFilter, setGraphFilters,
    primaryNodeId, rootNodeId, tracedPath, pathCost,
    tracePathAction, clearTracedPath,
  } = useGraphStore();

  const RELATIONSHIP_TYPES = ['colleague', 'mentor', 'friend', 'cofounder', 'investor'];

  const [searchResults, setSearchResults] = useState<{id: string, fullName: string, cluster?: string}[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Advanced filters dropdown state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Pathfinder state inside right sidebar
  const [isPathfinderOpen, setIsPathfinderOpen] = useState(false);
  const [startQuery, setStartQuery] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [startResults, setStartResults] = useState<any[]>([]);
  const [targetResults, setTargetResults] = useState<any[]>([]);
  const [selectedStart, setSelectedStart] = useState<any>(null);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [traversalError, setTraversalError] = useState(false);

  const isImdb = activeProvider === 'imdb';
  const accentColor = providerCapabilities.accentColor;

  // Auto-set start node to primaryNode / rootNode / first visible node
  useEffect(() => {
    if (visibleNodes.length > 0 && !selectedStart) {
      const activePrimary = visibleNodes.find(n => n.id === primaryNodeId || n.publicId === primaryNodeId)
        || visibleNodes.find(n => n.id === rootNodeId)
        || visibleNodes[0];
      if (activePrimary) {
        setSelectedStart(activePrimary);
        setStartQuery(activePrimary.fullName);
      }
    }
  }, [visibleNodes, primaryNodeId, rootNodeId, selectedStart]);

  // Pathfinder start search
  useEffect(() => {
    if (startQuery.trim().length < 2) {
      setStartResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (dataSource === 'api-v2' || dataSource === 'api') {
        searchPersonsV2(startQuery).then(res => setStartResults(res.data.slice(0, 5))).catch(() => setStartResults([]));
      } else {
        const results = allNodes.filter(n =>
          n.fullName.toLowerCase().includes(startQuery.toLowerCase()) ||
          n.publicId.toLowerCase().includes(startQuery.toLowerCase())
        ).slice(0, 5);
        setStartResults(results);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [startQuery, dataSource, allNodes]);

  // Pathfinder target search
  useEffect(() => {
    if (targetQuery.trim().length < 2) {
      setTargetResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (dataSource === 'api-v2' || dataSource === 'api') {
        searchPersonsV2(targetQuery).then(res => {
          setTargetResults(res.data.filter(n => n.id !== selectedStart?.id).slice(0, 5));
        }).catch(() => setTargetResults([]));
      } else {
        const results = allNodes.filter(n =>
          n.id !== selectedStart?.id &&
          (n.fullName.toLowerCase().includes(targetQuery.toLowerCase()) ||
            n.publicId.toLowerCase().includes(targetQuery.toLowerCase()))
        ).slice(0, 5);
        setTargetResults(results);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [targetQuery, selectedStart, dataSource, allNodes]);

  useEffect(() => {
    if (!showSearch) {
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        if (dataSource === 'api-v2') {
          const res = await searchPersonsV2(searchQuery);
          if (active) {
            setSearchResults(res.data.map(n => ({
              id: n.id,
              fullName: n.fullName,
              cluster: n.cluster || undefined
            })).slice(0, 8));
          }
        } else {
          const results = allNodes.filter(n => {
            const name = n.fullName?.toLowerCase() ?? '';
            const cluster = n.cluster?.toLowerCase() ?? '';
            const q2 = searchQuery.toLowerCase();
            return name.includes(q2) || cluster.includes(q2);
          }).slice(0, 8);
          if (active) setSearchResults(results.map(n => ({ id: n.id, fullName: n.fullName, cluster: n.cluster })));
        }
      } catch (err) {
        console.warn('Search failed:', err);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, showSearch, dataSource, allNodes, setSearchQuery]);

  function selectSearchResult(nodeId: string) {
    setRootNode(nodeId);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  }

  async function handleTracePath() {
    if (!selectedStart || !selectedTarget) return;
    setTraversalError(false);
    if (!isImdb && selectedStart.nodeType === 'DEMO' && selectedTarget.nodeType === 'REAL') {
      setTraversalError(true);
      return;
    }
    await tracePathAction(selectedStart.id, selectedTarget.id);
  }

  function handleResetPath() {
    setSelectedTarget(null);
    setTargetQuery('');
    setTraversalError(false);
    clearTracedPath();
  }

  if (focusMode) return null;
