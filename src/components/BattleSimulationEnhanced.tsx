/**
 * Ultra-Premium Horde Battle Simulation
 * DPR-aware canvas, professional arena, Disney-quality unit rendering
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { speak, stopSpeaking, type NarratorContext } from "@/utils/battleNarrator";

// High-performance modules
import { createBattleSoA, initializeUnits, type BattleSoA, TEAM_MEN, TEAM_WOMEN, FLAG_ALIVE, FLAG_LOCKED, FLAG_LEADER } from "@/lib/battleSoA";
import { createSpatialHashGrid, resizeGrid, type SpatialHashGrid } from "@/lib/spatialHash";
import { createParticlePool, updateParticles, renderParticles, spawnConfetti, spawnMeteorImpact, clearParticles, type ParticlePool } from "@/lib/particlePool";
import { updatePhysics, applyMeteorImpact, DEFAULT_CONFIG, resetChargeState, type BattlePhase } from "@/lib/battlePhysics";

type BattleSimulationProps = {
  menArmySize: number;
  womenArmySize: number;
  battleSpeed: number;
  menRageEnabled: boolean;
  womenRageEnabled: boolean;
  isRunning: boolean;
  onStatsUpdate: (stats: {
    menAlive: number;
    womenAlive: number;
    menKills: number;
    womenKills: number;
  }) => void;
  onPhaseChange: (phase: BattlePhase) => void;
  onTimeUpdate: (time: number) => void;
  onQuipChange: (quip: string) => void;
  onVictory: (winner: "men" | "women") => void;
  narratorEnabled: boolean;
};

// Premium color palette - professional broadcast quality
const COLORS = {
  // Arena
  bgDark: '#0a0d12',
  bgMid: '#0f1318',
  fieldBase: '#1a2633',
  fieldStripe: 'rgba(255, 255, 255, 0.015)',
  fieldLine: 'rgba(255, 255, 255, 0.1)',
  
  // Teams - muted professional
  menPrimary: '#3B82F6',
  menSecondary: '#1D4ED8',
  menGlow: '#60A5FA',
  womenPrimary: '#EC4899',
  womenSecondary: '#BE185D',
  womenGlow: '#F472B6',
  
  // States
  locked: '#F59E0B',
  leader: '#FFD700',
  
  // Effects
  shadow: 'rgba(0, 0, 0, 0.5)',
};

const BattleSimulation = ({
  menArmySize,
  womenArmySize,
  battleSpeed,
  menRageEnabled,
  womenRageEnabled,
  isRunning,
  onStatsUpdate,
  onPhaseChange,
  onTimeUpdate,
  onQuipChange,
  onVictory,
  narratorEnabled
}: BattleSimulationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [phase, setPhase] = useState<BattlePhase>("stand");
  const [timeRemaining, setTimeRemaining] = useState(180);

  // High-performance refs
  const soaRef = useRef<BattleSoA>(createBattleSoA());
  const gridRef = useRef<SpatialHashGrid | null>(null);
  const poolRef = useRef<ParticlePool>(createParticlePool());
  const lastTimeRef = useRef<number>(0);
  const phaseTimeRef = useRef<number>(0);
  const killStatsRef = useRef({ menKills: 0, womenKills: 0 });
  const initializedRef = useRef(false);
  const dprRef = useRef<number>(1);
  const logicalSizeRef = useRef({ width: 800, height: 600 });

  const speakNarration = useCallback((context: NarratorContext) => {
    const quip = speak(context, narratorEnabled);
    if (quip) onQuipChange(quip);
  }, [narratorEnabled, onQuipChange]);

  // DPR-aware canvas initialization
  const initCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return { width: 800, height: 600 };

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    const rect = container.getBoundingClientRect();
    const logicalWidth = rect.width;
    const logicalHeight = rect.height;

    // Set display size
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;

    // Set actual pixel size (scaled for DPR)
    canvas.width = Math.floor(logicalWidth * dpr);
    canvas.height = Math.floor(logicalHeight * dpr);

    logicalSizeRef.current = { width: logicalWidth, height: logicalHeight };

    return { width: logicalWidth, height: logicalHeight };
  }, []);

  const initializeBattle = useCallback(() => {
    const { width, height } = initCanvas();

    const maxArmySize = Math.max(menArmySize, womenArmySize);
    initializeUnits(soaRef.current, maxArmySize, width, height);

    if (!gridRef.current) {
      gridRef.current = createSpatialHashGrid(width, height, 50);
    } else {
      resizeGrid(gridRef.current, width, height);
    }

    clearParticles(poolRef.current);
    killStatsRef.current = { menKills: 0, womenKills: 0 };
    resetChargeState(); // Reset charge state for new battle

    onStatsUpdate({
      menAlive: menArmySize,
      womenAlive: womenArmySize,
      menKills: 0,
      womenKills: 0,
    });

    setPhase("stand");
    onPhaseChange("stand");
    setTimeRemaining(180);
    onTimeUpdate(180);
    phaseTimeRef.current = 0;

    speakNarration("standPhase");
    initializedRef.current = true;
  }, [menArmySize, womenArmySize, initCanvas, speakNarration, onStatsUpdate, onPhaseChange, onTimeUpdate]);

  // Handle resize with ResizeObserver
  useEffect(() => {
    const handleResize = () => {
      const { width, height } = initCanvas();
      if (gridRef.current) {
        resizeGrid(gridRef.current, width, height);
      }
    };

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [initCanvas]);

  const handleMeteorClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRunning || phase === "victory") return;

    const canvas = canvasRef.current;
    if (!canvas || !gridRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * logicalSizeRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * logicalSizeRef.current.height;

    applyMeteorImpact(soaRef.current, gridRef.current, x, y, 100, 500);
    spawnMeteorImpact(poolRef.current, x, y);
    toast.info("Meteor Strike!", { duration: 1000 });
  }, [isRunning, phase]);

  // Render premium arena
  const renderArena = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Dark gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, COLORS.bgDark);
    bgGrad.addColorStop(0.5, COLORS.bgMid);
    bgGrad.addColorStop(1, COLORS.bgDark);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle vignette
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, height * 0.3,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Field area
    const margin = Math.min(width, height) * 0.05;
    const fieldX = margin;
    const fieldY = margin;
    const fieldW = width - margin * 2;
    const fieldH = height - margin * 2;

    // Field base
    ctx.fillStyle = COLORS.fieldBase;
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);

    // Subtle stripes
    const stripeCount = 10;
    const stripeW = fieldW / stripeCount;
    for (let i = 0; i < stripeCount; i += 2) {
      ctx.fillStyle = COLORS.fieldStripe;
      ctx.fillRect(fieldX + i * stripeW, fieldY, stripeW, fieldH);
    }

    // Field border
    ctx.strokeStyle = COLORS.fieldLine;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

    // Center line
    ctx.beginPath();
    ctx.moveTo(width / 2, fieldY);
    ctx.lineTo(width / 2, fieldY + fieldH);
    ctx.strokeStyle = COLORS.fieldLine;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(fieldW, fieldH) * 0.1, 0, Math.PI * 2);
    ctx.stroke();

    // Team zones
    const zoneW = fieldW * 0.12;

    // Men zone (left)
    const menGrad = ctx.createLinearGradient(fieldX, 0, fieldX + zoneW, 0);
    menGrad.addColorStop(0, 'rgba(59, 130, 246, 0.12)');
    menGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = menGrad;
    ctx.fillRect(fieldX, fieldY, zoneW, fieldH);

    // Women zone (right)
    const womenGrad = ctx.createLinearGradient(fieldX + fieldW, 0, fieldX + fieldW - zoneW, 0);
    womenGrad.addColorStop(0, 'rgba(236, 72, 153, 0.12)');
    womenGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = womenGrad;
    ctx.fillRect(fieldX + fieldW - zoneW, fieldY, zoneW, fieldH);
  }, []);

  // Render units with professional quality
  const renderUnits = useCallback((ctx: CanvasRenderingContext2D, soa: BattleSoA) => {
    const unitRadius = 4;
    const leaderRadius = 6;
    const shadowOffsetY = 2;

    // Pass 1: Shadows (for depth)
    ctx.save();
    for (let i = 0; i < soa.unitCount; i++) {
      if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

      const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
      const radius = isLeader ? leaderRadius : unitRadius;

      ctx.fillStyle = COLORS.shadow;
      ctx.beginPath();
      ctx.ellipse(
        soa.posX[i],
        soa.posY[i] + shadowOffsetY,
        radius * 1.1,
        radius * 0.4,
        0, 0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();

    // Pass 2: Unit bodies
    for (let i = 0; i < soa.unitCount; i++) {
      if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

      const team = soa.teamID[i];
      const isLocked = (soa.stateFlags[i] & FLAG_LOCKED) !== 0;
      const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
      const healthRatio = soa.health[i] / 100;
      const radius = isLeader ? leaderRadius : unitRadius;

      const x = soa.posX[i];
      const y = soa.posY[i];

      // Color selection
      let primary: string;
      let secondary: string;
      let glow: string;

      if (isLocked) {
        primary = COLORS.locked;
        secondary = '#B45309';
        glow = '#FCD34D';
      } else if (team === TEAM_MEN) {
        primary = COLORS.menPrimary;
        secondary = COLORS.menSecondary;
        glow = COLORS.menGlow;
      } else {
        primary = COLORS.womenPrimary;
        secondary = COLORS.womenSecondary;
        glow = COLORS.womenGlow;
      }

      // Unit body with radial gradient for 3D effect
      const bodyGrad = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, 0,
        x, y, radius
      );
      bodyGrad.addColorStop(0, glow);
      bodyGrad.addColorStop(0.6, primary);
      bodyGrad.addColorStop(1, secondary);

      ctx.globalAlpha = 0.5 + healthRatio * 0.5;
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Subtle outline for readability
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Leader ring
      if (isLeader) {
        ctx.strokeStyle = COLORS.leader;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, radius + 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }, []);

  // Render phase-based lighting
  const renderLighting = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, currentPhase: BattlePhase) => {
    if (currentPhase === 'melee' || currentPhase === 'sudden_death') {
      const intensity = currentPhase === 'sudden_death' ? 0.08 : 0.04;
      const glow = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.6
      );
      glow.addColorStop(0, `rgba(255, 80, 30, ${intensity})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    } else if (currentPhase === 'victory') {
      const glow = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.5
      );
      glow.addColorStop(0, 'rgba(255, 215, 0, 0.1)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }
  }, []);

  const updateBattle = useCallback((deltaTime: number) => {
    const { width, height } = logicalSizeRef.current;
    if (!gridRef.current) return;

    phaseTimeRef.current += deltaTime;
    const newTime = Math.max(0, timeRemaining - deltaTime);
    setTimeRemaining(newTime);
    onTimeUpdate(Math.floor(newTime));

    // Phase transitions - PERMANENT MELEE until victory
    if (phase === "stand" && phaseTimeRef.current > 3) {
      setPhase("melee");
      onPhaseChange("melee");
      phaseTimeRef.current = 0;
      // No time limit for melee - fight until victory
      speakNarration("meleePhase");
    }
    // Optional: sudden death at low time (adds intensity, but melee continues)
    if (phase === "melee" && newTime <= 30 && timeRemaining > 30) {
      speakNarration("suddenDeath");
    }

    const rageActive = menRageEnabled || womenRageEnabled;
    const result = updatePhysics(
      soaRef.current,
      gridRef.current,
      poolRef.current,
      DEFAULT_CONFIG,
      phase,
      deltaTime,
      width,
      height,
      battleSpeed,
      rageActive
    );

    killStatsRef.current.menKills += result.stats.menKills;
    killStatsRef.current.womenKills += result.stats.womenKills;

    onStatsUpdate({
      menAlive: result.stats.menAlive,
      womenAlive: result.stats.womenAlive,
      menKills: killStatsRef.current.menKills,
      womenKills: killStatsRef.current.womenKills,
    });

    updateParticles(poolRef.current, deltaTime);

    // Victory check
    if (result.stats.menAlive === 0 || result.stats.womenAlive === 0) {
      setPhase("victory");
      onPhaseChange("victory");
      const winner = result.stats.menAlive > 0 ? "men" : "women";
      speakNarration(winner === "men" ? "victoryMen" : "victoryWomen");
      spawnConfetti(poolRef.current, width / 2, height / 2);
      onVictory(winner);
    }
  }, [battleSpeed, phase, timeRemaining, menRageEnabled, womenRageEnabled, speakNarration, onStatsUpdate, onPhaseChange, onTimeUpdate, onVictory]);

  const renderBattle = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = dprRef.current;
    const { width, height } = logicalSizeRef.current;

    // Scale context for DPR
    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Layer 1: Arena background
    renderArena(ctx, width, height);

    // Layer 2: Units with shadows and gradients
    renderUnits(ctx, soaRef.current);

    // Layer 3: Particles
    renderParticles(ctx, poolRef.current);

    // Layer 4: Phase lighting
    renderLighting(ctx, width, height, phase);

    ctx.restore();
  }, [phase, renderArena, renderUnits, renderLighting]);

  const animate = useCallback(
    (currentTime: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = currentTime;

      if (isRunning && phase !== "victory") {
        updateBattle(deltaTime);
      }
      renderBattle();

      animationRef.current = requestAnimationFrame(animate);
    },
    [isRunning, phase, updateBattle, renderBattle]
  );

  // Initialize on mount
  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Initialize battle when sizes change
  useEffect(() => {
    if (!isRunning && !initializedRef.current) {
      initializeBattle();
    }
  }, [menArmySize, womenArmySize, initializeBattle, isRunning]);

  // Re-initialize when starting
  useEffect(() => {
    if (isRunning && !initializedRef.current) {
      initializeBattle();
    }
  }, [isRunning, initializeBattle]);

  // Animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      stopSpeaking();
    };
  }, [animate]);

  // Reset flag when stopped
  useEffect(() => {
    if (!isRunning) {
      initializedRef.current = false;
    }
  }, [isRunning]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleMeteorClick}
        style={{ display: 'block' }}
        aria-label="Battle Arena - Click to launch meteor strike"
      />
    </div>
  );
};

export default BattleSimulation;
