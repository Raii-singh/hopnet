'use client';

import { useGraphStore } from '@/store/graphStore';
import Link from 'next/link';

function MetricCard({ label, value, sub, color = 'var(--neon-cyan)' }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="glass-panel" style={{ padding: '14px 16px' }}>
      <div className="text-label" style={{ marginBottom: '4px' }}>{label}</div>
      <div className="text-mono" style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--silver-600)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

export default function PersonalPage() {
  const { allNodes, visibleLinks, setRootNode, rootNodeId, dataSource, isLoading } = useGraphStore();

  // Admin = the current root node (first REAL node in the network)
  const ADMIN = allNodes.find(n => n.id === rootNodeId) ?? allNodes.find(n => n.nodeType === 'REAL');

  if (isLoading || !ADMIN || allNodes.length === 0) {
    return (
      <div className="page-layout" style={{ overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
        <div className="page-content" style={{ paddingBottom: '48px' }}>
          
          {/* Header Skeleton */}
          <div style={{ marginBottom: '32px' }}>
            <div className="animate-pulse" style={{ width: 120, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: '8px' }} />
            <div className="animate-pulse" style={{ width: 340, height: 26, background: 'rgba(255,255,255,0.05)', borderRadius: 6, marginBottom: '10px' }} />
            <div className="animate-pulse" style={{ width: 220, height: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 3 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {/* Left Column Skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="animate-pulse" style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
                <div className="animate-pulse" style={{ width: 140, height: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: '6px' }} />
                <div className="animate-pulse" style={{ width: 85, height: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 3, marginBottom: '14px' }} />
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <div className="animate-pulse" style={{ flex: 1, height: 32, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} />
                  <div className="animate-pulse" style={{ flex: 1, height: 32, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="glass-panel" style={{ padding: '14px 16px', height: '76px' }}>
                    <div className="animate-pulse" style={{ width: 80, height: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 2, marginBottom: '8px' }} />
                    <div className="animate-pulse" style={{ width: 40, height: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column Skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '20px', height: '170px' }}>
                <div className="animate-pulse" style={{ width: 140, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: '16px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="glass-panel" style={{ padding: '12px', height: '52px' }}>
                      <div className="animate-pulse" style={{ width: 70, height: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 2, marginBottom: '6px' }} />
                      <div className="animate-pulse" style={{ width: 40, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '20px', height: '220px' }}>
                <div className="animate-pulse" style={{ width: 120, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: '14px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} style={{ height: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                      <div className="animate-pulse" style={{ width: 140, height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 3 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  const adminEdges = visibleLinks.filter(e => {
    const src = typeof e.source === 'string' ? e.source : (e.source as any).id;
    const tgt = typeof e.target === 'string' ? e.target : (e.target as any).id;
    return src === ADMIN.id || tgt === ADMIN.id;
  });

  const realConns = allNodes.filter(n => n.nodeType === 'REAL' && n.id !== ADMIN.id).length;
  const reachabilityScore = Math.round((ADMIN.influenceScore / 100) * realConns);

  const metrics = [
    { label: 'Total Connections', value: ADMIN.connectionCount, color: 'var(--silver-100)' },
    { label: 'Real Connections', value: ADMIN.realConnections, color: 'var(--neon-cyan)' },
    { label: 'Demo Connections', value: ADMIN.demoConnections, color: 'var(--silver-500)' },
    { label: 'Influence Score', value: ADMIN.influenceScore, color: 'var(--neon-blue)' },
    { label: 'Reachability Score', value: reachabilityScore, sub: `${realConns} nodes reachable`, color: 'var(--neon-violet)' },
    { label: 'Network Centrality', value: `${Math.round((ADMIN.centrality || 0) * 100)}%`, color: 'var(--neon-emerald)' },
    { label: 'Avg Path Distance', value: ADMIN.avgPathDistance?.toFixed(1) || '—', color: 'var(--silver-300)' },
    { label: 'Cluster Hub', value: ADMIN.cluster || '—', color: 'var(--neon-violet)' },
  ];

  // Strongest connections (top 5 by edge weight)
  const strongestLinks = adminEdges
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(edge => {
      const otherId = (() => {
        const src = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
        return src === ADMIN.id
          ? (typeof edge.target === 'string' ? edge.target : (edge.target as any).id)
          : src;
      })();
      const other = allNodes.find(n => n.id === otherId);
      return { edge, other };
    });

  // Best bridge = highest influence REAL node that isn't the admin
  const bestBridge = allNodes
    .filter(n => n.nodeType === 'REAL' && n.id !== ADMIN.id)
    .sort((a, b) => b.influenceScore - a.influenceScore)[0];

  const warmIntroPct = Math.min(99, Math.round(ADMIN.influenceScore * 0.87));
  const strongestTrust = strongestLinks[0] ? Math.round(strongestLinks[0].edge.weight * 100) : 0;

  const intelligenceItems = [
    { label: 'Best Connector Type', value: ADMIN.realConnections > 5 ? 'Hub Bridger' : 'Deep Connector', color: 'var(--neon-cyan)' },
    { label: 'Warm Intro Probability', value: `${warmIntroPct}%`, color: 'var(--neon-emerald)' },
    { label: 'Strongest Path Trust', value: `${strongestTrust}/100`, color: 'var(--neon-blue)' },
    { label: 'Strategic Reach', value: `${reachabilityScore} nodes`, color: 'var(--neon-violet)' },
    { label: 'Best Bridge Node', value: bestBridge?.fullName ?? '—', color: 'var(--silver-200)' },
    { label: 'Data Source', value: dataSource === 'api' ? 'Live DB' : 'Demo', color: dataSource === 'api' ? 'var(--neon-emerald)' : 'var(--silver-500)' },
  ];

  return (
    <div className="page-layout" style={{ overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
      <div className="page-content" style={{ paddingBottom: '48px' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '32px' }}>
          <div className="text-label" style={{ color: 'var(--neon-blue)', marginBottom: '6px' }}>Personal Intelligence</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.02em', margin: 0 }}>
            Relationship Intelligence Dashboard
          </h1>
          <p style={{ color: 'var(--silver-500)', fontSize: '13px', marginTop: '6px' }}>
            Relationship intelligence operating system (OS) v2 · Loaded user: <span style={{ color: 'var(--neon-cyan)', fontWeight: 600 }}>{ADMIN.fullName} ({ADMIN.publicId})</span>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>

          {/* ── LEFT COLUMN: Admin Card & Metrics ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Profile card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.3))',
                border: '2px solid rgba(6,182,212,0.5)',
                boxShadow: '0 0 30px rgba(6,182,212,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 700, color: 'var(--neon-cyan)',
                margin: '0 auto 16px',
              }}>
                {ADMIN.fullName.charAt(0)}
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--silver-100)', textAlign: 'center', margin: '0 0 4px' }}>
                {ADMIN.fullName}
              </h2>
              <p style={{ textAlign: 'center', marginBottom: '4px' }}>
                <span className="badge badge-real">● REAL NODE</span>
              </p>
              <p className="text-mono" style={{ textAlign: 'center', fontSize: '12px', color: 'var(--silver-400)', marginBottom: '14px' }}>
                {ADMIN.publicId}
              </p>

              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '16px' }}>
                {ADMIN.tags && ADMIN.tags.length > 0 ? (
                  ADMIN.tags.map(tag => (
                    <span key={tag} style={{
                      padding: '2px 8px', borderRadius: '100px',
                      fontSize: '10px', fontWeight: 500,
                      background: 'var(--bg-glass)', border: '1px solid var(--glass-border)',
                      color: 'var(--silver-400)',
                    }}>
                      {tag}
                    </span>
                  ))
                ) : ADMIN.cluster && (
                  <span style={{
                    padding: '2px 10px', borderRadius: '100px',
                    fontSize: '10px', fontWeight: 500,
                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
                    color: 'var(--neon-violet)',
                  }}>
                    {ADMIN.cluster}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  className="glass-button"
                  style={{ justifyContent: 'center' }}
                  onClick={() => setRootNode(ADMIN.id)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  Focus in Graph
                </button>
                <Link href={`/profile/${ADMIN.publicId}`} style={{ textDecoration: 'none' }}>
                  <button className="glass-button" style={{ width: '100%', justifyContent: 'center', height: '100%' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
                    </svg>
                    Full Profile
                  </button>
                </Link>
              </div>
            </div>

            {/* Metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {metrics.slice(0, 4).map(m => (
                <MetricCard key={m.label} {...m} />
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {metrics.slice(4).map(m => (
                <MetricCard key={m.label} {...m} />
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Connector Intelligence & Connection Distribution ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Connector Intelligence */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span style={{ fontWeight: 600, color: 'var(--silver-100)', fontSize: '14px' }}>Connector Intelligence</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {intelligenceItems.map(item => (
                  <div key={item.label} className="glass-panel" style={{ padding: '12px' }}>
                    <div className="text-label" style={{ marginBottom: '4px' }}>{item.label}</div>
                    <div className="text-mono" style={{ fontSize: '14px', fontWeight: 700, color: item.color }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strongest connections */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontWeight: 600, color: 'var(--silver-100)', fontSize: '14px', marginBottom: '14px' }}>
                Strongest Trust Links
              </div>
              {strongestLinks.length === 0 ? (
                <div style={{ color: 'var(--silver-600)', fontSize: '13px' }}>
                  Expand the graph to compute links
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {strongestLinks.map(({ edge, other }, i) => (
                    <div key={edge.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 12px',
                      background: 'var(--bg-glass)', border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                    }}>
                      <span className="text-mono" style={{ color: 'var(--silver-600)', minWidth: 20, fontSize: '12px' }}>
                        #{i + 1}
                      </span>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: other?.nodeType === 'REAL' ? 'var(--neon-cyan)' : 'var(--silver-500)',
                      }} />
                      <span style={{ color: 'var(--silver-200)', fontWeight: 500, fontSize: '13px', flex: 1 }}>
                        {other?.fullName || 'Unknown'}
                      </span>
                      <span className="text-mono" style={{ fontSize: '11px', color: 'var(--neon-blue)', background: 'rgba(59,130,246,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                        {edge.relationshipType}
                      </span>
                      <div style={{ textAlign: 'right', minWidth: 50 }}>
                        <div className="text-mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--neon-cyan)' }}>
                          {Math.round(edge.weight * 100)}
                        </div>
                        <div className="text-label" style={{ fontSize: '9px' }}>weight</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Network distribution */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontWeight: 600, color: 'var(--silver-100)', fontSize: '14px', marginBottom: '14px' }}>
                Professional Footprint Distribution
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Tech Cluster', count: allNodes.filter(n => n.cluster === 'Tech').length, color: 'var(--neon-blue)' },
                  { label: 'Finance Cluster', count: allNodes.filter(n => n.cluster === 'Finance').length, color: 'var(--neon-emerald)' },
                  { label: 'Design Cluster', count: allNodes.filter(n => n.cluster === 'Design').length, color: 'var(--neon-violet)' },
                  { label: 'Business Cluster', count: allNodes.filter(n => n.cluster === 'Business').length, color: 'var(--neon-amber)' },
                  { label: 'Academia Cluster', count: allNodes.filter(n => n.cluster === 'Academia').length, color: 'var(--neon-cyan)' },
                  { label: 'Marketing Cluster', count: allNodes.filter(n => n.cluster === 'Marketing').length, color: 'var(--silver-400)' },
                ].map(cluster => {
                  const pct = Math.round((cluster.count / allNodes.length) * 100);
                  return (
                    <div key={cluster.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--silver-400)' }}>{cluster.label}</span>
                        <span className="text-mono" style={{ fontSize: '11px', color: cluster.color }}>{cluster.count}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${pct}%`,
                          background: cluster.color,
                          boxShadow: `0 0 6px ${cluster.color}40`,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
