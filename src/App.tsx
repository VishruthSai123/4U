/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, RotateCcw, Heart, MousePointerClick } from 'lucide-react';

// --- Constants ---
const MESSAGES = [
  "Forever mine",
  "Only you",
  "Love you more",
  "My world",
  "Stay close",
  "Heart's desire",
  "Infinite love",
  "You are magic",
  "Soulmate",
  "Always & Forever"
];

const COLORS = [
  '#FF0000', // Pure Red
  '#FF1493', // Deep Pink
  '#FF4500', // Orange Red
  '#DC143C', // Crimson
];

interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  opacity: number;
  speed: number;
  drift: number;
  driftSpeed: number;
  isPopped: boolean;
  message: string;
}

interface BurstParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  life: number;
}

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
}

interface RevealedMessage {
  id: number;
  text: string;
  x3d: number;
  y3d: number;
  z3d: number;
  screenX: number;
  screenY: number;
}

export default function App() {
  // --- Refs & State ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeMessage, setActiveMessage] = useState<RevealedMessage | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [allPopped, setAllPopped] = useState(false);
  const [remainingCount, setRemainingCount] = useState(10);
  
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const burstParticlesRef = useRef<BurstParticle[]>([]);
  const animationFrameRef = useRef<number>(0);
  const nextMessageId = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Camera & Interaction Refs
  const rotation = useRef({ x: 0, y: 0 });
  const targetRotation = useRef<{ x: number, y: number } | null>(null);
  const zoom = useRef(800); // Fixed zoom
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // --- Sound Synthesis ---
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playTwinkle = useCallback(() => {
    if (!isSoundEnabled || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880 + Math.random() * 440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }, [isSoundEnabled]);

  const playChime = useCallback(() => {
    if (!isSoundEnabled || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    [440, 554.37, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0.05, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + i * 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + 0.5 + i * 0.05);
    });
  }, [isSoundEnabled]);

  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, opacity: number) => {
    ctx.save();
    ctx.translate(x, y);
    // Scale for a standard coordinate system
    ctx.scale(size / 10, size / 10);
    
    // Perfect Classic Heart Path (Iconic & Sharp)
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(0, 5.7, -1, 0, -6, 0);
    ctx.bezierCurveTo(-11, 0, -11, 7, -11, 7);
    ctx.bezierCurveTo(-11, 11, -6, 16, 0, 22); // Sharp, elegant bottom point
    ctx.bezierCurveTo(6, 16, 11, 11, 11, 7);
    ctx.bezierCurveTo(11, 7, 11, 0, 6, 0);
    ctx.bezierCurveTo(1, 0, 0, 5.7, 0, 6);
    ctx.closePath();
    
    // Vibrant Solid Fill (Matching the "last screen" heart)
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.fill();

    // Subtle Inner Glow for 3D depth (without making it look like an apple)
    const gradient = ctx.createRadialGradient(-3, -3, 0, 0, 0, 15);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Glossy Specular Highlight (Top-left)
    ctx.beginPath();
    ctx.ellipse(-4, 2, 4, 2.5, Math.PI / 4, 0, Math.PI * 2);
    const specGrad = ctx.createLinearGradient(-8, 0, 0, 5);
    specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = specGrad;
    ctx.fill();
    
    ctx.restore();
  };

  const initParticles = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvasRef.current) {
      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // Exactly 10 hearts with unique messages and collision avoidance
    const count = 10;
    const particles: Particle[] = [];
    const range = 600;
    const minDistance = 250; // Ensure hearts don't collide

    for (let i = 0; i < count; i++) {
      let x, y, z;
      let attempts = 0;
      let colliding = true;

      while (colliding && attempts < 100) {
        x = (Math.random() - 0.5) * range * 1.5;
        y = (Math.random() - 0.5) * range * 1.2;
        z = (Math.random() - 0.5) * range * 1.5;
        
        colliding = particles.some(p => {
          const dx = p.x - x!;
          const dy = p.y - y!;
          const dz = p.z - z!;
          return Math.sqrt(dx*dx + dy*dy + dz*dz) < minDistance;
        });
        attempts++;
      }

      particles.push({
        id: i,
        x: x!,
        y: y!,
        z: z!,
        vx: 0, vy: 0, vz: 0,
        size: 38 + Math.random() * 8,
        color: COLORS[i % COLORS.length],
        opacity: 1.0,
        speed: 0.2 + Math.random() * 0.3,
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.005,
        isPopped: false,
        message: MESSAGES[i]
      });
    }
    particlesRef.current = particles;
    const stars: Star[] = [];
    for (let i = 0; i < 300; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        z: (Math.random() - 0.5) * 2000,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.8 + 0.2
      });
    }
    starsRef.current = stars;
    burstParticlesRef.current = [];
    setAllPopped(false);
    setRemainingCount(10);
    setActiveMessage(null);
    targetRotation.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      if (!ctx || !canvas) return;

      // Auto-rotation smoothing
      if (targetRotation.current) {
        rotation.current.x += (targetRotation.current.x - rotation.current.x) * 0.1;
        rotation.current.y += (targetRotation.current.y - rotation.current.y) * 0.1;
        if (Math.abs(targetRotation.current.x - rotation.current.x) < 0.001 && 
            Math.abs(targetRotation.current.y - rotation.current.y) < 0.001) {
          targetRotation.current = null;
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const width = window.innerWidth;
      const height = window.innerHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const focalLength = zoom.current;
      const cosY = Math.cos(rotation.current.y);
      const sinY = Math.sin(rotation.current.y);
      const cosX = Math.cos(rotation.current.x);
      const sinX = Math.sin(rotation.current.x);

      // --- Stars ---
      starsRef.current.forEach(s => {
        let tx = s.x * cosY + s.z * sinY;
        let tz = -s.x * sinY + s.z * cosY;
        let ty = s.y * cosX - tz * sinX;
        tz = s.y * sinX + tz * cosX;
        const scale = focalLength / (focalLength + tz + 1000);
        if (scale > 0) {
          const sx = centerX + tx * scale;
          const sy = centerY + ty * scale;
          ctx.beginPath();
          ctx.arc(sx, sy, s.size * scale, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = s.opacity * scale;
          ctx.fill();
        }
      });

      // --- Burst Particles ---
      burstParticlesRef.current = burstParticlesRef.current.filter(p => p.life > 0);
      burstParticlesRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        p.life -= 0.025;
        let tx = p.x * cosY + p.z * sinY;
        let tz = -p.x * sinY + p.z * cosY;
        let ty = p.y * cosX - tz * sinX;
        tz = p.y * sinX + tz * cosX;
        const scale = focalLength / (focalLength + tz + 1000);
        if (scale > 0) {
          const sx = centerX + tx * scale;
          const sy = centerY + ty * scale;
          ctx.beginPath();
          ctx.arc(sx, sy, p.size * scale, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life * scale;
          ctx.fill();
        }
      });

      // --- Hearts ---
      const activeParticles = particlesRef.current.filter(p => !p.isPopped);
      const sortedParticles = activeParticles.map(p => {
        let tx = p.x * cosY + p.z * sinY;
        let tz = -p.x * sinY + p.z * cosY;
        let ty = p.y * cosX - tz * sinX;
        tz = p.y * sinX + tz * cosX;
        return { ...p, tx, ty, tz };
      }).sort((a, b) => b.tz - a.tz);

      sortedParticles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        p.vx *= 0.95; p.vy *= 0.95; p.vz *= 0.95;
        const scale = focalLength / (focalLength + p.tz + 1000);
        if (scale > 0) {
          const screenX = centerX + p.tx * scale;
          const screenY = centerY + p.ty * scale;
          const screenScale = p.size * scale;
          drawHeart(ctx, screenX, screenY, screenScale, p.color, p.opacity * scale);
        }
      });

      // --- Sync Active Message ---
      setActiveMessage(prev => {
        if (!prev) return null;
        let tx = prev.x3d * cosY + prev.z3d * sinY;
        let tz = -prev.x3d * sinY + prev.z3d * cosY;
        let ty = prev.y3d * cosX - tz * sinX;
        tz = prev.y3d * sinX + tz * cosX;
        const scale = focalLength / (focalLength + tz + 1000);
        return {
          ...prev,
          screenX: centerX + tx * scale,
          screenY: centerY + ty * scale
        };
      });

      particlesRef.current.forEach(p => {
        const s = sortedParticles.find(sp => sp.id === p.id);
        if (s) {
          p.x = s.x; p.y = s.y; p.z = s.z;
          p.vx = s.vx; p.vy = s.vy; p.vz = s.vz;
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    initParticles();
    animate();
    const handleResize = () => initParticles();
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [initParticles]);

  const handleInteraction = (clientX: number, clientY: number, isMove = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const focalLength = zoom.current;
    const hitbox = 80;
    const cosY = Math.cos(rotation.current.y);
    const sinY = Math.sin(rotation.current.y);
    const cosX = Math.cos(rotation.current.x);
    const sinX = Math.sin(rotation.current.x);

    let closestHeart: { index: number, dist: number, x: number, y: number, p: Particle } | null = null;
    particlesRef.current.forEach((p, index) => {
      if (p.isPopped) return;
      let tx = p.x * cosY + p.z * sinY;
      let tz = -p.x * sinY + p.z * cosY;
      let ty = p.y * cosX - tz * sinX;
      tz = p.y * sinX + tz * cosX;
      const scale = focalLength / (focalLength + tz + 1000);
      const screenX = centerX + tx * scale;
      const screenY = centerY + ty * scale;
      const dx = clientX - screenX;
      const dy = clientY - screenY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 200) {
        const force = (200 - distance) / 200;
        p.vx += (dx / distance) * force * -2;
        p.vy += (dy / distance) * force * -2;
        p.vz += force * -2;
      }
      if (distance < hitbox) {
        if (!closestHeart || distance < closestHeart.dist) {
          closestHeart = { index, dist: distance, x: screenX, y: screenY, p };
        }
      }
    });

    if (!isMove && closestHeart) {
      initAudio();
      playTwinkle();
      playChime();
      createBurst(closestHeart.p.x, closestHeart.p.y, closestHeart.p.z, closestHeart.p.color);
      closestHeart.p.isPopped = true;
      const newMessage: RevealedMessage = {
        id: nextMessageId.current++,
        text: closestHeart.p.message,
        x3d: closestHeart.p.x,
        y3d: closestHeart.p.y,
        z3d: closestHeart.p.z,
        screenX: closestHeart.x,
        screenY: closestHeart.y,
      };
      setActiveMessage(newMessage);
      const remaining = particlesRef.current.filter(p => !p.isPopped).length;
      setRemainingCount(remaining);
      if (remaining === 0) setAllPopped(true);
      setTimeout(() => setActiveMessage(c => c?.id === newMessage.id ? null : c), 3000);
    }
  };

  const focusNextHeart = () => {
    const next = particlesRef.current.find(p => !p.isPopped);
    if (!next) return;
    // Calculate rotation to center this heart
    // tx = x * cosY + z * sinY = 0 => tanY = -x/z
    const targetY = Math.atan2(-next.x, next.z);
    // tz = -x * sinY + z * cosY
    const tz = -next.x * Math.sin(targetY) + next.z * Math.cos(targetY);
    // ty = y * cosX - tz * sinX = 0 => tanX = y/tz
    const targetX = Math.atan2(next.y, tz);
    targetRotation.current = { x: targetX, y: targetY };
  };

  const createBurst = (x: number, y: number, z: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      burstParticlesRef.current.push({
        x, y, z,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        vz: (Math.random() - 0.5) * 12,
        size: Math.random() * 3 + 1,
        color,
        life: 1.0
      });
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    initAudio();
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    handleInteraction(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      rotation.current.y += dx * 0.005; 
      rotation.current.x += dy * 0.005;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      targetRotation.current = null; // Cancel auto-rotation on manual drag
    }
    handleInteraction(e.clientX, e.clientY, true);
  };

  const onPointerUp = () => isDragging.current = false;

  return (
    <div 
      className="relative w-full h-[100dvh] bg-[#000000] overflow-hidden select-none"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-move" onPointerDown={onPointerDown} />

      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex flex-col gap-4 items-end">
        <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="p-3 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all pointer-events-auto backdrop-blur-sm">
          {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        {!allPopped && (
          <button onClick={focusNextHeart} className="p-3 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all pointer-events-auto backdrop-blur-sm flex items-center gap-2" title="Focus Next Heart">
            <MousePointerClick size={20} />
            <span className="text-[10px] uppercase tracking-wider font-medium pr-1">Click Me</span>
          </button>
        )}
      </div>

      {/* Bottom UI */}
      {!allPopped && (
        <div className="absolute bottom-8 left-0 w-full flex justify-center pointer-events-none">
          <div className="px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-[#ff0040] fill-[#ff0040]" />
              <span className="text-white/80 text-sm font-medium tracking-wider">{remainingCount} Hearts Left</span>
            </div>
          </div>
        </div>
      )}

      {/* Synced Revealed Message */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence mode="wait">
          {activeMessage && (
            <motion.div
              key={activeMessage.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.5, ease: "backOut" }}
              className="absolute text-white font-serif italic text-2xl sm:text-4xl whitespace-nowrap"
              style={{
                textShadow: '0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(255,45,85,0.8)',
                left: activeMessage.screenX,
                top: activeMessage.screenY,
                x: '-50%', y: '-150%' // Offset above the heart
              }}
            >
              {activeMessage.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Outro Popup */}
      <AnimatePresence>
        {allPopped && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xl z-50 p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-block mb-8"
              >
                <Heart size={64} className="text-[#ff0040] fill-[#ff0040]" />
              </motion.div>
              <h2 className="text-white font-serif italic text-5xl sm:text-7xl mb-6 tracking-tight leading-tight">
                You Are My Favourite
              </h2>
              <p className="text-white/60 text-sm sm:text-base uppercase tracking-[0.4em] font-light mb-12">
                Forever & Always
              </p>
              <button 
                onClick={initParticles} 
                className="px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-all flex items-center gap-2 mx-auto"
              >
                <RotateCcw size={18} />
                Restart Journey
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!allPopped && (
        <div className="absolute bottom-24 left-0 w-full flex flex-col items-center pointer-events-none">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.5, y: 0 }} transition={{ delay: 1, duration: 2 }} className="flex flex-col items-center gap-2">
            <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/30" />
            <p className="text-white/40 text-[11px] font-light tracking-[0.3em] uppercase">Find the love</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
