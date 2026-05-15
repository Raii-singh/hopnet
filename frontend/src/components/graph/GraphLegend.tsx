'use client';

export default function GraphLegend() {
  const items = [
    { color: 'var(--neon-cyan)', glow: 'rgba(6,182,212,0.6)', label: 'Real Node', shape: 'circle' },
    { color: 'var(--silver-500)', glow: null, label: 'Demo Node', shape: 'circle' },
    { color: 'var(--neon-blue)', glow: 'rgba(59,130,246,0.6)', label: 'Real Edge', shape: 'line' },
    { color: 'var(--silver-700)', glow: null, label: 'Demo Edge', shape: 'line' },
  ];

  return (
    <div
      className="animate-slide-in-left"
      style={{
        position: 'fixed',
        bottom: 80,
        left: 20,
        zIndex: 400,
      }}
    >
      <div className="glass-panel" style={{ padding: '10px 14px' }}>
        <div className="text-label" style={{ marginBottom: '10px' }}>Legend</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {items.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {item.shape === 'circle' ? (
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: item.color,
                  boxShadow: item.glow ? `0 0 8px ${item.glow}` : 'none',
                  flexShrink: 0,
                }} />
              ) : (
                <div style={{
                  width: 18, height: 2, borderRadius: 1,
                  background: item.color,
                  boxShadow: item.glow ? `0 0 6px ${item.glow}` : 'none',
                  flexShrink: 0,
                }} />
              )}
              <span style={{ fontSize: '11px', color: 'var(--silver-400)' }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Constraint warning */}
        <div style={{
          marginTop: '12px',
          padding: '6px 8px',
          background: 'rgba(244,63,94,0.08)',
          border: '1px solid rgba(244,63,94,0.2)',
          borderRadius: '6px',
          fontSize: '10px',
          color: 'rgba(244,63,94,0.8)',
          lineHeight: 1.4,
        }}>
          ⚡ REAL→DEMO→REAL traversal blocked
        </div>
      </div>
    </div>
  );
}
