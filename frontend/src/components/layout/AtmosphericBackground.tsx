'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
  baseAlpha: number;
}

export default function AtmosphericBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track mouse for smooth parallax (using target coordinates for lerp interpolation)
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX - width / 2) / (width / 2);
      mouseRef.current.targetY = (e.clientY - height / 2) / (height / 2);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Handle screen resize
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initialize stars/particles
    const particles: Particle[] = [];
    const particleCount = 120;

    for (let i = 0; i < particleCount; i++) {
      const baseAlpha = Math.random() * 0.4 + 0.1;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.05,
        speedY: (Math.random() - 0.5) * 0.05,
        alpha: baseAlpha,
        baseAlpha: baseAlpha,
      });
    }

    // Large slow-moving volumetric mist coordinates
    const nebulas = [
      { x: width * 0.25, y: height * 0.35, r: Math.max(width, height) * 0.45, color: 'rgba(255, 255, 255, 0.015)', t: 0, speed: 0.0003 },
      { x: width * 0.75, y: height * 0.65, r: Math.max(width, height) * 0.55, color: 'rgba(255, 255, 255, 0.01)', t: Math.PI, speed: 0.0002 },
    ];

    // Rendering loop
    const render = () => {
      // Lerp mouse parallax coords for buttery smooth drift
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      ctx.fillStyle = '#020202'; // Obsidian black background
      ctx.fillRect(0, 0, width, height);

      // Draw faint volumetric nebulas
      nebulas.forEach((nebula) => {
        nebula.t += nebula.speed;
        // Slow circular drift
        const dx = Math.sin(nebula.t) * 40 + (mouse.x * -25);
        const dy = Math.cos(nebula.t) * 40 + (mouse.y * -25);
        
        const grad = ctx.createRadialGradient(
          nebula.x + dx,
          nebula.y + dy,
          0,
          nebula.x + dx,
          nebula.y + dy,
          nebula.r
        );
        grad.addColorStop(0, nebula.color);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(nebula.x + dx, nebula.y + dy, nebula.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw spatial grid overlay with parallax
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
      ctx.lineWidth = 1;
      
      const gridSpacing = 80;
      const offsetX = (mouse.x * -15) % gridSpacing;
      const offsetY = (mouse.y * -15) % gridSpacing;

      // Draw vertical grid lines
      for (let x = offsetX; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw horizontal grid lines
      for (let y = offsetY; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw starry particle field
      particles.forEach((p) => {
        // Apply individual parallax based on size (closer stars move faster = 3D depth)
        const px = p.x + mouse.x * -12 * p.size;
        const py = p.y + mouse.y * -12 * p.size;

        // Move stars slowly
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around screen boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Twinkle stars
        p.alpha = p.baseAlpha + Math.sin(Date.now() * 0.001 + p.x) * 0.05;
        p.alpha = Math.max(0.02, Math.min(0.6, p.alpha));

        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
