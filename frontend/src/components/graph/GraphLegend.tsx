function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function GraphLegend() {
  const nodeTypes = [
    { color: '#ffffff', glow: 'rgba(255,255,255,0.2)', label: 'Real Node', shape: 'circle' },
    { color: '#475569', glow: null, label: 'Demo Node', shape: 'circle' },
    { color: 'rgba(255,255,255,0.4)', glow: null, label: 'Real Edge', shape: 'line' },
    { color: 'rgba(255,255,255,0.1)', glow: null, label: 'Demo Edge', shape: 'line' },
  ];

  const communities = [
    { color: '#ffffff', label: 'Tech Cluster' },
    { color: '#f1f5f9', label: 'Finance Cluster' },
    { color: '#cbd5e1', label: 'Health Cluster' },
    { color: '#94a3b8', label: 'Venture Cluster' },
    { color: '#475569', label: 'Academia Cluster' },
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
                boxShadow: `0 0 4px ${hexToRgba(c.color, 0.4)}`,
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
              border: '1.5px double #ffffff',
              boxShadow: '0 0 4px rgba(255,255,255,0.3)',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '9px', color: 'var(--silver-300)', fontWeight: 600 }}>Bridge Node (Multi-Cluster)</span>
          </div>
        </div>

        {/* Constraint warning */}
        <div style={{
          padding: '4px 6px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '4px',
          fontSize: '9px',
          color: 'var(--silver-400)',
          lineHeight: 1.3,
          textAlign: 'center',
        }}>
          ⚡ REAL→DEMO→REAL blocked
        </div>
      </div>
    </div>
  );
}
