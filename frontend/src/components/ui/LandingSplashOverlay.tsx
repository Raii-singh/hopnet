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
