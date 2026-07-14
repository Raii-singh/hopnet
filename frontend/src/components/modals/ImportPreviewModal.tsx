'use client';

import { useState, useEffect } from 'react';
import { finalizeConnectorIngest } from '@/services/api';
import { useGraphStore } from '@/store/graphStore';

interface ImportPreviewModalProps {
  connectorType: string;
  filename: string;
  previewData: any;
  onClose: () => void;
  onSuccess: (logs: string[]) => void;
}

export default function ImportPreviewModal({
  connectorType,
  filename,
  previewData: initialPreviewData,
  onClose,
  onSuccess,
}: ImportPreviewModalProps) {
  const { initGraph } = useGraphStore();

  const [previewData, setPreviewData] = useState(initialPreviewData);
  const [activeTab, setActiveTab] = useState<'nodes' | 'duplicates' | 'edges'>('nodes');
  const [isIngesting, setIsIngesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleSurvivingOptionChange(index: number, option: 'KEEP_EXISTING' | 'OVERWRITE_WITH_IMPORTED') {
    const updatedMatches = [...previewData.duplicateMatches];
    updatedMatches[index].survivingOption = option;
    setPreviewData({
      ...previewData,
      duplicateMatches: updatedMatches,
    });
  }

  async function handleIngest() {
    setIsIngesting(true);
    setErrorMsg('');
    try {
      const outcome = await finalizeConnectorIngest(connectorType, filename, previewData);
      // Refresh the main graph store
      await initGraph();
      onSuccess(outcome.logs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ingestion failed to complete.');
      setIsIngesting(false);
    }
  }

  const { detectedNodes, duplicateMatches, inferredEdges, summary } = previewData;

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget && !isIngesting) onClose(); }}
      style={{ zIndex: 1000 }}
    >
      <div
        className="glass-panel-strong animate-fade-in-scale"
        style={{
          width: 580,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          padding: 0,
        }}
      >
        {/* Top Accent line */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #ffffff, var(--silver-500))',
          borderRadius: '12px 12px 0 0',
        }} />

        <div style={{ padding: '20px 24px' }}>
          {/* Header */}
