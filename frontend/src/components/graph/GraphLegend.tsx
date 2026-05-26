'use client';

export default function GraphLegend() {
  const nodeTypes = [
    { color: 'var(--neon-cyan)', glow: 'rgba(6,182,212,0.6)', label: 'Real Node', shape: 'circle' },
    { color: 'var(--silver-500)', glow: null, label: 'Demo Node', shape: 'circle' },
    { color: 'var(--neon-blue)', glow: 'rgba(59,130,246,0.6)', label: 'Real Edge', shape: 'line' },
    { color: 'var(--silver-700)', glow: null, label: 'Demo Edge', shape: 'line' },
  ];

  const communities = [
    { color: '#06b6d4', label: 'Tech Cluster' },
    { color: '#10b981', label: 'Finance Cluster' },
    { color: '#f59e0b', label: 'Health Cluster' },
    { color: '#8b5cf6', label: 'Venture Cluster' },
    { color: '#6366f1', label: 'Academia Cluster' },
  ];

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxWidth: 220,
      }}
    >
      <div className="glass-panel" style={{ padding: '10px 12px' }}>
        <div className="text-label" style={{ marginBottom: '8px', fontSize: '10px', color: 'var(--silver-300)' }}>LEGEND MAP</div>
        
        {/* Core elements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
          {nodeTypes.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {item.shape === 'circle' ? (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: item.color,
                  boxShadow: item.glow ? `0 0 6px ${item.glow}` : 'none',
                  flexShrink: 0,
                }} />
              ) : (
                <div style={{
                  width: 14, height: 2, borderRadius: 1,
                  background: item.color,
                  boxShadow: item.glow ? `0 0 4px ${item.glow}` : 'none',
                  flexShrink: 0,
                }} />
              )}
              <span style={{ fontSize: '10.5px', color: 'var(--silver-400)' }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="divider" style={{ margin: '6px 0' }} />

        {/* Communities */}
        <div className="text-label" style={{ marginBottom: '6px', fontSize: '9px', color: 'var(--silver-500)' }}>COMMUNITIES</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '6px' }}>
          {communities.map(c => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: c.color,
                boxShadow: `0 0 4px ${c.color}`,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '9px', color: 'var(--silver-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.label.split(' ')[0]}
              </span>
            </div>
          ))}
          {/* Bridge nodes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', gridColumn: 'span 2' }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'transparent',
              border: '1.5px double #a78bfa',
              boxShadow: '0 0 4px #8b5cf6',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '9px', color: 'var(--neon-violet)', fontWeight: 600 }}>Bridge Node (Multi-Cluster)</span>
          </div>
        </div>

        {/* Constraint warning */}
        <div style={{
          padding: '4px 6px',
          background: 'rgba(244,63,94,0.06)',
          border: '1px solid rgba(244,63,94,0.15)',
          borderRadius: '4px',
          fontSize: '9px',
          color: 'rgba(244,63,94,0.85)',
          lineHeight: 1.3,
          textAlign: 'center',
        }}>
          ⚡ REAL→DEMO→REAL blocked
        </div>
      </div>
    </div>
  );
}
