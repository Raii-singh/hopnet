'use client';

import { useGraphStore } from '@/store/graphStore';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import React, { useState } from 'react';
import PersonalProfileView from '@/components/profile/PersonalProfileView';
import NodeCreateModal from '@/components/modals/NodeCreateModal';

export default function PersonalPage() {
  const { databaseNodes, visibleLinks, rootNodeId, primaryNodeId, isLoading, refreshDatabase } = useGraphStore();
  const { isAdmin } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    refreshDatabase();
  }, [refreshDatabase]);

  // Active person: primary node, or root node, or Rai Singh (default primary identity)
  const activePerson = (primaryNodeId ? databaseNodes.find(n => n.id === primaryNodeId || n.publicId === primaryNodeId) : null)
    ?? (rootNodeId ? databaseNodes.find(n => n.id === rootNodeId || n.publicId === rootNodeId) : null)
    ?? databaseNodes.find(n => n.publicId === 'HNP-000001' || n.id === 'f02bb0c5-43e0-4e5e-b54a-033a852f1645' || n.fullName.trim().toLowerCase() === 'rai singh')
    ?? databaseNodes[0];

  if (isLoading || !isMounted) {
    return (
      <div className="page-layout" style={{ overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
        <div className="page-content" style={{ paddingBottom: '48px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div className="animate-pulse" style={{ width: 140, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: '8px' }} />
            <div className="animate-pulse" style={{ width: 320, height: 26, background: 'rgba(255,255,255,0.05)', borderRadius: 6 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-panel" style={{ height: 400, padding: 24 }}>
              <div className="animate-pulse" style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', marginBottom: 16 }} />
              <div className="animate-pulse" style={{ width: 180, height: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8 }} />
              <div className="animate-pulse" style={{ width: 120, height: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 3 }} />
            </div>
            <div className="glass-panel" style={{ height: 400, padding: 24 }}>
              <div className="animate-pulse" style={{ width: 220, height: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 16 }} />
              <div className="animate-pulse" style={{ width: '100%', height: 120, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── EMPTY STATE — 0 Persons in Neo4j ───────────────────────────────────────
  if (!activePerson || databaseNodes.length === 0) {
    return (
      <div className="page-layout" style={{ overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
        <div className="page-content" style={{ paddingBottom: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="glass-panel" style={{ padding: '40px', maxWidth: '480px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: '44px', marginBottom: '16px' }}>👤</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--silver-100)', marginBottom: '8px' }}>
              No Personal Identity Found
            </h2>
            <p style={{ color: 'var(--silver-400)', fontSize: '13.5px', marginBottom: '24px', lineHeight: 1.5 }}>
              Your Neo4j database contains 0 registered profiles. Add your first person to initialize relationship intelligence.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="glass-button font-semibold"
                disabled={!isAdmin}
                title={!isAdmin ? 'SUDO Mode Required' : ''}
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.1)',
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  opacity: !isAdmin ? 0.5 : 1,
                  cursor: !isAdmin ? 'not-allowed' : 'pointer'
                }}
              >
                + Add First Person {!isAdmin && '🔒'}
              </button>
              <Link href="/">
                <button className="glass-button" style={{ padding: '8px 16px' }}>
                  Go to Graph View
                </button>
              </Link>
            </div>
          </div>
        </div>

        {showCreateModal && (
          <NodeCreateModal onClose={() => setShowCreateModal(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="page-layout" style={{ overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
      <div className="page-content" style={{ paddingBottom: '48px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="text-label" style={{ color: 'var(--silver-400)', marginBottom: '4px' }}>Personal Database</div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.02em', margin: 0 }}>
              Professional Profile & Relationship Intelligence
            </h1>
            <p style={{ color: 'var(--silver-500)', fontSize: '12.5px', marginTop: '4px' }}>
              Active Neo4j Identity: <span style={{ color: '#ffffff', fontWeight: 600 }}>{activePerson.fullName} ({activePerson.publicId})</span>
            </p>
          </div>

          {/* Selector if multiple persons exist */}
          {databaseNodes.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="text-label" style={{ fontSize: '10px' }}>Switch Profile:</span>
              <select
                className="glass-input"
                value={activePerson.id}
                onChange={e => useGraphStore.getState().setRootNode(e.target.value)}
                style={{ width: 'auto', background: 'var(--bg-glass)', cursor: 'pointer', fontSize: '12px', padding: '4px 10px' }}
              >
                {databaseNodes.map(n => (
                  <option key={n.id} value={n.id} style={{ background: '#020202' }}>
                    {n.fullName} ({n.publicId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── 2-COLUMN PROFILE & INTELLIGENCE VIEW ── */}
        <PersonalProfileView
          profile={activePerson}
          databaseNodes={databaseNodes}
          visibleLinks={visibleLinks}
        />

      </div>
    </div>
  );
}
