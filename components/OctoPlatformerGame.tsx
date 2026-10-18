'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, Download, Code2, RefreshCw } from 'lucide-react';

interface FloatingText {
  text: string;
  x: number;
  y: number;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  minX: number;
  maxX: number;
  animFrame: number;
  dead: boolean;
}

interface Collectible {
  x: number;
  y: number;
  width: number;
  height: number;
  baseY: number;
  type: 'yellow' | 'orange' | 'purple' | 'green' | 'blue' | 'quad' | 'chick' | 'rainbow';
  collected: boolean;
  bobOffset: number;
}

// Module-level physics and runner constants
const TILE_SIZE = 24;
const GRAVITY = 0.58;
const JUMP_FORCE = -11.4;
const SCROLL_SPEED = 2.6; // Continuous forward camera speed
const MOVE_SPEED = 3.2;   // Relative player adjust speed
const MAX_JUMPS = 4;      // Allow jumping up to 4 times before hitting ground (multi-jump)
const RAINBOW_DURATION = 60 * 15; // 15 seconds at 60 FPS

export default function OctoPlatformerGame({
  onOpenCodeViewer,
}: {
  onOpenCodeViewer: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rainbowBarRef = useRef<HTMLDivElement | null>(null);
  const rainbowTextRef = useRef<HTMLSpanElement | null>(null);

  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('octo_game_high_score');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [lives, setLives] = useState<number>(3);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('octo_sound_muted') === 'true';
    }
    return false;
  });
  const [isRainbowActive, setIsRainbowActive] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sound Engine using Web Audio API
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playSound = useCallback((type: 'jump' | 'collect' | 'rainbow' | 'stomp' | 'damage' | 'gameover', val = 1) => {
    if (isMuted) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'jump') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const startF = val === 4 ? 380 : val === 3 ? 300 : val === 2 ? 220 : 150;
      const endF = val === 4 ? 920 : val === 3 ? 800 : val === 2 ? 650 : 520;
      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.exponentialRampToValueAtTime(endF, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'collect') {
      const notes = val >= 100 
        ? [523.25, 659.25, 783.99, 1046.50]
        : val >= 50
        ? [587.33, 739.99, 880.00]
        : val >= 25
        ? [659.25, 783.99]
        : [523.25, 659.25];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.11, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.2);
      });
    } else if (type === 'rainbow') {
      const chords = [440, 554, 659, 830, 880, 1108];
      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.14, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.28);
      });
    } else if (type === 'stomp') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'damage') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'gameover') {
      const gloomyNotes = [329.63, 293.66, 261.63, 220.00, 196.00];
      gloomyNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);
        gain.gain.setValueAtTime(0.15, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.45);
      });
    }
  }, [initAudio, isMuted]);

  const toggleSound = () => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('octo_sound_muted', String(next));
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Game Engine State Refs
  const gameStateRef = useRef({
    gameStarted: false,
    score: 0,
    lives: 3,
    isGameOver: false,
    screenShake: 0,
    frameCount: 0,
    maxGeneratedX: 0,
    chunkPatternIndex: 0,
    groundY: 432,
    camera: { x: 0, y: 0 },
    player: {
      x: 160,
      y: 394,
      width: 32,
      height: 38,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: true,
      jumpCount: 0,
      invulnerableTimer: 0,
      walkFrame: 0,
      rainbowTimer: 0,
      companion: {
        x: 130,
        y: 394,
        active: false,
      },
    },
    platforms: [] as Platform[],
    enemies: [] as Enemy[],
    collectibles: [] as Collectible[],
    floatingTexts: [] as FloatingText[],
    particles: [] as Particle[],
    keys: {
      left: false,
      right: false,
      jump: false,
    },
  });

  const generateChunk = useCallback(() => {
    const state = gameStateRef.current;
    const groundGridY = Math.floor(state.groundY / TILE_SIZE);
    const startG = Math.floor(state.maxGeneratedX / TILE_SIZE);
    const pattern = state.chunkPatternIndex % 6;
    state.chunkPatternIndex++;

    const addP = (gx: number, gy: number, gw: number, gh = 1) => {
      state.platforms.push({
        x: gx * TILE_SIZE,
        y: gy * TILE_SIZE,
        w: gw * TILE_SIZE,
        h: gh * TILE_SIZE,
      });
    };

    const addBug = (gx: number, gy: number, rangeW: number) => {
      state.enemies.push({
        x: gx * TILE_SIZE + 4,
        y: gy * TILE_SIZE - 20,
        width: 28,
        height: 20,
        vx: 1.25,
        minX: gx * TILE_SIZE,
        maxX: (gx + rangeW) * TILE_SIZE - 28,
        animFrame: 0,
        dead: false,
      });
    };

    const addC = (gx: number, gy: number, type: Collectible['type'] = 'yellow') => {
      state.collectibles.push({
        x: gx * TILE_SIZE + 4,
        y: gy * TILE_SIZE - 22,
        width: 16,
        height: 16,
        baseY: gy * TILE_SIZE - 22,
        type,
        collected: false,
        bobOffset: Math.random() * Math.PI * 2,
      });
    };

    if (pattern === 0) {
      // Floating terraces + ground bug trap & collectibles on ground
      addP(startG + 2, groundGridY - 3, 6);
      addP(startG + 10, groundGridY - 5, 8);
      addBug(startG + 11, groundGridY - 5, 6);
      addC(startG + 13, groundGridY - 5, 'purple');
      addC(startG + 15, groundGridY - 5, 'yellow');

      // Ground level: collectibles to collect while running without jumping
      addC(startG + 4, groundGridY, 'yellow');
      addC(startG + 8, groundGridY, 'orange');
      // Ground trap bug to jump over or avoid
      addBug(startG + 19, groundGridY, 7);
      addC(startG + 22, groundGridY, 'green');
      state.maxGeneratedX = (startG + 28) * TILE_SIZE;
    } else if (pattern === 1) {
      // High secret branch with Golden Duckling easter egg
      addP(startG + 4, groundGridY - 4, 6);
      addP(startG + 12, groundGridY - 7, 7);
      addC(startG + 14, groundGridY - 7, 'chick'); // Golden duckling
      addC(startG + 16, groundGridY - 7, 'blue');

      // Ground runway with gems and a ground bug
      addC(startG + 6, groundGridY, 'quad');
      addBug(startG + 10, groundGridY, 6);
      addC(startG + 18, groundGridY, 'yellow');
      state.maxGeneratedX = (startG + 25) * TILE_SIZE;
    } else if (pattern === 2) {
      // Stepping stone high path with ground continuously walkable underneath
      addP(startG + 2, groundGridY - 3, 5);
      addP(startG + 9, groundGridY - 4, 5);
      addP(startG + 16, groundGridY - 5, 5);
      addBug(startG + 10, groundGridY - 4, 3);
      addC(startG + 4, groundGridY - 3, 'orange');
      addC(startG + 11, groundGridY - 4, 'purple');

      // Ground items and ground bug
      addC(startG + 6, groundGridY, 'yellow');
      addBug(startG + 18, groundGridY, 8);
      addC(startG + 22, groundGridY, 'orange');
      state.maxGeneratedX = (startG + 28) * TILE_SIZE;
    } else if (pattern === 3) {
      // Rainbow Companion Altar floating above the continuous ground
      addP(startG + 6, groundGridY - 5, 8);
      addC(startG + 9, groundGridY - 5, 'rainbow'); // Rainbow companion!
      addC(startG + 11, groundGridY - 5, 'blue');

      // Ground level
      addC(startG + 3, groundGridY, 'yellow');
      addBug(startG + 15, groundGridY, 7);
      addC(startG + 18, groundGridY, 'purple');
      state.maxGeneratedX = (startG + 24) * TILE_SIZE;
    } else if (pattern === 4) {
      // Wide open ground run with alternating bugs and items
      addP(startG + 8, groundGridY - 4, 6);
      addC(startG + 10, groundGridY - 4, 'orange');

      addC(startG + 3, groundGridY, 'yellow');
      addBug(startG + 5, groundGridY, 5);
      addC(startG + 12, groundGridY, 'green');
      addBug(startG + 15, groundGridY, 6);
      addC(startG + 19, groundGridY, 'quad');
      state.maxGeneratedX = (startG + 23) * TILE_SIZE;
    } else {
      // Double tier platforms
      addP(startG + 3, groundGridY - 3, 7);
      addP(startG + 12, groundGridY - 5, 7);
      addBug(startG + 4, groundGridY - 3, 5);
      addC(startG + 14, groundGridY - 5, 'blue');
      addC(startG + 16, groundGridY - 5, 'chick');

      addC(startG + 7, groundGridY, 'yellow');
      addBug(startG + 15, groundGridY, 7);
      state.maxGeneratedX = (startG + 26) * TILE_SIZE;
    }
  }, []);

  const buildInitialWorld = useCallback(() => {
    const state = gameStateRef.current;
    state.platforms = [];
    state.enemies = [];
    state.collectibles = [];
    state.floatingTexts = [];
    state.particles = [];
    state.maxGeneratedX = 0;
    state.chunkPatternIndex = 0;

    const groundGridY = Math.floor(state.groundY / TILE_SIZE);

    const addP = (gx: number, gy: number, gw: number, gh = 1) => {
      state.platforms.push({
        x: gx * TILE_SIZE,
        y: gy * TILE_SIZE,
        w: gw * TILE_SIZE,
        h: gh * TILE_SIZE,
      });
    };

    const addBug = (gx: number, gy: number, rangeW: number) => {
      state.enemies.push({
        x: gx * TILE_SIZE + 4,
        y: gy * TILE_SIZE - 20,
        width: 28,
        height: 20,
        vx: 1.25,
        minX: gx * TILE_SIZE,
        maxX: (gx + rangeW) * TILE_SIZE - 28,
        animFrame: 0,
        dead: false,
      });
    };

    const addC = (gx: number, gy: number, type: Collectible['type'] = 'yellow') => {
      state.collectibles.push({
        x: gx * TILE_SIZE + 4,
        y: gy * TILE_SIZE - 22,
        width: 16,
        height: 16,
        baseY: gy * TILE_SIZE - 22,
        type,
        collected: false,
        bobOffset: Math.random() * Math.PI * 2,
      });
    };

    // Initial floating practice tier
    addP(12, groundGridY - 3, 6);
    addC(14, groundGridY - 3, 'orange');

    // Collectibles right on the ground floor
    addC(6, groundGridY, 'yellow');
    addC(9, groundGridY, 'yellow');
    addBug(18, groundGridY, 7); // First ground bug trap to jump over
    addC(22, groundGridY, 'purple');

    state.maxGeneratedX = 26 * TILE_SIZE;

    // Pre-populate chunks ahead
    for (let i = 0; i < 4; i++) {
      generateChunk();
    }
  }, [generateChunk]);

  const resetGame = useCallback(() => {
    const cvs = canvasRef.current;
    const h = cvs ? cvs.height : 500;
    const groundY = Math.max(360, Math.floor((h - 58) / TILE_SIZE) * TILE_SIZE);

    const state = gameStateRef.current;
    state.groundY = groundY;
    state.score = 0;
    state.lives = 3;
    state.isGameOver = false;
    state.gameStarted = false;
    state.screenShake = 0;
    state.camera = { x: 0, y: 0 };
    state.player.x = 160;
    state.player.y = groundY - 38;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.facing = 1;
    state.player.onGround = true;
    state.player.jumpCount = 0;
    state.player.invulnerableTimer = 90;
    state.player.rainbowTimer = 0;
    state.player.companion.active = false;

    setScore(0);
    setLives(3);
    setIsGameOver(false);
    setIsRainbowActive(false);

    buildInitialWorld();
  }, [buildInitialWorld]);

  const triggerStart = useCallback(() => {
    if (!gameStateRef.current.gameStarted) {
      gameStateRef.current.gameStarted = true;
    }
  }, []);

  const handleJump = useCallback(() => {
    const state = gameStateRef.current;
    if (state.isGameOver) return;
    triggerStart();

    if (state.player.jumpCount < MAX_JUMPS) {
      state.player.jumpCount++;
      state.player.onGround = false;

      // Immediate upward impulse, completely resetting downward momentum to elevate upward
      if (state.player.jumpCount === 1) {
        state.player.vy = JUMP_FORCE; // -11.4: initial strong ground jump
        playSound('jump', 1);
      } else if (state.player.jumpCount === 2) {
        state.player.vy = -10.8; // 2nd jump: elevates further up
        playSound('jump', 2);
      } else if (state.player.jumpCount === 3) {
        state.player.vy = -10.2; // 3rd jump: lifts higher into the air
        playSound('jump', 3);
      } else {
        state.player.vy = -9.6;  // 4th jump: final extra boost
        playSound('jump', 4);
      }

      // Air puff particle colors indicating jump tier
      const puffColors = ['#94a3b8', '#38bdf8', '#a855f7', '#ec4899'];
      const puffColor = puffColors[Math.min(state.player.jumpCount - 1, puffColors.length - 1)];

      for (let i = 0; i < 6; i++) {
        state.particles.push({
          x: state.player.x + state.player.width / 2 + (Math.random() - 0.5) * 16,
          y: state.player.y + state.player.height,
          vx: (Math.random() - 0.5) * 2.6,
          vy: Math.random() * 2 + 1,
          color: puffColor,
          size: 3,
          life: 16,
        });
      }
    }
  }, [playSound, triggerStart]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      initAudio();
      triggerStart();
      const state = gameStateRef.current;
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        state.keys.left = true;
      } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        state.keys.right = true;
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (!state.keys.jump) {
          handleJump();
        }
        state.keys.jump = true;
        if (e.code === 'Space') e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        state.keys.left = false;
      } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        state.keys.right = false;
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        state.keys.jump = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleJump, initAudio, triggerStart]);

  // Main Canvas Loop
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      if (!cvs || !containerRef.current) return;
      cvs.width = containerRef.current.clientWidth;
      cvs.height = containerRef.current.clientHeight;
      const groundY = Math.max(360, Math.floor((cvs.height - 58) / TILE_SIZE) * TILE_SIZE);
      gameStateRef.current.groundY = groundY;
    };
    resize();
    window.addEventListener('resize', resize);

    resetGame();

    const checkAABB = (r1: { x: number; y: number; width?: number; w?: number; height?: number; h?: number }, r2: { x: number; y: number; width?: number; w?: number; height?: number; h?: number }) => {
      const w1 = r1.width ?? r1.w ?? 0;
      const h1 = r1.height ?? r1.h ?? 0;
      const w2 = r2.width ?? r2.w ?? 0;
      const h2 = r2.height ?? r2.h ?? 0;
      return r1.x < r2.x + w2 && r1.x + w1 > r2.x && r1.y < r2.y + h2 && r1.y + h1 > r2.y;
    };

    const loop = () => {
      const state = gameStateRef.current;
      state.frameCount++;

      if (state.screenShake > 0) {
        state.screenShake *= 0.88;
        if (state.screenShake < 0.2) state.screenShake = 0;
      }

      const groundY = state.groundY;

      if (!state.isGameOver) {
        if (state.player.invulnerableTimer > 0) {
          state.player.invulnerableTimer--;
        }

        if (state.player.rainbowTimer > 0) {
          state.player.rainbowTimer--;
          const pct = Math.max(0, (state.player.rainbowTimer / RAINBOW_DURATION) * 100);
          const remainingSec = (state.player.rainbowTimer / 60).toFixed(1);

          if (rainbowBarRef.current) {
            rainbowBarRef.current.style.width = `${pct}%`;
          }
          if (rainbowTextRef.current) {
            rainbowTextRef.current.textContent = `${remainingSec}s`;
          }

          if (state.player.rainbowTimer <= 0) {
            state.player.companion.active = false;
            setIsRainbowActive(false);
          } else {
            if (state.frameCount % 3 === 0) {
              const hues = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
              state.particles.push({
                x: state.player.x + Math.random() * state.player.width,
                y: state.player.y + Math.random() * state.player.height,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -Math.random() * 2,
                color: hues[Math.floor(Math.random() * hues.length)],
                size: 3 + Math.random() * 3,
                life: 30,
              });
            }
          }
        }

        // CONTINUOUS CAMERA MOTION AUTO-SCROLL
        if (state.gameStarted) {
          state.camera.x += SCROLL_SPEED;
          state.player.x += SCROLL_SPEED;
          state.player.walkFrame++;
        }

        // Generate procedural chunks ahead
        if (state.camera.x + cvs.width + 800 > state.maxGeneratedX) {
          generateChunk();
        }

        // Garbage collect off-screen entities
        if (state.frameCount % 90 === 0) {
          const discardX = state.camera.x - 300;
          state.platforms = state.platforms.filter((p) => p.x + p.w > discardX);
          state.enemies = state.enemies.filter((b) => b.x + b.width > discardX);
          state.collectibles = state.collectibles.filter((c) => c.x + c.width > discardX);
        }

        // Horizontal steer
        if (state.keys.left) {
          state.player.vx = -MOVE_SPEED;
          state.player.facing = -1;
          state.player.walkFrame++;
        } else if (state.keys.right) {
          state.player.vx = MOVE_SPEED;
          state.player.facing = 1;
          state.player.walkFrame++;
        } else {
          state.player.vx *= 0.65;
          if (Math.abs(state.player.vx) < 0.1) state.player.vx = 0;
          if (state.gameStarted) state.player.facing = 1;
        }

        // Gravity
        state.player.vy += GRAVITY;
        if (state.player.vy > 12) state.player.vy = 12;

        state.player.x += state.player.vx;

        // Screen bounds clamping
        const minScreenX = state.camera.x + 16;
        const maxScreenX = state.camera.x + cvs.width - 54;
        if (state.player.x < minScreenX) {
          state.player.x = minScreenX;
        } else if (state.player.x > maxScreenX) {
          state.player.x = maxScreenX;
        }

        // Horizontal collision with floating platforms
        for (const p of state.platforms) {
          if (checkAABB(state.player, p)) {
            if (state.player.y + state.player.height > p.y + 6 && state.player.y < p.y + p.h - 6) {
              if (state.player.vx > 0) {
                state.player.x = p.x - state.player.width;
              } else if (state.player.vx < 0) {
                state.player.x = p.x + p.w;
              }
            }
          }
        }

        // Vertical movement
        state.player.y += state.player.vy;
        state.player.onGround = false;

        // Vertical collision with floating platforms
        for (const p of state.platforms) {
          if (checkAABB(state.player, p)) {
            if (state.player.vy > 0 && (state.player.y + state.player.height - state.player.vy) <= p.y + 12) {
              state.player.y = p.y - state.player.height;
              state.player.vy = 0;
              state.player.onGround = true;
              state.player.jumpCount = 0;
            } else if (state.player.vy < 0) {
              state.player.y = p.y + p.h;
              state.player.vy = 0;
            }
          }
        }

        // CONTINUOUS SOLID BOTTOM GROUND LEVEL (NO PIT-FALLS)
        if (state.player.y + state.player.height >= groundY) {
          state.player.y = groundY - state.player.height;
          state.player.vy = 0;
          state.player.onGround = true;
          state.player.jumpCount = 0;
        }

        // Update Companion position
        if (state.player.companion.active) {
          const targetX = state.player.x - state.player.facing * 28;
          const targetY = state.player.y - 18 + Math.sin(state.frameCount * 0.1) * 6;
          state.player.companion.x += (targetX - state.player.companion.x) * 0.15;
          state.player.companion.y += (targetY - state.player.companion.y) * 0.15;
        }

        // Update Enemies
        for (const bug of state.enemies) {
          if (bug.dead) continue;
          bug.animFrame++;
          bug.x += bug.vx;

          if (bug.x <= bug.minX) {
            bug.x = bug.minX;
            bug.vx = Math.abs(bug.vx);
          } else if (bug.x >= bug.maxX) {
            bug.x = bug.maxX;
            bug.vx = -Math.abs(bug.vx);
          }

          if (checkAABB(state.player, bug)) {
            const playerBottomPrev = state.player.y + state.player.height - state.player.vy;
            const isFallingOnTop = state.player.vy > 0 && playerBottomPrev <= bug.y + 10;

            if (isFallingOnTop || state.player.rainbowTimer > 0) {
              bug.dead = true;
              playSound('stomp');
              state.player.vy = JUMP_FORCE * 0.75;
              state.player.jumpCount = 1;
              const pts = state.player.rainbowTimer > 0 ? 100 : 50;
              state.score += pts;
              setScore(state.score);
              state.floatingTexts.push({
                text: `+${pts}`,
                x: bug.x,
                y: bug.y - 10,
                alpha: 1.0,
              });
              for (let i = 0; i < 8; i++) {
                state.particles.push({
                  x: bug.x + 14,
                  y: bug.y + 10,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  color: i % 2 === 0 ? '#ea580c' : '#16a34a',
                  size: 3,
                  life: 20,
                });
              }
            } else if (state.player.invulnerableTimer <= 0) {
              state.lives--;
              setLives(state.lives);
              playSound('damage');
              state.screenShake = 16;
              state.player.invulnerableTimer = 110;
              state.player.vy = -6;
              state.player.vx = -state.player.facing * 4;

              if (state.lives <= 0) {
                state.isGameOver = true;
                setFinalScore(state.score);
                setIsGameOver(true);
                playSound('gameover');
                setHighScore((prev) => {
                  const nh = Math.max(prev, state.score);
                  localStorage.setItem('octo_game_high_score', String(nh));
                  return nh;
                });
              }
            }
          }
        }

        // Update Collectibles
        for (const c of state.collectibles) {
          if (c.collected) continue;
          if (checkAABB(state.player, { x: c.x, y: c.baseY, width: c.width, height: c.height })) {
            c.collected = true;
            if (c.type === 'rainbow') {
              state.player.rainbowTimer = RAINBOW_DURATION;
              state.player.companion.active = true;
              state.player.companion.x = state.player.x - 30;
              state.player.companion.y = state.player.y;
              setIsRainbowActive(true);
              if (rainbowBarRef.current) rainbowBarRef.current.style.width = '100%';
              if (rainbowTextRef.current) rainbowTextRef.current.textContent = '15.0s';
              playSound('rainbow');
              state.score += 250;
              setScore(state.score);
              state.floatingTexts.push({
                text: '+250',
                x: c.x,
                y: c.y - 12,
                alpha: 1.0,
              });
            } else {
              let pts = 10;
              if (c.type === 'orange') pts = 25;
              else if (c.type === 'purple') pts = 50;
              else if (c.type === 'blue') pts = 100;
              else if (c.type === 'quad') pts = 150;
              else if (c.type === 'chick') pts = 200;

              if (state.player.rainbowTimer > 0) pts *= 2;
              playSound('collect', pts);
              state.score += pts;
              setScore(state.score);
              state.floatingTexts.push({
                text: `+${pts}`,
                x: c.x,
                y: c.y - 10,
                alpha: 1.0,
              });
            }
          }
        }

        for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
          const ft = state.floatingTexts[i];
          ft.y -= 1.1;
          ft.alpha -= 0.022;
          if (ft.alpha <= 0) {
            state.floatingTexts.splice(i, 1);
          }
        }

        for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
          if (p.life <= 0) {
            state.particles.splice(i, 1);
          }
        }
      }

      // --- RENDERING PIPELINE ---
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.save();

      if (state.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * state.screenShake, (Math.random() - 0.5) * state.screenShake);
      }

      // 1. Technical Grid background
      const gridSize = TILE_SIZE;
      const offsetX = -(state.camera.x % gridSize);
      const offsetY = -(state.camera.y % gridSize);

      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = offsetX; x < cvs.width; x += gridSize) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, cvs.height);
      }
      for (let y = offsetY; y < cvs.height; y += gridSize) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(cvs.width, y + 0.5);
      }
      ctx.stroke();

      // 2. Continuous Solid Ground Floor (Seamless dark platform blocks across the bottom of the screen)
      const numGroundCols = Math.ceil(cvs.width / TILE_SIZE) + 2;
      const groundColStart = Math.floor(state.camera.x / TILE_SIZE) - 1;

      for (let c = 0; c < numGroundCols; c++) {
        const colX = (groundColStart + c) * TILE_SIZE - Math.round(state.camera.x);
        const colY = groundY;

        // Ground surface platform tile
        ctx.fillStyle = '#555b62';
        ctx.fillRect(colX, colY, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = '#6b7280';
        ctx.fillRect(colX, colY, TILE_SIZE, 2);

        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.strokeRect(colX + 0.5, colY + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

        ctx.fillStyle = '#4b5563';
        ctx.fillRect(colX + TILE_SIZE / 2 - 1, colY + TILE_SIZE / 2 - 1, 2, 2);

        // Subsurface foundation below ground surface blocks to bottom of viewport
        const subH = cvs.height - (colY + TILE_SIZE);
        if (subH > 0) {
          ctx.fillStyle = '#3f444a';
          ctx.fillRect(colX, colY + TILE_SIZE, TILE_SIZE, subH);

          ctx.strokeStyle = '#32373d';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(colX + 0.5, colY + TILE_SIZE);
          ctx.lineTo(colX + 0.5, cvs.height);
          ctx.stroke();
        }
      }

      // 3. Camera Transform
      ctx.save();
      ctx.translate(-Math.round(state.camera.x), -Math.round(state.camera.y));

      // Platforms
      for (const p of state.platforms) {
        const numBlocks = Math.round(p.w / TILE_SIZE);
        for (let i = 0; i < numBlocks; i++) {
          const bx = p.x + i * TILE_SIZE;
          const by = p.y;
          const bw = TILE_SIZE;
          const bh = p.h;

          ctx.fillStyle = '#555b62';
          ctx.fillRect(bx, by, bw, bh);

          ctx.fillStyle = '#6b7280';
          ctx.fillRect(bx, by, bw, 2);

          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

          ctx.fillStyle = '#4b5563';
          ctx.fillRect(bx + bw / 2 - 1, by + bh / 2 - 1, 2, 2);
        }
      }

      // Collectibles
      for (const c of state.collectibles) {
        if (c.collected) continue;
        const floatY = c.baseY + Math.sin(state.frameCount * 0.08 + c.bobOffset) * 4;

        ctx.save();
        ctx.translate(Math.round(c.x), Math.round(floatY));

        if (c.type === 'chick') {
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.ellipse(8, 9, 8, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(11, 4, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(15, 3);
          ctx.lineTo(19, 5);
          ctx.lineTo(15, 7);
          ctx.fill();

          ctx.fillStyle = '#111827';
          ctx.fillRect(13, 3, 1.5, 2);

          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.ellipse(6, 9, 4, 2.5, 0.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (c.type === 'rainbow') {
          const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
          for (let i = 0; i < colors.length; i++) {
            ctx.fillStyle = colors[i];
            ctx.fillRect(i * 3.5, 0, 3.5, 16);
          }
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0, 0, 18, 16);
        } else if (c.type === 'quad') {
          const sz = 8;
          ctx.fillStyle = '#ef4444'; ctx.fillRect(0, 0, sz, sz);
          ctx.fillStyle = '#3b82f6'; ctx.fillRect(sz, 0, sz, sz);
          ctx.fillStyle = '#eab308'; ctx.fillRect(0, sz, sz, sz);
          ctx.fillStyle = '#10b981'; ctx.fillRect(sz, sz, sz, sz);
          ctx.strokeStyle = '#1f2937';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, sz * 2, sz * 2);
        } else {
          let fill = '#eab308';
          let border = '#ca8a04';
          if (c.type === 'orange') { fill = '#f97316'; border = '#c2410c'; }
          else if (c.type === 'purple') { fill = '#a855f7'; border = '#7e22ce'; }
          else if (c.type === 'green') { fill = '#22c55e'; border = '#15803d'; }
          else if (c.type === 'blue') { fill = '#3b82f6'; border = '#1d4ed8'; }

          ctx.fillStyle = fill;
          ctx.fillRect(0, 0, 14, 14);

          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(2, 2, 4, 4);

          ctx.strokeStyle = border;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0, 0, 14, 14);
        }
        ctx.restore();
      }

      // Enemies (Bugs)
      for (const bug of state.enemies) {
        if (bug.dead) continue;
        ctx.save();
        ctx.translate(Math.round(bug.x + bug.width / 2), Math.round(bug.y + bug.height / 2));
        ctx.scale(bug.vx >= 0 ? 1 : -1, 1);

        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.8;
        const legCycle = Math.sin(bug.animFrame * 0.35) * 3;

        ctx.beginPath();
        ctx.moveTo(6, 4); ctx.lineTo(10 + legCycle, 9);
        ctx.moveTo(0, 4); ctx.lineTo(0 - legCycle, 9);
        ctx.moveTo(-6, 4); ctx.lineTo(-10 + legCycle, 9);
        ctx.stroke();

        ctx.fillStyle = '#1f2937';
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ea580c';
        ctx.fillRect(-6, -4.5, 5, 8);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(1, -4.5, 5, 8);

        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-9, 0); ctx.lineTo(9, 0);
        ctx.stroke();

        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(9, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(11, -1); ctx.lineTo(15, -4);
        ctx.moveTo(11, 1); ctx.lineTo(15, 4);
        ctx.stroke();

        ctx.restore();
      }

      // Rainbow Companion
      if (state.player.companion.active) {
        ctx.save();
        ctx.translate(Math.round(state.player.companion.x), Math.round(state.player.companion.y));
        const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
        for (let i = 0; i < colors.length; i++) {
          const wave = Math.sin(state.frameCount * 0.15 + i * 0.8) * 3;
          ctx.fillStyle = colors[i];
          ctx.fillRect(-14 - i * 3, -8 + i * 3.2 + wave, 6, 4);
        }
        ctx.fillStyle = '#6ee7b7';
        ctx.beginPath();
        ctx.roundRect(-8, -10, 16, 15, 5);
        ctx.fill();

        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.moveTo(-6, -10); ctx.lineTo(-4, -15); ctx.lineTo(-1, -10);
        ctx.moveTo(1, -10); ctx.lineTo(4, -15); ctx.lineTo(6, -10);
        ctx.fill();

        ctx.fillStyle = '#111827';
        ctx.fillRect(-4, -6, 2, 3); ctx.fillRect(2, -6, 2, 3);

        ctx.fillStyle = '#f472b6';
        ctx.fillRect(-6, -3, 2, 1.5); ctx.fillRect(4, -3, 2, 1.5);

        ctx.restore();
      }

      // Particles
      for (const p of state.particles) {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
      }

      // Octocat Player
      const p = state.player;
      ctx.save();
      ctx.translate(Math.round(p.x + p.width / 2), Math.round(p.y + p.height / 2));
      ctx.scale(p.facing, 1);

      if (p.invulnerableTimer > 0) {
        if (Math.floor(state.frameCount / 4) % 2 === 0) {
          ctx.globalAlpha = 0.3;
        }
      }

      if (p.rainbowTimer > 0) {
        ctx.save();
        const hue = (state.frameCount * 7) % 360;
        ctx.strokeStyle = `hsl(${hue}, 90%, 65%)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -4, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      const headY = -8;

      ctx.fillStyle = '#181717';
      ctx.beginPath();
      ctx.moveTo(-11, headY - 4); ctx.lineTo(-8, headY - 17); ctx.lineTo(-2, headY - 7);
      ctx.moveTo(11, headY - 4); ctx.lineTo(8, headY - 17); ctx.lineTo(2, headY - 7);
      ctx.fill();

      ctx.fillStyle = '#4b5563';
      ctx.beginPath();
      ctx.moveTo(-9, headY - 5); ctx.lineTo(-7, headY - 14); ctx.lineTo(-3, headY - 7);
      ctx.moveTo(9, headY - 5); ctx.lineTo(7, headY - 14); ctx.lineTo(3, headY - 7);
      ctx.fill();

      ctx.fillStyle = '#181717';
      ctx.beginPath();
      ctx.arc(0, headY, 13.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(1, headY + 1.5, 9, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#181717';
      ctx.beginPath();
      ctx.ellipse(-2.5, headY + 1, 1.8, 2.5, 0, 0, Math.PI * 2);
      ctx.ellipse(4.5, headY + 1, 1.8, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, headY - 0.5, 1, 1.2);
      ctx.fillRect(5, headY - 0.5, 1, 1.2);

      ctx.fillStyle = '#181717';
      ctx.fillRect(1, headY + 4, 1.5, 1.2);

      ctx.strokeStyle = '#181717';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-9, headY + 2); ctx.lineTo(-15, headY);
      ctx.moveTo(-9, headY + 4); ctx.lineTo(-14, headY + 5);
      ctx.moveTo(9, headY + 2); ctx.lineTo(15, headY);
      ctx.moveTo(9, headY + 4); ctx.lineTo(14, headY + 5);
      ctx.stroke();

      ctx.fillStyle = '#181717';
      ctx.fillRect(-7, headY + 10, 14, 8);

      const legY = headY + 18;
      const isMoving = (state.gameStarted || Math.abs(p.vx) > 0.1) && p.onGround;

      for (let i = 0; i < 4; i++) {
        const tOffset = (i - 1.5) * 4;
        let legH = 8;
        let bend = 0;
        if (isMoving) {
          bend = Math.sin(p.walkFrame * 0.35 + i * 1.5) * 4.5;
        } else if (!p.onGround) {
          bend = i < 2 ? -2 : 3;
          legH = 6;
        }
        ctx.fillStyle = '#181717';
        ctx.beginPath();
        ctx.roundRect(tOffset - 1.5, legY, 3.2, legH + bend, 1.5);
        ctx.fill();
      }

      ctx.restore();

      // Floating Texts
      for (const ft of state.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 14px ui-monospace, SFMono-Regular, monospace';
        ctx.fillStyle = '#1f2328';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore(); // Camera
      ctx.restore(); // Shake

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [generateChunk, playSound, resetGame]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#f4f4f4] select-none font-sans"
    >
      {/* Top decorative purple band */}
      <div className="absolute top-0 left-0 w-full h-[12px] bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-600 z-20 pointer-events-none" />

      {/* Rainbow Active Banner with Progress Bar & Countdown Timer */}
      {isRainbowActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-30 pointer-events-none select-none animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 text-white font-mono text-xs font-bold px-4 py-1.5 rounded-full shadow-lg tracking-wide flex items-center gap-2 border border-white/30 backdrop-blur-xs">
            <span className="text-sm leading-none animate-pulse">✨</span>
            <span>RAINBOW COMPANION ACTIVE (2X & SHIELD)</span>
            <span className="text-white/60">|</span>
            <span ref={rainbowTextRef} className="font-mono font-extrabold text-amber-200 tabular-nums">
              15.0s
            </span>
          </div>

          {/* Smooth Rainbow Progress Bar Track */}
          <div className="w-56 sm:w-72 h-2.5 bg-slate-900/50 backdrop-blur-xs rounded-full overflow-hidden p-0.5 border border-white/40 shadow-sm">
            <div
              ref={rainbowBarRef}
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400 transition-[width] duration-75 ease-linear shadow-xs"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Main Canvas Viewport */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-pointer select-none"
        onPointerDown={(e) => {
          // Allow clicking anywhere on canvas to trigger jump
          initAudio();
          triggerStart();
          handleJump();
        }}
      />

      {/* HUD Layer */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 sm:p-6">
        {/* Top HUD */}
        <div className="flex justify-between items-center w-full">
          {/* 3 Green Pixel Hearts */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {[0, 1, 2].map((i) => {
              const active = i < lives;
              return (
                <div
                  key={i}
                  className={`transition-all duration-200 ${
                    active ? 'scale-100 opacity-100' : 'scale-90 opacity-20 grayscale'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-xs">
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      fill={active ? '#22c55e' : '#9ca3af'}
                      stroke="#15803d"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              );
            })}
          </div>

          {/* Controls instructions keycaps banner */}
          <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-slate-600 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-md border border-slate-300 shadow-xs">
            <span className="inline-flex items-center justify-center bg-white border border-slate-300 border-b-2 border-b-slate-400 rounded px-1.5 py-0.5 font-bold text-[11px] text-slate-800 min-w-5">
              ←
            </span>
            <span className="inline-flex items-center justify-center bg-white border border-slate-300 border-b-2 border-b-slate-400 rounded px-1.5 py-0.5 font-bold text-[11px] text-slate-800 min-w-5">
              →
            </span>
            <span className="text-slate-600">run & dodge</span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center justify-center bg-white border border-slate-300 border-b-2 border-b-slate-400 rounded px-2 py-0.5 font-bold text-[11px] text-slate-800">
              Space / Click
            </span>
            <span className="text-slate-600">multi-jump (x3)</span>
          </div>

          {/* Score Counter & Controls Bar */}
          <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
            <div className="font-mono text-sm sm:text-base font-semibold text-slate-900 bg-white/70 backdrop-blur-xs px-3 py-1 rounded border border-slate-300 shadow-xs">
              Your score: <span className="font-bold">{score}</span>
            </div>

            {/* Mute Button */}
            <button
              onClick={toggleSound}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              aria-label="Toggle Sound"
              className="bg-white border border-slate-300 hover:border-slate-400 active:bg-slate-100 rounded-md p-1.5 text-slate-800 shadow-xs transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* View Single HTML Code */}
            <button
              onClick={onOpenCodeViewer}
              title="View Single-File HTML Code"
              aria-label="View Code"
              className="hidden md:inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:border-slate-400 active:bg-slate-100 rounded-md px-2.5 py-1 text-xs font-mono text-slate-800 shadow-xs transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>HTML</span>
            </button>

            {/* Download game.html */}
            <a
              href="/game.html"
              download="octo-platformer.html"
              title="Download standalone game.html"
              className="hidden md:inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:border-slate-400 active:bg-slate-100 rounded-md px-2.5 py-1 text-xs font-mono text-slate-800 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              className="hidden sm:inline-flex bg-white border border-slate-300 hover:border-slate-400 active:bg-slate-100 rounded-md p-1.5 text-slate-800 shadow-xs transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom HUD */}
        <div className="flex justify-between items-end w-full">
          {/* Metadata & High score */}
          <div className="font-mono text-xs sm:text-sm text-slate-600 bg-white/85 backdrop-blur-xs px-3 py-1.5 rounded-md border border-slate-300 shadow-xs flex items-center gap-2">
            <span>super-mono / your high score:</span>
            <strong className="text-slate-900 font-bold">{highScore}</strong>
            <span className="inline-block w-2 h-3 bg-emerald-500 animate-[pulse_1s_infinite]" />
          </div>

          {/* Exit / Restart Button */}
          <button
            onClick={() => {
              initAudio();
              if (!isGameOver) {
                gameStateRef.current.lives = 0;
                setLives(0);
                gameStateRef.current.isGameOver = true;
                setFinalScore(gameStateRef.current.score);
                setIsGameOver(true);
                playSound('gameover');
              } else {
                resetGame();
              }
            }}
            className="pointer-events-auto font-mono text-xs sm:text-sm font-medium text-slate-900 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 active:translate-y-0.5 rounded-md px-4 py-1.5 shadow-xs transition-all"
          >
            {isGameOver ? 'Play again' : 'Exit game'}
          </button>
        </div>
      </div>

      {/* On-Screen Mobile Touch Controls */}
      <div className="sm:hidden absolute bottom-16 left-0 w-full px-6 flex justify-between pointer-events-none z-20">
        <div className="flex gap-3 pointer-events-auto">
          <button
            onPointerDown={() => {
              initAudio();
              triggerStart();
              gameStateRef.current.keys.left = true;
            }}
            onPointerUp={() => {
              gameStateRef.current.keys.left = false;
            }}
            onPointerLeave={() => {
              gameStateRef.current.keys.left = false;
            }}
            className="w-14 h-14 rounded-xl bg-white/85 active:bg-slate-200 border border-slate-300 shadow-md flex items-center justify-center text-xl font-bold text-slate-800"
          >
            ◀
          </button>
          <button
            onPointerDown={() => {
              initAudio();
              triggerStart();
              gameStateRef.current.keys.right = true;
            }}
            onPointerUp={() => {
              gameStateRef.current.keys.right = false;
            }}
            onPointerLeave={() => {
              gameStateRef.current.keys.right = false;
            }}
            className="w-14 h-14 rounded-xl bg-white/85 active:bg-slate-200 border border-slate-300 shadow-md flex items-center justify-center text-xl font-bold text-slate-800"
          >
            ▶
          </button>
        </div>
        <div className="pointer-events-auto">
          <button
            onPointerDown={() => {
              initAudio();
              handleJump();
              gameStateRef.current.keys.jump = true;
            }}
            onPointerUp={() => {
              gameStateRef.current.keys.jump = false;
            }}
            className="w-14 h-14 rounded-xl bg-white/85 active:bg-slate-200 border border-slate-300 shadow-md flex items-center justify-center text-xl font-bold text-slate-800"
          >
            ▲
          </button>
        </div>
      </div>

      {/* Game Over Screen Modal */}
      {isGameOver && (
        <div className="absolute inset-0 bg-[#f4f4f4]/80 backdrop-blur-xs flex flex-col items-center justify-center z-30 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 text-center shadow-xl mb-6 flex flex-col items-center min-w-[240px] transform transition-transform animate-in zoom-in-95 duration-200">
            <svg className="w-16 h-12 mb-2" viewBox="0 0 80 50">
              <rect x="18" y="4" width="22" height="6" fill="#ec4899" rx="2" />
              <rect x="16" y="10" width="26" height="6" fill="#8b5cf6" rx="2" />
              <rect x="15" y="16" width="28" height="6" fill="#3b82f6" rx="2" />
              <rect x="16" y="22" width="26" height="6" fill="#10b981" rx="2" />
              <rect x="18" y="28" width="22" height="6" fill="#f59e0b" rx="2" />
              <ellipse cx="46" cy="24" rx="16" ry="14" fill="#181717" />
              <polygon points="34,16 38,4 43,14" fill="#181717" />
              <polygon points="49,14 54,4 58,16" fill="#181717" />
              <ellipse cx="46" cy="25" rx="11" ry="8" fill="#ffffff" />
              <ellipse cx="42" cy="24" rx="2.2" ry="2.8" fill="#181717" />
              <ellipse cx="50" cy="24" rx="2.2" ry="2.8" fill="#181717" />
              <rect x="36" y="34" width="4" height="9" rx="2" fill="#181717" />
              <rect x="42" y="36" width="4" height="9" rx="2" fill="#181717" />
              <rect x="48" y="36" width="4" height="9" rx="2" fill="#181717" />
              <rect x="54" y="34" width="4" height="9" rx="2" fill="#181717" />
            </svg>

            <span className="font-mono text-xs font-bold tracking-widest text-slate-500 uppercase mb-1">
              YOUR SCORE
            </span>
            <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              {finalScore}
            </span>

            {finalScore > 0 && finalScore >= highScore && (
              <span className="mt-2 text-xs font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                ★ NEW HIGH SCORE! ★
              </span>
            )}
          </div>

          <h2 className="font-mono text-4xl sm:text-6xl font-black text-slate-700 tracking-[0.25em] sm:tracking-[0.35em] uppercase mb-8 drop-shadow-xs select-none">
            GAME OVER
          </h2>

          <div className="flex gap-4">
            <button
              onClick={() => {
                initAudio();
                resetGame();
              }}
              className="font-mono text-sm sm:text-base font-semibold text-slate-900 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 active:translate-y-0.5 rounded-lg px-6 py-2.5 shadow-sm transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Play again</span>
            </button>
            <a
              href="/game.html"
              download="octo-platformer.html"
              className="font-mono text-sm sm:text-base font-medium text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-lg px-4 py-2.5 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Save game.html</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
