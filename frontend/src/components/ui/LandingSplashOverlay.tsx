'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';

export default function LandingSplashOverlay() {
  const { isLoading } = useGraphStore();
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 1. Smooth animation 0 -> 90% in 2.2 - 2.5 seconds
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev < 90) {
          const next = prev + Math.floor(Math.random() * 3) + 1;
          return Math.min(next, 90);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // 2. When loading finishes (or after 90%), complete 90 -> 100% smoothly over ~500ms and fade out
    if (progress >= 90 && !isLoading) {
      const finishTimer = setInterval(() => {
        setProgress(prev => {
          if (prev < 100) return prev + 2;
          clearInterval(finishTimer);
          setIsFadingOut(true);
          setTimeout(() => setIsVisible(false), 500);
          return 100;
        });
      }, 40);

      return () => clearInterval(finishTimer);
    }
  }, [progress, isLoading]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.09)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '900px', padding: '0 24px' }}>
        {/* HOPNet Logo with subtle glowing pulse */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <svg width="64" height="64" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.4))' }}>
            <circle cx="14" cy="7" r="3" fill="#ffffff" />
            <circle cx="24" cy="14" r="3" fill="#e2e8f0" />
            <circle cx="20" cy="24" r="3" fill="#cbd5e1" />
            <circle cx="8" cy="24" r="3" fill="#94a3b8" />
            <circle cx="4" cy="14" r="3" fill="#64748b" />
            <circle cx="14" cy="14" r="2.5" fill="white" fillOpacity="0.9" />
            <line x1="14" y1="7" x2="14" y2="14" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.5" />
            <line x1="24" y1="14" x2="14" y2="14" stroke="#e2e8f0" strokeWidth="1.2" strokeOpacity="0.5" />
            <line x1="20" y1="24" x2="14" y2="14" stroke="#cbd5e1" strokeWidth="1.2" strokeOpacity="0.5" />
            <line x1="8" y1="24" x2="14" y2="14" stroke="#94a3b8" strokeWidth="1.2" strokeOpacity="0.5" />
            <line x1="4" y1="14" x2="14" y2="14" stroke="#64748b" strokeWidth="1.2" strokeOpacity="0.5" />
          </svg>
        </div>

        {/* Brand Name */}
        <h1 style={{
          margin: '0 0 4px 0',
          fontSize: '32px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #ffffff, #94a3b8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          HOP<span style={{ WebkitTextFillColor: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>Net</span>
        </h1>

        <p style={{ margin: '0 0 28px 0', fontSize: '11px', color: 'var(--silver-400)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
          High-Order Path Network Intelligence
        </p>

        {/* Progress Bar Line Track - Thin 2px & 70% width */}
        <div style={{
          width: '70%',
          maxWidth: '850px',
          height: 2,
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: 100,
          overflow: 'hidden',
          marginBottom: '16px',
          position: 'relative',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #818cf8, #ffffff)',
            borderRadius: 100,
            transition: 'width 0.1s ease-out',
            boxShadow: '0 0 12px rgba(255, 255, 255, 0.8)',
          }} />
        </div>

        {/* Status text */}
        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--silver-300)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: progress >= 90 ? '#3b82f6' : '#94a3b8', boxShadow: '0 0 6px currentColor' }} />
          <span>{Math.round(progress)}% — {progress >= 90 ? 'Finishing Graph Mesh...' : 'Loading Network Mesh...'}</span>
        </div>
      </div>
    </div>
  );
}
