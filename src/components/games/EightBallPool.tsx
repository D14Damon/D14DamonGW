import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Matter from 'matter-js';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  Target,
  Zap,
  Gauge,
  Volume2,
  Shield,
  Bot,
  User,
} from 'lucide-react';
import { AiGameConfig } from '../VsAiArena';
import { useAuth } from '../../context/AuthContext';
import { soundManager } from '../../utils/soundEffects';

const { Engine, World, Bodies, Body, Vector } = Matter;

interface EightBallPoolProps {
  onBackToHub: () => void;
  aiConfig?: AiGameConfig | null;
}

interface BallInfo {
  id: number;
  color: string;
  label: string;
  stripe?: boolean;
}

const W = 800;
const H = 450;
const BALL_RADIUS = 10;
const BALL_DIAM = BALL_RADIUS * 2;
const CUSHION = 40;
const POCKET_RADIUS = 22;

const BALL_DATA: BallInfo[] = [
  { id: 0, color: '#ffffff', label: 'CUE' },
  { id: 1, color: '#ffd100', label: '1' },
  { id: 2, color: '#0066cc', label: '2' },
  { id: 3, color: '#ff3333', label: '3' },
  { id: 4, color: '#9933cc', label: '4' },
  { id: 5, color: '#ff8800', label: '5' },
  { id: 6, color: '#009933', label: '6' },
  { id: 7, color: '#993300', label: '7' },
  { id: 8, color: '#000000', label: '8' },
  { id: 9, color: '#ffd100', label: '9', stripe: true },
  { id: 10, color: '#0066cc', label: '10', stripe: true },
  { id: 11, color: '#ff3333', label: '11', stripe: true },
  { id: 12, color: '#9933cc', label: '12', stripe: true },
  { id: 13, color: '#ff8800', label: '13', stripe: true },
  { id: 14, color: '#009933', label: '14', stripe: true },
  { id: 15, color: '#993300', label: '15', stripe: true },
];

const POCKETS = [
  { x: CUSHION, y: CUSHION },
  { x: W / 2, y: CUSHION - 4 },
  { x: W - CUSHION, y: CUSHION },
  { x: CUSHION, y: H - CUSHION },
  { x: W / 2, y: H - CUSHION + 4 },
  { x: W - CUSHION, y: H - CUSHION },
];

