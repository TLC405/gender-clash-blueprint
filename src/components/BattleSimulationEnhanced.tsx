/**
 * Ultra-Premium Horde Battle Simulation v3
 * Broadcast-quality arena, screen shake, clash flash, stand-phase zoom, cinematic effects
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { speak, stopSpeaking, type NarratorContext } from "@/utils/battleNarrator";

import { createBattleSoA, initializeUnits, type BattleSoA, TEAM_MEN, TEAM_WOMEN, FLAG_ALIVE } from "@/lib/battleSoA";
import { createSpatialHashGrid, resizeGrid, type SpatialHashGrid } from "@/lib/spatialHash";
import { createParticlePool, updateParticles, renderParticles, spawnConfetti, spawnMeteorImpact, spawnClashShockwave, clearParticles, type ParticlePool } from "@/lib/particlePool";
import { updatePhysics, applyMeteorImpact, DEFAULT_CONFIG, resetChargeState, setInitialCounts, type BattlePhase } from "@/lib/battlePhysics";
import { renderUnits } from "@/lib/spriteRenderer";

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

const BattleSimulation = ({
  menArmySize, womenArmySize, battleSpeed,
  menRageEnabled, womenRageEnabled, isRunning,
  onStatsUpdate, onPhaseChange, onTimeUpdate, onQuipChange, onVictory,
  narratorEnabled
}: BattleSimulationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [phase, setPhase] = useState<BattlePhase>("stand");
  const [timeRemaining, setTimeRemaining] = useState(180);

  const soaRef = useRef<BattleSoA>(createBattleSoA());
  const gridRef = useRef<SpatialHashGrid | null>(null);
  const poolRef = useRef<ParticlePool>(createParticlePool());
  const lastTimeRef = useRef<number>(0);
  const phaseTimeRef = useRef<number>(0);
  const killStatsRef = useRef({ menKills: 0, womenKills: 0 });
  const initializedRef = useRef(false);
  const dprRef = useRef<number>(1);
  const logicalSizeRef = useRef({ width: 800, height: 600 });
  const firstClashRef = useRef(false);
  const totalKillsRef = useRef(0);
  const frameCountRef = useRef(0);

  // Screen shake state
  const shakeRef = useRef({ intensity: 0, offsetX: 0, offsetY: 0 });
  // First clash flash
  const clashFlashRef = useRef(0); // remaining flash alpha

  const speakNarration = useCallback((context: NarratorContext) => {
    const quip = speak(context, narratorEnabled);
    if (quip) onQuipChange(quip);
  }, [narratorEnabled, onQuipChange]);

  const initCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return { width: 800, height: 600 };

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const rect = container.getBoundingClientRect();
    const logicalWidth = rect.width;
    const logicalHeight = rect.height;

    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;
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
    totalKillsRef.current = 0;
    firstClashRef.current = false;
    shakeRef.current = { intensity: 0, offsetX: 0, offsetY: 0 };
    clashFlashRef.current = 0;
    resetChargeState();
    setInitialCounts(menArmySize, womenArmySize);

    onStatsUpdate({ menAlive: menArmySize, womenAlive: womenArmySize, menKills: 0, womenKills: 0 });
    setPhase("stand");
    onPhaseChange("stand");
    setTimeRemaining(180);
    onTimeUpdate(180);
    phaseTimeRef.current = 0;
    speakNarration("standPhase");
    initializedRef.current = true;
  }, [menArmySize, womenArmySize, initCanvas, speakNarration, onStatsUpdate, onPhaseChange, onTimeUpdate]);

  useEffect(() => {
    const handleResize = () => {
      const { width, height } = initCanvas();
      if (gridRef.current) resizeGrid(gridRef.current, width, height);
    };
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => { observer.disconnect(); window.removeEventListener('resize', handleResize); };
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
    shakeRef.current.intensity = Math.min(shakeRef.current.intensity + 8, 12);
    toast.info("Meteor Strike!", { duration: 1000 });
  }, [isRunning, phase]);

  // ═══════════════════════════════════════════════
  // PREMIUM ARENA RENDERER - Broadcast Stadium
  // ═══════════════════════════════════════════════
  const renderArena = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Rich dark background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a1510');
    bgGrad.addColorStop(0.3, '#0e1e16');
    bgGrad.addColorStop(0.7, '#0e1e16');
    bgGrad.addColorStop(1, '#0a1510');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const margin = Math.min(width, height) * 0.04;
    const fieldX = margin;
    const fieldY = margin;
    const fieldW = width - margin * 2;
    const fieldH = height - margin * 2;

    // Turf - dark green gradient
    const fieldGrad = ctx.createLinearGradient(0, fieldY, 0, fieldY + fieldH);
    fieldGrad.addColorStop(0, '#1a3328');
    fieldGrad.addColorStop(0.5, '#1e3d30');
    fieldGrad.addColorStop(1, '#1a3328');
    ctx.fillStyle = fieldGrad;
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);

    // Alternating turf stripes (brighter, visible)
    const stripeCount = 16;
    const stripeW = fieldW / stripeCount;
    for (let i = 0; i < stripeCount; i += 2) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.fillRect(fieldX + i * stripeW, fieldY, stripeW, fieldH);
    }

    // Yard lines (visible!)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 10; i++) {
      const lx = fieldX + (fieldW * i) / 10;
      ctx.beginPath();
      ctx.moveTo(lx, fieldY);
      ctx.lineTo(lx, fieldY + fieldH);
      ctx.stroke();
    }

    // Hash marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    const hashLen = 5;
    for (let i = 1; i < 10; i++) {
      const lx = fieldX + (fieldW * i) / 10;
      for (let j = 1; j < 8; j++) {
        const hy = fieldY + (fieldH * j) / 8;
        ctx.beginPath();
        ctx.moveTo(lx - hashLen, hy);
        ctx.lineTo(lx + hashLen, hy);
        ctx.stroke();
      }
    }

    // Center line (bold)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, fieldY);
    ctx.lineTo(width / 2, fieldY + fieldH);
    ctx.stroke();

    // Center circle
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(fieldW, fieldH) * 0.09, 0, Math.PI * 2);
    ctx.stroke();

    // Center emblem
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(fieldW, fieldH) * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // Team end zones
    const endZoneW = fieldW * 0.08;

    // Men end zone (left) - blue with label
    const menZoneGrad = ctx.createLinearGradient(fieldX, 0, fieldX + endZoneW * 2.5, 0);
    menZoneGrad.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
    menZoneGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.08)');
    menZoneGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = menZoneGrad;
    ctx.fillRect(fieldX, fieldY, endZoneW * 2.5, fieldH);

    // "MEN" label
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#3B82F6';
    ctx.font = `bold ${Math.min(fieldH * 0.12, 36)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(fieldX + endZoneW * 0.8, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('MEN', 0, 0);
    ctx.restore();

    // Women end zone (right) - pink with label
    const womenZoneGrad = ctx.createLinearGradient(fieldX + fieldW, 0, fieldX + fieldW - endZoneW * 2.5, 0);
    womenZoneGrad.addColorStop(0, 'rgba(236, 72, 153, 0.22)');
    womenZoneGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.08)');
    womenZoneGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = womenZoneGrad;
    ctx.fillRect(fieldX + fieldW - endZoneW * 2.5, fieldY, endZoneW * 2.5, fieldH);

    // "WOMEN" label
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#EC4899';
    ctx.font = `bold ${Math.min(fieldH * 0.12, 36)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(fieldX + fieldW - endZoneW * 0.8, height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('WOMEN', 0, 0);
    ctx.restore();

    // Crowd silhouette strips (top and bottom)
    const crowdH = margin * 0.8;
    const crowdGradTop = ctx.createLinearGradient(0, 0, 0, crowdH);
    crowdGradTop.addColorStop(0, 'rgba(20, 15, 25, 0.9)');
    crowdGradTop.addColorStop(1, 'rgba(20, 15, 25, 0.3)');
    ctx.fillStyle = crowdGradTop;
    ctx.fillRect(0, 0, width, crowdH);

    // Crowd dots (static silhouettes)
    ctx.fillStyle = 'rgba(80, 70, 90, 0.3)';
    const dotSpacing = 8;
    for (let cx = dotSpacing; cx < width; cx += dotSpacing) {
      const yOff = Math.sin(cx * 0.15) * 2;
      ctx.beginPath();
      ctx.arc(cx, crowdH * 0.5 + yOff, 2, 0, Math.PI * 2);
      ctx.fill();
      // Bottom crowd
      ctx.beginPath();
      ctx.arc(cx, height - crowdH * 0.5 - yOff, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const crowdGradBottom = ctx.createLinearGradient(0, height, 0, height - crowdH);
    crowdGradBottom.addColorStop(0, 'rgba(20, 15, 25, 0.9)');
    crowdGradBottom.addColorStop(1, 'rgba(20, 15, 25, 0.3)');
    ctx.fillStyle = crowdGradBottom;
    ctx.fillRect(0, height - crowdH, width, crowdH);

    // Spotlight cones from corners
    const spotR = Math.max(width, height) * 0.6;
    ctx.globalAlpha = 1;
    const spots = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
    ];
    for (const s of spots) {
      const spotGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, spotR);
      spotGrad.addColorStop(0, 'rgba(255, 255, 240, 0.06)');
      spotGrad.addColorStop(0.5, 'rgba(255, 255, 240, 0.02)');
      spotGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Field border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

    // Lighter vignette (reduced intensity)
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.3,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }, []);

  // Phase-based lighting + battle intensity
  const renderLighting = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, currentPhase: BattlePhase) => {
    const totalArmy = menArmySize + womenArmySize;
    const totalAlive = soaRef.current ?
      (() => { let c = 0; for (let i = 0; i < soaRef.current.unitCount; i++) if (soaRef.current.stateFlags[i] & FLAG_ALIVE) c++; return c; })()
      : totalArmy;
    const casualtyRatio = totalArmy > 0 ? 1 - (totalAlive / totalArmy) : 0;

    // Battle intensity overlay (stronger warmth)
    if (casualtyRatio > 0.05) {
      const intensity = casualtyRatio * 0.15;
      ctx.fillStyle = `rgba(255, 50, 15, ${intensity})`;
      ctx.fillRect(0, 0, width, height);
    }

    if (currentPhase === 'melee' || currentPhase === 'sudden_death') {
      const base = currentPhase === 'sudden_death' ? 0.08 : 0.04;
      const pulse = Math.sin(Date.now() * 0.003) * 0.03;
      const glow = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.6
      );
      glow.addColorStop(0, `rgba(255, 80, 30, ${base + pulse})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    } else if (currentPhase === 'victory') {
      const glow = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.5
      );
      glow.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }

    // First clash flash overlay
    if (clashFlashRef.current > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${clashFlashRef.current})`;
      ctx.fillRect(0, 0, width, height);
    }
  }, [menArmySize, womenArmySize]);

  const updateBattle = useCallback((deltaTime: number) => {
    const { width, height } = logicalSizeRef.current;
    if (!gridRef.current) return;

    phaseTimeRef.current += deltaTime;
    const newTime = Math.max(0, timeRemaining - deltaTime);
    setTimeRemaining(newTime);
    onTimeUpdate(Math.floor(newTime));

    // Phase transitions
    if (phase === "stand" && phaseTimeRef.current > 3) {
      setPhase("melee");
      onPhaseChange("melee");
      phaseTimeRef.current = 0;
      speakNarration("meleePhase");
    }
    if (phase === "melee" && newTime <= 30 && timeRemaining > 30) {
      speakNarration("suddenDeath");
    }

    const rageActive = menRageEnabled || womenRageEnabled;
    const result = updatePhysics(
      soaRef.current, gridRef.current, poolRef.current,
      DEFAULT_CONFIG, phase, deltaTime,
      width, height, battleSpeed, rageActive
    );

    killStatsRef.current.menKills += result.stats.menKills;
    killStatsRef.current.womenKills += result.stats.womenKills;

    // Screen shake on kills
    const newKills = result.stats.menKills + result.stats.womenKills;
    if (newKills > 0) {
      shakeRef.current.intensity = Math.min(shakeRef.current.intensity + newKills * 1.5, 6);
    }

    // First clash shockwave + flash
    if (newKills > 0 && !firstClashRef.current) {
      firstClashRef.current = true;
      if (result.kills.length > 0) {
        spawnClashShockwave(poolRef.current, result.kills[0].x, result.kills[0].y);
      }
      clashFlashRef.current = 0.3;
      shakeRef.current.intensity = 8;
    }
    totalKillsRef.current += newKills;

    // Decay screen shake
    if (shakeRef.current.intensity > 0) {
      shakeRef.current.offsetX = (Math.random() - 0.5) * shakeRef.current.intensity * 2;
      shakeRef.current.offsetY = (Math.random() - 0.5) * shakeRef.current.intensity * 2;
      shakeRef.current.intensity *= 0.88; // fast decay
      if (shakeRef.current.intensity < 0.1) {
        shakeRef.current.intensity = 0;
        shakeRef.current.offsetX = 0;
        shakeRef.current.offsetY = 0;
      }
    }

    // Decay clash flash
    if (clashFlashRef.current > 0) {
      clashFlashRef.current -= deltaTime * 1.5;
      if (clashFlashRef.current < 0) clashFlashRef.current = 0;
    }

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
      spawnConfetti(poolRef.current, width / 2, height / 2, width);
      onVictory(winner);
    }
  }, [battleSpeed, phase, timeRemaining, menRageEnabled, womenRageEnabled, speakNarration, onStatsUpdate, onPhaseChange, onTimeUpdate, onVictory]);

  const renderBattle = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = dprRef.current;
    const { width, height } = logicalSizeRef.current;
    frameCountRef.current++;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Screen shake offset
    const shakeX = shakeRef.current.offsetX;
    const shakeY = shakeRef.current.offsetY;

    // Stand-phase zoom (slow zoom 1.0 -> 1.02)
    let zoomScale = 1.0;
    if (phase === 'stand') {
      const t = Math.min(phaseTimeRef.current / 3, 1);
      zoomScale = 1.0 + t * 0.02;
    }

    ctx.clearRect(-10, -10, width + 20, height + 20);

    // Apply shake + zoom
    ctx.save();
    ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
    ctx.scale(zoomScale, zoomScale);
    ctx.translate(-width / 2, -height / 2);

    // Layer 1: Arena
    renderArena(ctx, width, height);

    // Layer 2: Units
    renderUnits(ctx, soaRef.current, false, frameCountRef.current, false, phase);

    // Layer 3: Particles
    renderParticles(ctx, poolRef.current);

    ctx.restore(); // end shake+zoom transform

    // Layer 4: Lighting (not affected by shake for stability)
    renderLighting(ctx, width, height, phase);

    ctx.restore();
  }, [phase, renderArena, renderLighting]);

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

  useEffect(() => { initCanvas(); }, [initCanvas]);

  useEffect(() => {
    if (!isRunning && !initializedRef.current) initializeBattle();
  }, [menArmySize, womenArmySize, initializeBattle, isRunning]);

  useEffect(() => {
    if (isRunning && !initializedRef.current) initializeBattle();
  }, [isRunning, initializeBattle]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); stopSpeaking(); };
  }, [animate]);

  useEffect(() => {
    if (!isRunning) initializedRef.current = false;
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
