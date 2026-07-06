'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';

interface NodeCreateModalProps {
  onClose: () => void;
}

export default function NodeCreateModal({ onClose }: NodeCreateModalProps) {
  const { createNewNode } = useGraphStore();

  const [fullName, setFullName] = useState('');
  const [nodeType, setNodeType] = useState<'REAL' | 'DEMO'>('REAL');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [cluster, setCluster] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [influenceScore, setInfluenceScore] = useState(50);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
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

      const parsedData = {
        fullName: fullName.trim(),
        nodeType,
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        cluster: cluster.trim() || undefined,
        influenceScore,
        tags,
        sourceConnectors: ['Manual Workspace'],
        createdBy: 'Manual Workspace',
      };

      await createNewNode(parsedData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user node.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-panel-strong animate-fade-in-scale"
        style={{
          width: 440,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          padding: 0,
        }}
      >
