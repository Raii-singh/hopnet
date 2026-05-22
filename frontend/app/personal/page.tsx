'use client';

import { useGraphStore } from '@/store/graphStore';
import { ALL_NODES } from '@/utils/dummyData';

const ADMIN = ALL_NODES.find(n => n.id === 'r-001')!;

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
  const { allNodes, visibleLinks, setRootNode } = useGraphStore();

  // Real connections of admin
  const adminEdges = visibleLinks.filter(e => {
    const src = typeof e.source === 'string' ? e.source : e.source.id;
    const tgt = typeof e.target === 'string' ? e.target : e.target.id;
    return src === ADMIN.id || tgt === ADMIN.id;
  });

  const realConns = allNodes.filter(n => n.type === 'REAL' && n.id !== ADMIN.id).length;
  const demoConns = allNodes.filter(n => n.type === 'DEMO').length;
  const reachabilityScore = Math.round((ADMIN.influenceScore / 100) * realConns);

  const metrics = [
    { label: 'Total Connections', value: ADMIN.connectionCount, color: 'var(--silver-100)' },
    { label: 'Real Connections', value: ADMIN.realConnections, color: 'var(--neon-cyan)' },
    { label: 'Demo Connections', value: ADMIN.demoConnections, color: 'var(--silver-500)' },
    { label: 'Influence Score', value: ADMIN.influenceScore, color: 'var(--neon-blue)' },
    { label: 'Reachability Score', value: reachabilityScore, sub: `${realConns} nodes reachable`, color: 'var(--neon-violet)' },
    { label: 'Network Centrality', value: `${Math.round((ADMIN.centrality || 0) * 100)}%`, color: 'var(--neon-emerald)' },
    { label: 'Avg Path Distance', value: ADMIN.avgPathDistance?.toFixed(1) || '—', color: 'var(--silver-300)' },
    { label: 'Cluster', value: ADMIN.cluster || '—', color: 'var(--neon-violet)' },
  ];

  // Strongest connections (top 5 by edge weight)
  const strongestLinks = adminEdges
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(edge => {
      const otherId = (() => {
        const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
        return src === ADMIN.id
          ? (typeof edge.target === 'string' ? edge.target : edge.target.id)
          : src;
      })();
      const other = allNodes.find(n => n.id === otherId);
      return { edge, other };
    });

  const intelligenceItems = [
    { label: 'Best Connector Type', value: 'Hub Bridger', color: 'var(--neon-cyan)' },
    { label: 'Warm Intro Probability', value: '82%', color: 'var(--neon-emerald)' },
    { label: 'Strongest Path Trust', value: '91/100', color: 'var(--neon-blue)' },
    { label: 'Strategic Reach', value: `${reachabilityScore} nodes`, color: 'var(--neon-violet)' },
    { label: 'Best Bridge Node', value: 'Priya Mehta', color: 'var(--silver-200)' },
    { label: 'Influence Propagation', value: '94 pts', color: 'var(--neon-cyan)' },
  ];

  return (
    <div className="page-layout">
      <div className="page-content">

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '32px' }}>
          <div className="text-label" style={{ color: 'var(--neon-blue)', marginBottom: '6px' }}>Personal Database</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.02em', margin: 0 }}>
            Your Network Profile
          </h1>
          <p style={{ color: 'var(--silver-500)', fontSize: '13px', marginTop: '6px' }}>
            Admin view — single-user architecture v1
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>

          {/* ── LEFT COLUMN ── */}
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
                {ADMIN.name.charAt(0)}
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--silver-100)', textAlign: 'center', margin: '0 0 4px' }}>
                {ADMIN.name}
              </h2>
              <p style={{ textAlign: 'center', marginBottom: '12px' }}>
                <span className="badge badge-real">● REAL NODE</span>
              </p>
              <p style={{ fontSize: '12px', color: 'var(--silver-500)', lineHeight: 1.6, marginBottom: '14px' }}>
                {ADMIN.bio}
              </p>

              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '16px' }}>
                {ADMIN.tags?.map(tag => (
                  <span key={tag} style={{
                    padding: '2px 8px', borderRadius: '100px',
                    fontSize: '10px', fontWeight: 500,
                    background: 'var(--bg-glass)', border: '1px solid var(--glass-border)',
                    color: 'var(--silver-400)',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>

              <button
                className="glass-button"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setRootNode(ADMIN.id)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                </svg>
                Focus in Graph
              </button>
            </div>

            {/* Metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {metrics.slice(0, 6).map(m => (
                <MetricCard key={m.label} {...m} />
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {metrics.slice(6).map(m => (
                <MetricCard key={m.label} {...m} />
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Connector Intelligence */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span style={{ fontWeight: 600, color: 'var(--silver-100)' }}>Connector Intelligence</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
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
              <div style={{ fontWeight: 600, color: 'var(--silver-100)', marginBottom: '14px' }}>
                Strongest Links
              </div>
              {strongestLinks.length === 0 ? (
                <div style={{ color: 'var(--silver-600)', fontSize: '13px' }}>
                  Expand the graph to see connections
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
                        background: other?.type === 'REAL' ? 'var(--neon-cyan)' : 'var(--silver-500)',
                      }} />
                      <span style={{ color: 'var(--silver-200)', fontWeight: 500, fontSize: '13px', flex: 1 }}>
                        {other?.name || 'Unknown'}
                      </span>
                      <span className={`badge ${edge.edgeType === 'REAL_EDGE' ? 'badge-real-edge' : 'badge-demo'}`}>
                        {edge.edgeType === 'REAL_EDGE' ? 'REAL' : 'DEMO'}
                      </span>
                      <div style={{ textAlign: 'right', minWidth: 50 }}>
                        <div className="text-mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--neon-cyan)' }}>
                          {Math.round(edge.weight * 100)}
                        </div>
                        <div className="text-label" style={{ fontSize: '9px' }}>score</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Network distribution */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontWeight: 600, color: 'var(--silver-100)', marginBottom: '14px' }}>
                Network Distribution
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Tech', count: allNodes.filter(n => n.cluster === 'Tech').length, color: 'var(--neon-blue)' },
                  { label: 'Finance', count: allNodes.filter(n => n.cluster === 'Finance').length, color: 'var(--neon-emerald)' },
                  { label: 'Design', count: allNodes.filter(n => n.cluster === 'Design').length, color: 'var(--neon-violet)' },
                  { label: 'Business', count: allNodes.filter(n => n.cluster === 'Business').length, color: 'var(--neon-amber)' },
                  { label: 'Academia', count: allNodes.filter(n => n.cluster === 'Academia').length, color: 'var(--neon-cyan)' },
                  { label: 'Marketing', count: allNodes.filter(n => n.cluster === 'Marketing').length, color: 'var(--silver-400)' },
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