export const EightBallPool: React.FC<EightBallPoolProps> = ({ onBackToHub, aiConfig }) => {
  const { updateStats } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [pocketedByPlayer, setPocketedByPlayer] = useState<BallInfo[]>([]);
  const [pocketedByAi, setPocketedByAi] = useState<BallInfo[]>([]);
  const [statusMessage, setStatusMessage] = useState('Drag from the cue ball to aim & shoot. Release to hit.');
  const [isScratch, setIsScratch] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [currentPowerPct, setCurrentPowerPct] = useState(0);
  const [matchCount, setMatchCount] = useState(1);

  const hasRecordedStatsRef = useRef(false);
  const turnRef = useRef<'player' | 'ai'>('player');
  turnRef.current = turn;

  // Physics engine refs
  const engineRef = useRef<Matter.Engine | null>(null);
  const ballsRef = useRef<Matter.Body[]>([]);
  const cueBallRef = useRef<Matter.Body | null>(null);
  const aimingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const aimVecRef = useRef({ dx: 0, dy: 0, power: 0, angle: 0 });
  const animFrameRef = useRef<number | null>(null);
  const wasMovingRef = useRef(false);
  const pocketedThisShotRef = useRef<BallInfo[]>([]);

  // Helper: check if any ball is moving
  const checkBallsMoving = useCallback(() => {
    return ballsRef.current.some(
      (b) => Math.abs(b.velocity.x) > 0.08 || Math.abs(b.velocity.y) > 0.08
    );
  }, []);

  // Helper: create a ball body
  const createBallBody = useCallback((x: number, y: number, data: BallInfo, world: Matter.World) => {
    const body = Bodies.circle(x, y, BALL_RADIUS, {
      restitution: 0.88,
      friction: 0.04,
      frictionAir: 0.012,
      label: 'ball',
    });
    // Attach custom data to body
    (body as unknown as { data: BallInfo }).data = data;
    World.add(world, body);
    return body;
  }, []);

  // Rack balls into standard triangle
  const setupRack = useCallback(() => {
    if (!engineRef.current) return;
    const world = engineRef.current.world;

    // Clear existing balls from world
    ballsRef.current.forEach((b) => {
      World.remove(world, b);
    });
    ballsRef.current = [];
    cueBallRef.current = null;
    pocketedThisShotRef.current = [];

    const startX = W - 200;
    const startY = H / 2;
    const spacing = BALL_DIAM + 0.6;
    const order = [1, 2, 3, 8, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
    let idx = 0;

    const newBalls: Matter.Body[] = [];
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col <= row; col += 1) {
        const x = startX + row * spacing * 0.866;
        const y = startY - (row * spacing / 2) + col * spacing;
        const bData = BALL_DATA.find((b) => b.id === order[idx]) || BALL_DATA[1];
        newBalls.push(createBallBody(x, y, bData, world));
        idx += 1;
      }
    }

    // Cue ball
    const cue = createBallBody(170, H / 2, BALL_DATA[0], world);
    newBalls.push(cue);
    cueBallRef.current = cue;
    ballsRef.current = newBalls;

    setGameOver(false);
    setWinner(null);
    setPlayerScore(0);
    setAiScore(0);
    setPocketedByPlayer([]);
    setPocketedByAi([]);
    setTurn('player');
    setIsScratch(false);
    setStatusMessage('Rack set! Drag from cue ball to aim & shoot.');
    hasRecordedStatsRef.current = false;
  }, [createBallBody]);

  // Initialize Matter.js Physics Engine and Table
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create engine
    const engine = Engine.create();
    engine.gravity.y = 0; // Top-down pool table: 0 gravity
    engine.gravity.x = 0;
    engineRef.current = engine;
    const world = engine.world;

    // Create cushions/walls with rounded corners
    const walls = [
      Bodies.rectangle(W / 2, CUSHION / 2, W - CUSHION * 2, 14, {
        isStatic: true,
        restitution: 0.82,
        friction: 0.05,
        label: 'wall',
      }),
      Bodies.rectangle(W / 2, H - CUSHION / 2, W - CUSHION * 2, 14, {
        isStatic: true,
        restitution: 0.82,
        friction: 0.05,
        label: 'wall',
      }),
      Bodies.rectangle(CUSHION / 2, H / 2, 14, H - CUSHION * 2, {
        isStatic: true,
        restitution: 0.82,
        friction: 0.05,
        label: 'wall',
      }),
      Bodies.rectangle(W - CUSHION / 2, H / 2, 14, H - CUSHION * 2, {
        isStatic: true,
        restitution: 0.82,
        friction: 0.05,
        label: 'wall',
      }),
    ];
    World.add(world, walls);

    // Initial Rack
    setupRack();

    // Collision sound listener
    Matter.Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      for (let i = 0; i < pairs.length; i += 1) {
        const { bodyA, bodyB } = pairs[i];
        if (bodyA.label === 'ball' && bodyB.label === 'ball') {
          soundManager.playPop();
        } else if (bodyA.label === 'ball' || bodyB.label === 'ball') {
          soundManager.playTick();
        }
      }
    });

    // Drawing Helper: Ball with realistic lighting, stripe band and number
    const drawBall = (b: Matter.Body) => {
      const pos = b.position;
      const data = (b as unknown as { data: BallInfo }).data || BALL_DATA[0];

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Ball shadow
      ctx.beginPath();
      ctx.arc(2, 3, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fill();

      // Ball sphere base
      ctx.beginPath();
      ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(-3, -3, 0.5, 0, 0, BALL_RADIUS);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, data.color);
      grad.addColorStop(1, '#111827');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Stripe band for balls 9-15
      if (data.stripe) {
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS - 1.5, -0.65, 0.65);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS - 1.5, Math.PI - 0.65, Math.PI + 0.65);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
      }

      // Number badge
      if (data.id !== 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 6.5px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.label, 0, 0.5);
      } else {
        // Red dot on Cue Ball for spin feedback
        ctx.beginPath();
        ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      }

      ctx.restore();
    };

    // Check Pockets Function
    const checkPockets = () => {
      const balls = ballsRef.current;
      const cue = cueBallRef.current;

      for (let i = balls.length - 1; i >= 0; i -= 1) {
        const b = balls[i];
        const data = (b as unknown as { data: BallInfo }).data;

        for (const p of POCKETS) {
          const d = Math.hypot(b.position.x - p.x, b.position.y - p.y);
          if (d < POCKET_RADIUS - BALL_RADIUS / 2) {
            if (data.id === 0) {
              // SCRATCH: Respawn cue ball
              soundManager.playWrongGuess();
              setIsScratch(true);
              setStatusMessage('Scratch! Cue ball sunk. Respawning...');
              setTimeout(() => {
                if (cue) {
                  Body.setPosition(cue, { x: 170, y: H / 2 });
                  Body.setVelocity(cue, { x: 0, y: 0 });
                  Body.setAngularVelocity(cue, 0);
                  setIsScratch(false);
                }
              }, 400);
            } else {
              // Pocketed Object Ball!
              soundManager.playCorrect();
              World.remove(world, b);
              balls.splice(i, 1);
              pocketedThisShotRef.current.push(data);

              const currentTurn = turnRef.current;
              if (currentTurn === 'player') {
                setPocketedByPlayer((prev) => [...prev, data]);
                setPlayerScore((prev) => prev + (data.id === 8 ? 200 : 50));
              } else {
                setPocketedByAi((prev) => [...prev, data]);
                setAiScore((prev) => prev + (data.id === 8 ? 200 : 50));
              }

              // 8-Ball Sunk Check
              if (data.id === 8) {
                const wonByPlayer = currentTurn === 'player';
                setGameOver(true);
                setWinner(wonByPlayer ? 'player' : 'ai');
                setStatusMessage(
                  wonByPlayer
                    ? '8-Ball sunk! You Won the Match! (+300 PTS)'
                    : '8-Ball sunk by opponent. Match ended.'
                );
              }
            }
            break;
          }
        }
      }
    };

    // Main Game Rendering Loop
    const loop = () => {
      Engine.update(engine, 1000 / 60);
      checkPockets();

      const currentlyMoving = checkBallsMoving();

      // Check when all balls come to rest after a shot
      if (wasMovingRef.current && !currentlyMoving) {
        wasMovingRef.current = false;
        const sunkCount = pocketedThisShotRef.current.length;
        pocketedThisShotRef.current = [];

        // If player pocketed a ball (and didn't scratch), they get another turn!
        if (sunkCount > 0) {
          setStatusMessage(
            turnRef.current === 'player'
              ? `Nice shot! Sunk ${sunkCount} ball(s) — take another turn!`
              : `Opponent sunk ${sunkCount} ball(s) and keeps shooting.`
          );
        } else {
          // Switch turn if AI mode enabled
          if (aiConfig) {
            const nextTurn = turnRef.current === 'player' ? 'ai' : 'player';
            setTurn(nextTurn);
            setStatusMessage(
              nextTurn === 'player'
                ? 'Your Turn! Drag from cue ball to aim & shoot.'
                : 'AI Opponent is calculating angle...'
            );
          }
        }
      }

      // Clear Table
      ctx.clearRect(0, 0, W, H);

      // 1. Table Bed Felt (Emerald Velvet with Vignette)
      const feltGrad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W / 1.5);
      feltGrad.addColorStop(0, '#2d9c57');
      feltGrad.addColorStop(0.8, '#207e45');
      feltGrad.addColorStop(1, '#156133');
      ctx.fillStyle = feltGrad;
      ctx.fillRect(0, 0, W, H);

      // Headstring / Baulk Line & Spot
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(170, CUSHION);
      ctx.lineTo(170, H - CUSHION);
      ctx.stroke();

      // Spot dot at head & foot
      ctx.beginPath();
      ctx.arc(170, H / 2, 2.5, 0, Math.PI * 2);
      ctx.arc(W - 200, H / 2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      // 2. Draw Table Cushions & Rail Trim
      ctx.fillStyle = '#5c3a21'; // Mahogany wood rail
      // Top rail
      ctx.fillRect(0, 0, W, CUSHION);
      // Bottom rail
      ctx.fillRect(0, H - CUSHION, W, CUSHION);
      // Left rail
      ctx.fillRect(0, 0, CUSHION, H);
      // Right rail
      ctx.fillRect(W - CUSHION, 0, CUSHION, H);

      // Gold Rail Inlay Sight Diamonds
      const drawDiamond = (dx: number, dy: number) => {
        ctx.beginPath();
        ctx.arc(dx, dy, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#fde047';
        ctx.fill();
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      };
      [W * 0.25, W * 0.5, W * 0.75].forEach((x) => {
        drawDiamond(x, CUSHION / 2);
        drawDiamond(x, H - CUSHION / 2);
      });
      [H * 0.33, H * 0.66].forEach((y) => {
        drawDiamond(CUSHION / 2, y);
        drawDiamond(W - CUSHION / 2, y);
      });

      // 3. Draw 6 Leather Pockets with Drop Depth
      POCKETS.forEach((p) => {
        // Brass pocket rim
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS + 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#b45309';
        ctx.fill();
        // Inner pocket shadow drop
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
        const pGrad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, POCKET_RADIUS);
        pGrad.addColorStop(0, '#000000');
        pGrad.addColorStop(0.85, '#090d16');
        pGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = pGrad;
        ctx.fill();
      });

      // 4. Draw All Active Balls
      ballsRef.current.forEach(drawBall);

      // 5. Draw Aim Trajectory & Cue Stick when Aiming
      const cue = cueBallRef.current;
      if (aimingRef.current && cue && aimVecRef.current.power > 2) {
        const { angle, power } = aimVecRef.current;
        const cx = cue.position.x;
        const cy = cue.position.y;

        // A. Forward Aim Guideline (Dashed line pointing to shot direction)
        const shotAngle = angle + Math.PI; // opposite direction of pull back
        const guideLen = Math.min(320, 80 + power * 2);
        const gx = cx + Math.cos(shotAngle) * guideLen;
        const gy = cy + Math.sin(shotAngle) * guideLen;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(cx, cy);
        ctx.lineTo(gx, gy);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Ghost cue ball at max guide
        ctx.beginPath();
        ctx.arc(gx, gy, BALL_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // B. Tapered Wooden Cue Stick (Pulling back from cue ball)
        const stickDistance = BALL_RADIUS + 4 + power * 0.65;
        const stickLen = 170;
        const sx = cx + Math.cos(angle) * stickDistance;
        const sy = cy + Math.sin(angle) * stickDistance;
        const ex = cx + Math.cos(angle) * (stickDistance + stickLen);
        const ey = cy + Math.sin(angle) * (stickDistance + stickLen);

        ctx.save();
        // Stick shadow
        ctx.beginPath();
        ctx.moveTo(sx + 3, sy + 3);
        ctx.lineTo(ex + 3, ey + 3);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Cue Stick Body (Maple / Walnut wood)
        const cueGrad = ctx.createLinearGradient(sx, sy, ex, ey);
        cueGrad.addColorStop(0, '#fef08a'); // Chalk tip (cream)
        cueGrad.addColorStop(0.08, '#d97706'); // Shaft
        cueGrad.addColorStop(0.7, '#78350f'); // Butt wood
        cueGrad.addColorStop(1, '#1e293b'); // Handle wrap

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = cueGrad;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Chalked Blue Tip
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      Matter.Events.off(engine, 'collisionStart', () => {});
      World.clear(world, false);
      Engine.clear(engine);
    };
  }, [setupRack, createBallBody, checkBallsMoving, aiConfig]);

  // Shooting Action: Apply impulse force
  const executeShot = useCallback((angle: number, power: number) => {
    const cue = cueBallRef.current;
    if (!cue || power < 4) return;

    soundManager.playPop();
    const forceMagnitude = 0.0032 * power;
    const shotAngle = angle + Math.PI; // Impulse is in direction of shot

    Body.applyForce(cue, cue.position, {
      x: Math.cos(shotAngle) * forceMagnitude,
      y: Math.sin(shotAngle) * forceMagnitude,
    });

    wasMovingRef.current = true;
    setCurrentPowerPct(0);
  }, []);

  // Mouse & Touch Event Handlers for Aiming & Shooting
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    const me = e as React.MouseEvent;
    return {
      x: (me.clientX - rect.left) * scaleX,
      y: (me.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameOver || checkBallsMoving() || (aiConfig && turn === 'ai')) return;
    const cue = cueBallRef.current;
    if (!cue) return;

    const { x, y } = getCanvasCoords(e);
    const dist = Math.hypot(x - cue.position.x, y - cue.position.y);

    // Click near cue ball or anywhere on table to initiate aim
    aimingRef.current = true;
    startPosRef.current = { x: cue.position.x, y: cue.position.y };
    soundManager.playTick();
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!aimingRef.current) return;
    const { x, y } = getCanvasCoords(e);
    const dx = x - startPosRef.current.x;
    const dy = y - startPosRef.current.y;
    const power = Math.min(Math.hypot(dx, dy), 160);
    const angle = Math.atan2(dy, dx);

    aimVecRef.current = { dx, dy, power, angle };
    setCurrentPowerPct(Math.round((power / 160) * 100));
  };

  const handlePointerUp = () => {
    if (aimingRef.current && aimVecRef.current.power > 4) {
      executeShot(aimVecRef.current.angle, aimVecRef.current.power);
    }
    aimingRef.current = false;
    setCurrentPowerPct(0);
  };

  // AI Shot Automation
  useEffect(() => {
    if (!aiConfig || turn !== 'ai' || gameOver || checkBallsMoving()) return;

    const aiTimer = setTimeout(() => {
      const cue = cueBallRef.current;
      const objectBalls = ballsRef.current.filter((b) => (b as unknown as { data: BallInfo }).data.id !== 0);

      if (!cue || objectBalls.length === 0) return;

      // Find nearest target ball
      let bestTarget = objectBalls[0];
      let minDistance = Infinity;

      objectBalls.forEach((b) => {
        const dist = Math.hypot(b.position.x - cue.position.x, b.position.y - cue.position.y);
        if (dist < minDistance) {
          minDistance = dist;
          bestTarget = b;
        }
      });

      // Target nearest pocket from that ball
      let bestPocket = POCKETS[0];
      let minPocketDist = Infinity;
      POCKETS.forEach((p) => {
        const pd = Math.hypot(p.x - bestTarget.position.x, p.y - bestTarget.position.y);
        if (pd < minPocketDist) {
          minPocketDist = pd;
          bestPocket = p;
        }
      });

      // Calculate aim angle from target ball towards pocket with small difficulty variance
      const variance = (Math.random() - 0.5) * 0.08;
      const angle = Math.atan2(
        cue.position.y - bestTarget.position.y,
        cue.position.x - bestTarget.position.x
      ) + variance;

      const aiPower = 60 + Math.floor(Math.random() * 55);
      executeShot(angle, aiPower);
    }, 700);

    return () => clearTimeout(aiTimer);
  }, [turn, aiConfig, gameOver, checkBallsMoving, executeShot]);

  // Stat persistence on game over
  useEffect(() => {
    if (gameOver && !hasRecordedStatsRef.current) {
      hasRecordedStatsRef.current = true;
      const isWon = winner === 'player';
      const earnedPoints = isWon ? 300 + pocketedByPlayer.length * 20 : 60;

      if (isWon) {
        soundManager.playVictory();
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.6 },
        });
      } else {
        soundManager.playGameOver();
      }

      updateStats(
        {
          gamesPlayed: 1,
          wins: isWon ? 1 : 0,
          losses: isWon ? 0 : 1,
          totalScore: earnedPoints,
        },
        isWon,
        '8-Ball Pool'
      );
    }
  }, [gameOver, winner, pocketedByPlayer.length, updateStats]);

  const handleResetMatch = () => {
    setupRack();
    setMatchCount((p) => p + 1);
    soundManager.playTurnStart();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-6xl mx-auto space-y-4 font-sans select-none"
    >
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] p-3.5 sm:p-4 rounded-[26px] border border-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.4)]">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBackToHub}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-green-700 flex items-center justify-center border border-emerald-400/40 shadow-md">
              <span className="text-xl">🎱</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">Classic 8-Ball Pool</h2>
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  Game #{matchCount} • {aiConfig ? 'VS AI' : 'Solo Practice'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Matter.js rigid-body physics • Drag from cue ball to aim & shoot
              </p>
            </div>
          </div>
        </div>

        {/* Turn & Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold">
          <button
            onClick={handleResetMatch}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm hover:border-emerald-500/50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Re-Rack</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 shadow-sm">
            <span
              className={`w-3 h-3 rounded-full ${
                turn === 'player' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{turn === 'player' ? 'Your Shot' : 'AI Thinking...'}</span>
          </div>
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        {/* Left: Pool Table Canvas Stage */}
        <div className="rounded-[28px] border border-slate-700/90 bg-[#0f172a] p-3.5 sm:p-5 shadow-[0_20px_45px_rgba(15,23,42,0.45)] space-y-3">
          {/* Status Message Bar */}
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400 shrink-0" />
              {statusMessage}
            </span>
            {currentPowerPct > 0 && (
              <span className="text-amber-400 font-black flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5" /> Power: {currentPowerPct}%
              </span>
            )}
          </div>

          {/* Canvas Wrapper */}
          <div className="relative mx-auto w-full max-w-[800px] aspect-[800/450] rounded-2xl overflow-hidden border-8 border-[#3b2314] shadow-[0_16px_36px_rgba(0,0,0,0.7)] bg-[#1b6b37]">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className="w-full h-full cursor-crosshair block touch-none"
            />

            {/* Game Over Banner Overlay */}
            <AnimatePresence>
              {gameOver && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 space-y-4"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl ${
                      winner === 'player'
                        ? 'bg-gradient-to-tr from-emerald-400 to-emerald-600 border-emerald-300 text-slate-950'
                        : 'bg-gradient-to-tr from-rose-600 to-red-700 border-rose-400 text-white'
                    }`}
                  >
                    {winner === 'player' ? <Trophy className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-white">
                      {winner === 'player' ? '8-Ball Sunk! Victory!' : 'Match Completed'}
                    </h3>
                    <p className="text-sm text-slate-300 font-medium mt-1">
                      {winner === 'player'
                        ? `You cleared the 8-ball and secured the win! (+300 PTS)`
                        : `Opponent sank the 8-ball. (+60 PTS)`}
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleResetMatch}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Play Next Match
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Pocketed Balls Tray */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" /> Your Pocketed Balls
                </span>
                <span className="text-emerald-400">{playerScore} PTS</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap min-h-6">
                {pocketedByPlayer.length === 0 ? (
                  <span className="text-[10px] text-slate-500">None yet</span>
                ) : (
                  pocketedByPlayer.map((b, i) => (
                    <span
                      key={`p-ball-${i}`}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-slate-900 border border-white/60 shadow-xs"
                      style={{ backgroundColor: b.color }}
                      title={`Ball #${b.label}`}
                    >
                      {b.label}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-amber-400" /> Opponent Pocketed
                </span>
                <span className="text-amber-400">{aiScore} PTS</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap min-h-6">
                {pocketedByAi.length === 0 ? (
                  <span className="text-[10px] text-slate-500">None yet</span>
                ) : (
                  pocketedByAi.map((b, i) => (
                    <span
                      key={`ai-ball-${i}`}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-slate-900 border border-white/60 shadow-xs"
                      style={{ backgroundColor: b.color }}
                      title={`Ball #${b.label}`}
                    >
                      {b.label}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Rules & Controls */}
        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-700/90 bg-[#0f172a] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.4)] space-y-3">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" /> Shot Controls
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <span className="text-white font-bold block">How to Play</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  1. Click and drag backward from the white cue ball to aim.
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  2. Further drag increases shot power.
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  3. Release to strike the cue ball. Sinking balls awards points!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex justify-between font-bold text-[11px]">
                  <span className="text-slate-400">Aiming Guide:</span>
                  <span className="text-emerald-400">Trajectory Laser</span>
                </div>
                <div className="flex justify-between font-bold text-[11px]">
                  <span className="text-slate-400">Scratch Rule:</span>
                  <span className="text-rose-400">Auto Cue Respawn</span>
                </div>
                <div className="flex justify-between font-bold text-[11px]">
                  <span className="text-slate-400">Win Condition:</span>
                  <span className="text-amber-400">Sink Black 8-Ball</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleResetMatch}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              Reset & Re-Rack Table
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
