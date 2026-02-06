/**
 * Ultra-Premium Horde Battle Simulation
 * Premium arena, global pursuit, fury escalation, broadcast-quality rendering
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
    toast.info("Meteor Strike!", { duration: 1000 });
  }, [isRunning, phase]);

  // Premium arena rendering
  const renderArena = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Deep dark gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#060810');
    bgGrad.addColorStop(0.3, '#0c1018');
    bgGrad.addColorStop(0.7, '#0c1018');
    bgGrad.addColorStop(1, '#060810');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const margin = Math.min(width, height) * 0.04;
    const fieldX = margin;
    const fieldY = margin;
    const fieldW = width - margin * 2;
    const fieldH = height - margin * 2;

    // Field base with subtle grass-like gradient
    const fieldGrad = ctx.createLinearGradient(0, fieldY, 0, fieldY + fieldH);
    fieldGrad.addColorStop(0, '#152030');
    fieldGrad.addColorStop(0.5, '#1a2838');
    fieldGrad.addColorStop(1, '#152030');
    ctx.fillStyle = fieldGrad;
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);

    // Alternating turf stripes
    const stripeCount = 16;
    const stripeW = fieldW / stripeCount;
    for (let i = 0; i < stripeCount; i += 2) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
      ctx.fillRect(fieldX + i * stripeW, fieldY, stripeW, fieldH);
    }

    // Yard lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 10; i++) {
      const lx = fieldX + (fieldW * i) / 10;
      ctx.beginPath();
      ctx.moveTo(lx, fieldY);
      ctx.lineTo(lx, fieldY + fieldH);
      ctx.stroke();
    }

    // Hash marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    const hashLen = 4;
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

    // Center line (thicker)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2, fieldY);
    ctx.lineTo(width / 2, fieldY + fieldH);
    ctx.stroke();

    // Center circle
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(fieldW, fieldH) * 0.08, 0, Math.PI * 2);
    ctx.stroke();

    // Center emblem area
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(fieldW, fieldH) * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Team end zones
    const endZoneW = fieldW * 0.08;

    // Men end zone (left) - blue
    const menZoneGrad = ctx.createLinearGradient(fieldX, 0, fieldX + endZoneW * 2, 0);
    menZoneGrad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
    menZoneGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.06)');
    menZoneGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = menZoneGrad;
    ctx.fillRect(fieldX, fieldY, endZoneW * 2, fieldH);

    // Women end zone (right) - pink
    const womenZoneGrad = ctx.createLinearGradient(fieldX + fieldW, 0, fieldX + fieldW - endZoneW * 2, 0);
    womenZoneGrad.addColorStop(0, 'rgba(236, 72, 153, 0.15)');
    womenZoneGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.06)');
    womenZoneGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = womenZoneGrad;
    ctx.fillRect(fieldX + fieldW - endZoneW * 2, fieldY, endZoneW * 2, fieldH);

    // Field border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

    // Stadium vignette
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.25,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }, []);

  // Phase-based lighting + battle intensity overlay
  const renderLighting = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, currentPhase: BattlePhase) => {
    // Battle intensity: warmer as more units die
    const totalArmy = menArmySize + womenArmySize;
    const totalAlive = soaRef.current ? 
      (() => { let c = 0; for (let i = 0; i < soaRef.current.unitCount; i++) if (soaRef.current.stateFlags[i] & FLAG_ALIVE) c++; return c; })()
      : totalArmy;
    const casualtyRatio = totalArmy > 0 ? 1 - (totalAlive / totalArmy) : 0;
    
    if (casualtyRatio > 0.1) {
      const intensity = casualtyRatio * 0.08;
      ctx.fillStyle = `rgba(255, 60, 20, ${intensity})`;
      ctx.fillRect(0, 0, width, height);
    }

    if (currentPhase === 'melee' || currentPhase === 'sudden_death') {
      const base = currentPhase === 'sudden_death' ? 0.06 : 0.03;
      const pulse = Math.sin(Date.now() * 0.003) * 0.02;
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
      glow.addColorStop(0, 'rgba(255, 215, 0, 0.12)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
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

    // FIRST CLASH SHOCKWAVE: On first kill
    const newKills = result.stats.menKills + result.stats.womenKills;
    if (newKills > 0 && !firstClashRef.current) {
      firstClashRef.current = true;
      if (result.kills.length > 0) {
        spawnClashShockwave(poolRef.current, result.kills[0].x, result.kills[0].y);
      }
    }
    totalKillsRef.current += newKills;

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
    ctx.clearRect(0, 0, width, height);

    // Layer 1: Premium arena
    renderArena(ctx, width, height);

    // Layer 2: Units (via spriteRenderer)
    renderUnits(ctx, soaRef.current);

    // Layer 3: Particles
    renderParticles(ctx, poolRef.current);

    // Layer 4: Phase lighting + battle intensity
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
