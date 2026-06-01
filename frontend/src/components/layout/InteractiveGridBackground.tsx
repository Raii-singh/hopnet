'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function VantaCellsBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vantaRef = useRef<any>(null);

  useEffect(() => {
    let effect: any = null;

    const initVanta = async () => {
      if (!containerRef.current) return;

      // Dynamically import vanta cells — avoids SSR issues
      const VANTA = (await import('vanta/dist/vanta.cells.min')).default;

      effect = VANTA({
        el: containerRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1.0,
        color1: 0x000000,
        color2: 0x777773,
        size: 1.3,
        speed: 1,
      });

      vantaRef.current = effect;
    };

    initVanta();

    return () => {
      vantaRef.current?.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}
