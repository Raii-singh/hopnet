'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { getIsBackendWarm } from '@/services/api';

/**
 * ColdStartProgressBar
 * ─────────────────────────────────────────────────────────────────────────────
 * Psychological loading bar displayed after visitor clicks "Explore Demo Network".
 *
 * Requirements:
 * 1. Long and thin visual geometry.
 * 2. Psychological pacing:
 *    - Cold-start: Reaches ~90% in 20% of time (~5s), creeps 90%-98% in remaining time.
 *    - Snaps to 100% the exact moment backend data arrives, then smoothly fades out.
 * 3. Warm backend:
 *    - If Render is already awake, finishes very fast (~0.8s - 1.0s) and vanishes.
 */
export default function ColdStartProgressBar() {
  const { isLoading, visibleNodes } = useGraphStore();
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isWarmMode, setIsWarmMode] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);

  useEffect(() => {
    // Check if backend is already warm on initial click
    const warm = getIsBackendWarm();
    setIsWarmMode(warm);
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      if (completedRef.current) return;

      const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds

      if (warm) {
        // FAST MODE (Render is already loaded): 0 -> 100% in ~0.8s
        const p = Math.min(100, (elapsed / 0.8) * 100);
        setProgress(p);
        if (p >= 100) {
          completedRef.current = true;
          clearInterval(interval);
          setTimeout(() => setVisible(false), 300);
        }
      } else {
        // PSYCHOLOGICAL COLD-START MODE:
        // First 5s (20% of ~25s total wait): 0% -> 90%
        // Remaining time: creeps from 90% to 98%
        if (elapsed <= 5) {
          // Rapid quadratic ease-out to 90% in 5 seconds
          const t = elapsed / 5;
          const p = 90 * (1 - Math.pow(1 - t, 2.2));
          setProgress(Math.min(90, Math.max(progress, p)));
        } else {
          // Slow creeping from 90% towards 98%
          const extraTime = elapsed - 5;
          const creep = 90 + 8 * (1 - Math.exp(-extraTime / 18));
          setProgress(Math.min(98, Math.max(progress, creep)));
        }
      }
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // When graph data arrives (isLoading turns false and nodes exist)
  useEffect(() => {
    if (!isLoading && visibleNodes.length > 0 && !completedRef.current) {
      completedRef.current = true;
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLoading, visibleNodes.length]);

  if (!visible) return null;

  const currentPercent = Math.round(progress);

  // Dynamic status text for cold-start HUD
  let statusText = 'Booting cloud container on Render...';
  if (currentPercent >= 100) {
    statusText = 'Connected! Initializing Rai’s Network...';
  } else if (currentPercent >= 92) {
    statusText = 'Almost ready, assembling graph intelligence...';
  } else if (currentPercent >= 75) {
    statusText = 'Synthesizing relationship network paths...';
  } else if (currentPercent >= 45) {
    statusText = 'Connecting Neo4j cluster & verified identities...';
  }

  return (
    <>
      {/* 1. Long, Thin Laser Progress Line across the top of viewport */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 'var(--navbar-height, 64px)',
          left: 0,
          width: `${progress}%`,
          height: '2.5px',
          background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 60%, #93c5fd 90%, #ffffff 100%)',
          boxShadow: '0 0 12px rgba(96, 165, 250, 0.9), 0 0 20px rgba(59, 130, 246, 0.5)',
          transition: isWarmMode ? 'width 0.1s linear' : 'width 0.25s ease-out',
          zIndex: 99999,
          pointerEvents: 'none',
        }}
      />

      {/* 2. Floating Centered Cold-Start HUD Card (Only shown during cold-start mode) */}
      {!isWarmMode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(2, 6, 23, 0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 99998,
            pointerEvents: 'none',
            padding: '20px',
          }}
        >
          <div
            className="glass-panel-strong animate-fade-in-scale"
            style={{
              width: '100%',
              maxWidth: 480,
              padding: '24px 28px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(96, 165, 250, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            {/* Header info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="animate-pulse"
                  style={{
                    display: 'inline-block',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#60a5fa',
                    boxShadow: '0 0 10px #60a5fa',
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--silver-300)',
                  }}
                >
                  Waking Cloud Engine (Cold-Start)
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#60a5fa',
                }}
              >
                {currentPercent}%
              </span>
            </div>

            {/* Long and Thin Progress Bar Container */}
            <div
              style={{
                width: '100%',
                height: '3px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 70%, #ffffff 100%)',
                  boxShadow: '0 0 10px #60a5fa',
                  transition: 'width 0.3s ease-out',
                  borderRadius: '999px',
                }}
              />
            </div>

            {/* Dynamic Status Subtitle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 12,
              }}
            >
              <span
                style={{
                  fontSize: '11.5px',
                  color: 'var(--silver-400)',
                  fontWeight: 400,
                }}
              >
                {statusText}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--silver-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Render Free Tier
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
