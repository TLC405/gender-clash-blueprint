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
import { updatePhysics, applyMeteorImpact, DEFAULT_CONFIG, resetChargeState, setInitialCounts, type BattlePhase } from "@/lib/battlePhysicsV4";
import { renderUnits } from "@/lib/spriteRenderer";
import type { StickFigure3DLayer } from "@/lib/stickFigure3DRenderer";
import { playKills, playImpacts, playBell, playClash, playMeteor, playVictory } from "@/lib/battleAudio";

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
  onVictory: (winner: "men" | "women" | "draw") => void;
  narratorEnabled: boolean;
  meteorTrigger?: number;
  meteorCharges?: number;
  onMeteorUsed?: () => void;
  reducedMotion?: boolean;
};

const BattleSimulation = ({
  menArmySize, womenArmySize, battleSpeed,
  menRageEnabled, womenRageEnabled, isRunning,
  onStatsUpdate, onPhaseChange, onTimeUpdate, onQuipChange, onVictory,
  narratorEnabled, meteorTrigger = 0, meteorCharges = 0, onMeteorUsed, reducedMotion = false
}: BattleSimulationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const unitCanvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<BattlePhase>("stand");
  const timeRef = useRef(240);
  const aliveRef = useRef(0);
  const lastStatsRef = useRef<{ menAlive: number; womenAlive: number } | null>(null);
  const lastUiPushRef = useRef(0);
  const arenaCacheRef = useRef<HTMLCanvasElement | null>(null);
  const stick3DRef = useRef<StickFigure3DLayer | null>(null);
  const stick3DOpsRef = useRef<typeof import("@/lib/stickFigure3DRenderer") | null>(null);
  const camRef = useRef({ x: 0, y: 0, zoom: 1 });
  const clashPointRef = useRef({ x: 0, y: 0 });
  const stepFnRef = useRef<(dt: number) => void>(() => {});
  const renderFnRef = useRef<() => void>(() => {});
  const propsRef = useRef({ battleSpeed, menRageEnabled, womenRageEnabled, isRunning, onStatsUpdate, onPhaseChange, onTimeUpdate, onVictory });
  propsRef.current = { battleSpeed, menRageEnabled, womenRageEnabled, isRunning, onStatsUpdate, onPhaseChange, onTimeUpdate, onVictory };

  const soaRef = useRef<BattleSoA>(createBattleSoA());
  const gridRef = useRef<SpatialHashGrid | null>(null);
  const poolRef = useRef<ParticlePool>(createParticlePool());
  const lastTimeRef = useRef<number>(0);
  const phaseTimeRef = useRef<number>(0);
  const killStatsRef = useRef({ menKills: 0, womenKills: 0 });
  // A bounded, temporary 2D aftermath trail adds readable knockdowns without 3D ragdolls.
  const fallenRef = useRef<Array<{ x: number; y: number; dx: number; dy: number; angle: number; age: number; color: string }>>([]);
  const initializedRef = useRef(false);
  const dprRef = useRef<number>(1);
  const logicalSizeRef = useRef({ width: 800, height: 600 });
  const firstClashRef = useRef(false);
  const meteorHandledRef = useRef(0);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const lastMilestoneRef = useRef(0);

  const shakeRef = useRef({ intensity: 0, offsetX: 0, offsetY: 0 });
  const clashFlashRef = useRef(0);

  const speakNarration = useCallback((context: NarratorContext) => {
    const quip = speak(context, narratorEnabled);
    if (quip) onQuipChange(quip);
  }, [narratorEnabled, onQuipChange]);

  const initCanvas = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { width: 800, height: 600 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    for (const c of [canvasRef.current, fxCanvasRef.current]) {
      if (!c) continue;
      c.style.width = `${w}px`; c.style.height = `${h}px`;
      c.width = Math.floor(w * dpr); c.height = Math.floor(h * dpr);
    }
    if (stick3DRef.current && stick3DOpsRef.current) {
      stick3DOpsRef.current.resizeStickFigure3DLayer(stick3DRef.current, w, h);
    }
    logicalSizeRef.current = { width: w, height: h };
    return { width: w, height: h };
  }, []);

  const initializeBattle = useCallback(() => {
    const { width, height } = initCanvas();
    initializeUnits(soaRef.current, menArmySize, width, height, womenArmySize);

    if (!gridRef.current) {
      gridRef.current = createSpatialHashGrid(width, height, 50);
    } else {
      resizeGrid(gridRef.current, width, height);
    }

    clearParticles(poolRef.current);
    killStatsRef.current = { menKills: 0, womenKills: 0 };
    fallenRef.current = [];
    firstClashRef.current = false;
    lastMilestoneRef.current = 0;
    shakeRef.current = { intensity: 0, offsetX: 0, offsetY: 0 };
    clashFlashRef.current = 0;
    arenaCacheRef.current = null; // clear scuff marks
    camRef.current = { x: 0, y: 0, zoom: 1 };
    clashPointRef.current = { x: width / 2, y: height / 2 };
    resetChargeState(soaRef.current);
    setInitialCounts(menArmySize, womenArmySize, soaRef.current);
    aliveRef.current = menArmySize + womenArmySize;
    lastStatsRef.current = null;

    onStatsUpdate({ menAlive: menArmySize, womenAlive: womenArmySize, menKills: 0, womenKills: 0 });
    phaseRef.current = "stand";
    onPhaseChange("stand");
    timeRef.current = 240;
    onTimeUpdate(240);
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
    return () => observer.disconnect();
  }, [initCanvas]);

  // Settle winners from normalized survivor fractions, so asymmetric presets
  // are scored fairly (350 vs 800 starts as a 50/50 survival match).
  const finishBattle = useCallback((menAlive: number, womenAlive: number) => {
    if (phaseRef.current === "victory") return;
    phaseRef.current = "victory";
    const menRatio = menAlive / Math.max(1, menArmySize);
    const womenRatio = womenAlive / Math.max(1, womenArmySize);
    const winner: "men" | "women" | "draw" =
      Math.abs(menRatio - womenRatio) <= 0.000001 ? "draw" :
      menRatio > womenRatio ? "men" : "women";
    const p = propsRef.current;
    p.onPhaseChange("victory");
    if (winner !== "draw") speakNarration(winner === "men" ? "victoryMen" : "victoryWomen");
    spawnConfetti(poolRef.current, logicalSizeRef.current.width / 2, logicalSizeRef.current.height / 2, logicalSizeRef.current.width);
    playVictory();
    p.onTimeUpdate(Math.floor(timeRef.current));
    p.onStatsUpdate({
      menAlive, womenAlive,
      menKills: killStatsRef.current.menKills,
      womenKills: killStatsRef.current.womenKills,
    });
    p.onVictory(winner);
  }, [menArmySize, womenArmySize, speakNarration]);

  const strikeMeteor = useCallback((x: number, y: number) => {
    const grid = gridRef.current;
    if (!grid || phaseRef.current === "victory" || !propsRef.current.isRunning) return;
    const impact = applyMeteorImpact(soaRef.current, grid, x, y, 100, 500);
    spawnMeteorImpact(poolRef.current, x, y);
    playMeteor();
    playKills(Math.max(1, impact.totalLost));
    if (!reducedMotionRef.current) {
      shakeRef.current.intensity = Math.min(shakeRef.current.intensity + 8, 12);
      clashFlashRef.current = 0.14;
    }
    if (impact.totalLost > 0) {
      const menAlive = soaRef.current.menCount, womenAlive = soaRef.current.womenCount;
      aliveRef.current = menAlive + womenAlive;
      lastStatsRef.current = { menAlive, womenAlive };
      // Meteor losses are environmental losses, not awarded team knockouts.
      propsRef.current.onStatsUpdate({
        menAlive, womenAlive,
        menKills: killStatsRef.current.menKills,
        womenKills: killStatsRef.current.womenKills,
      });
      if (menAlive === 0 || womenAlive === 0) finishBattle(menAlive, womenAlive);
    }
    return impact;
  }, [finishBattle]);

  const handleMeteorClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRunning || phaseRef.current === "victory" || !gridRef.current) return;
    if (meteorCharges <= 0) { toast.info("No meteor drops left this round."); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const { width, height } = logicalSizeRef.current;
    const cam = camRef.current;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const x = (sx - width / 2 - cam.x * cam.zoom) / cam.zoom + width / 2;
    const y = (sy - height / 2 - cam.y * cam.zoom) / cam.zoom + height / 2;
    strikeMeteor(x, y);
    onMeteorUsed?.();
    toast.info("Meteor Strike!", { duration: 1000 });
  }, [isRunning, meteorCharges, onMeteorUsed, strikeMeteor]);

  useEffect(() => {
    if (!meteorTrigger || meteorTrigger === meteorHandledRef.current) return;
    meteorHandledRef.current = meteorTrigger;
    if (!isRunning || !gridRef.current || phaseRef.current === "victory") return;
    const { width, height } = logicalSizeRef.current;
    const x = Math.max(30, Math.min(width - 30, clashPointRef.current.x || width / 2));
    const y = Math.max(30, Math.min(height - 30, clashPointRef.current.y || height / 2));
    strikeMeteor(x, y);
  }, [meteorTrigger, isRunning, strikeMeteor]);

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

    // Team identification now lives exclusively in the external score header.

    // Women end zone (right) - pink with label
    const womenZoneGrad = ctx.createLinearGradient(fieldX + fieldW, 0, fieldX + fieldW - endZoneW * 2.5, 0);
    womenZoneGrad.addColorStop(0, 'rgba(236, 72, 153, 0.22)');
    womenZoneGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.08)');
    womenZoneGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = womenZoneGrad;
    ctx.fillRect(fieldX + fieldW - endZoneW * 2.5, fieldY, endZoneW * 2.5, fieldH);

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
    const totalAlive = aliveRef.current;
    const casualtyRatio = totalArmy > 0 ? 1 - (totalAlive / totalArmy) : 0;

    if (casualtyRatio > 0.05) {
      ctx.fillStyle = `rgba(255, 50, 15, ${casualtyRatio * 0.12})`;
      ctx.fillRect(0, 0, width, height);
    }
    if (currentPhase === 'victory') {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
      ctx.fillRect(0, 0, width, height);
    }
    if (clashFlashRef.current > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${clashFlashRef.current})`;
      ctx.fillRect(0, 0, width, height);
    }
  }, [menArmySize, womenArmySize]);

  // Persistent scuff marks where fights happened (drawn into cached arena)
  const addScuff = useCallback((x: number, y: number) => {
    const c = arenaCacheRef.current;
    if (!c) return;
    const g = c.getContext('2d')!;
    g.save();
    g.scale(dprRef.current, dprRef.current);
    g.fillStyle = 'rgba(60, 40, 20, 0.10)';
    g.beginPath();
    g.ellipse(x, y, 4 + Math.random() * 5, 2 + Math.random() * 3, Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }, []);

  const ensureArenaCache = useCallback(() => {
    const { width, height } = logicalSizeRef.current;
    const dpr = dprRef.current;
    let c = arenaCacheRef.current;
    if (c && c.width === Math.floor(width * dpr) && c.height === Math.floor(height * dpr)) return c;
    c = document.createElement('canvas');
    c.width = Math.floor(width * dpr);
    c.height = Math.floor(height * dpr);
    const g = c.getContext('2d')!;
    g.scale(dpr, dpr);
    renderArena(g, width, height);
    arenaCacheRef.current = c;
    return c;
  }, [renderArena]);

  const FIXED_DT = 1 / 60;
  const STAND_SECONDS = 3.25;

  // One physics step — reads/writes refs only (no React re-render per frame)
  const stepBattle = useCallback((dt: number) => {
    const { width, height } = logicalSizeRef.current;
    if (!gridRef.current) return;
    const p = propsRef.current;
    const phase = phaseRef.current;

    phaseTimeRef.current += dt;
    const prevTime = timeRef.current;
    timeRef.current = Math.max(0, prevTime - dt);

    if (phase === "stand" && phaseTimeRef.current > STAND_SECONDS) {
      phaseRef.current = "melee";
      p.onPhaseChange("melee");
      phaseTimeRef.current = 0;
      playBell();
      playClash();
      speakNarration("meleePhase");
    }
    if (timeRef.current <= 30 && prevTime > 30) {
      phaseRef.current = "sudden_death";
      p.onPhaseChange("sudden_death");
      speakNarration("suddenDeath");
    }

    const result = updatePhysics(
      soaRef.current, gridRef.current, poolRef.current,
      DEFAULT_CONFIG, phaseRef.current, dt,
      width, height, p.battleSpeed, { men: p.menRageEnabled, women: p.womenRageEnabled }
    );

    killStatsRef.current.menKills += result.stats.menKills;
    killStatsRef.current.womenKills += result.stats.womenKills;
    aliveRef.current = result.stats.menAlive + result.stats.womenAlive;
    lastStatsRef.current = result.stats;

    const fallen = fallenRef.current;
    let livingMarkers = 0;
    for (let j = 0; j < fallen.length; j++) {
      const body = fallen[j];
      body.age += dt;
      if (body.age >= 2.25) continue;
      const friction = Math.exp(-2.8 * dt);
      body.x += body.dx * dt;
      body.y += body.dy * dt;
      body.dx *= friction;
      body.dy *= friction;
      fallen[livingMarkers++] = body;
    }
    fallen.length = livingMarkers;

    const newKills = result.stats.menKills + result.stats.womenKills;
    if (newKills > 0) {
      if (!reducedMotionRef.current) shakeRef.current.intensity = Math.min(shakeRef.current.intensity + newKills * 1.2, 5);
      playKills(newKills);
      for (const k of result.kills) {
        const forward = k.killerTeam === TEAM_MEN ? 1 : -1;
        const drift = (fallen.length % 7 - 3) * 8;
        fallen.push({ x: k.x, y: k.y, dx: forward * 46, dy: drift, angle: drift * 0.017, age: 0, color: k.killerTeam === TEAM_MEN ? "#ff8ebd" : "#7ac5ff" });
        addScuff(k.x, k.y);
        clashPointRef.current.x += (k.x - clashPointRef.current.x) * 0.05;
        clashPointRef.current.y += (k.y - clashPointRef.current.y) * 0.05;
      }
    }
    if (fallen.length > 360) fallen.splice(0, fallen.length - 360);
    if (newKills > 0 && !firstClashRef.current) {
      firstClashRef.current = true;
      if (result.kills.length > 0) spawnClashShockwave(poolRef.current, result.kills[0].x, result.kills[0].y);
      clashFlashRef.current = reducedMotionRef.current ? 0 : 0.25;
      shakeRef.current.intensity = reducedMotionRef.current ? 0 : 7;
    }
    const totalKills = killStatsRef.current.menKills + killStatsRef.current.womenKills;
    const milestone = Math.floor(totalKills / 75);
    if (milestone > lastMilestoneRef.current && firstClashRef.current) {
      lastMilestoneRef.current = milestone;
      spawnClashShockwave(poolRef.current, clashPointRef.current.x, clashPointRef.current.y);
      if (!reducedMotionRef.current) clashFlashRef.current = 0.09;
    }
    if (clashFlashRef.current > 0) clashFlashRef.current = Math.max(0, clashFlashRef.current - dt * 1.5);

    updateParticles(poolRef.current, dt);

    if (result.stats.menAlive === 0 || result.stats.womenAlive === 0 ||
        timeRef.current <= 0) {
      finishBattle(result.stats.menAlive, result.stats.womenAlive);
    }
  }, [speakNarration, addScuff, finishBattle]);

  // Throttled UI sync (~4x per second)
  const pushUi = useCallback((force = false) => {
    const now = performance.now();
    if (!force && now - lastUiPushRef.current < 250) return;
    lastUiPushRef.current = now;
    const s = lastStatsRef.current;
    const p = propsRef.current;
    p.onTimeUpdate(Math.floor(timeRef.current));
    if (s) p.onStatsUpdate({
      menAlive: s.menAlive, womenAlive: s.womenAlive,
      menKills: killStatsRef.current.menKills, womenKills: killStatsRef.current.womenKills,
    });
  }, []);

  const renderBattle = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const fx = fxCanvasRef.current?.getContext("2d");
    if (!canvas || !ctx || !fx) return;
    const dpr = dprRef.current;
    const { width, height } = logicalSizeRef.current;
    const phase = phaseRef.current;

    // Shake
    const sh = shakeRef.current;
    if (!reducedMotionRef.current && sh.intensity > 0.1) {
      sh.offsetX = (Math.random() - 0.5) * sh.intensity * 2;
      sh.offsetY = (Math.random() - 0.5) * sh.intensity * 2;
      sh.intensity *= 0.88;
    } else { sh.intensity = 0; sh.offsetX = 0; sh.offsetY = 0; }

    // Camera: gentle follow of clash point during melee
    const cam = camRef.current;
    const fighting = phase === 'melee' || phase === 'sudden_death';
    const targetZoom = reducedMotionRef.current ? 1 : phase === 'stand' ? 1 + Math.min(phaseTimeRef.current / STAND_SECONDS, 1) * 0.03 : fighting && firstClashRef.current ? 1.08 : 1;
    const targetX = !reducedMotionRef.current && fighting && firstClashRef.current ? (width / 2 - clashPointRef.current.x) * 0.25 : 0;
    const targetY = !reducedMotionRef.current && fighting && firstClashRef.current ? (height / 2 - clashPointRef.current.y) * 0.25 : 0;
    cam.zoom += (targetZoom - cam.zoom) * 0.04;
    cam.x += (targetX - cam.x) * 0.04;
    cam.y += (targetY - cam.y) * 0.04;
    const camX = cam.x * cam.zoom + sh.offsetX;
    const camY = cam.y * cam.zoom + sh.offsetY;

    const applyCam = (g: CanvasRenderingContext2D) => {
      g.translate(width / 2 + camX, height / 2 + camY);
      g.scale(cam.zoom, cam.zoom);
      g.translate(-width / 2, -height / 2);
    };

    // Layer 1: arena (cached bitmap)
    const arena = ensureArenaCache();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b1f12';
    ctx.fillRect(0, 0, width, height);
    ctx.save(); applyCam(ctx); ctx.drawImage(arena, 0, 0, width, height); ctx.restore();

    // Layer 2: genuine 3D instanced human rigs; 2D human stick fallback.
    if (stick3DRef.current && stick3DOpsRef.current) {
      stick3DOpsRef.current.renderStickFigure3DLayer(
        stick3DRef.current, soaRef.current,
        { x: camX, y: camY, zoom: cam.zoom, w: width, h: height },
        reducedMotionRef.current, performance.now() / 1000
      );
    } else {
      ctx.save(); applyCam(ctx); renderUnits(ctx, soaRef.current, false, 0, false, phase); ctx.restore();
    }

    // Layer 3: particles + lighting
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.clearRect(0, 0, width, height);
    fx.save(); applyCam(fx);
    // Impact aftermath: brief horizontal trails, not a fake 3D ragdoll claim.
    for (const body of fallenRef.current) {
      fx.globalAlpha = 0.47 * (1 - body.age / 2.25);
      fx.fillStyle = body.color;
      fx.save();
      fx.translate(body.x, body.y);
      fx.rotate(body.angle);
      fx.beginPath();
      fx.ellipse(0, 0, 7.3, 3.5, 0, 0, Math.PI * 2);
      fx.fill();
      fx.restore();
    }
    fx.globalAlpha = 1;
    renderParticles(fx, poolRef.current); fx.restore();
    renderLighting(fx, width, height, phase);
  }, [ensureArenaCache, renderLighting]);

  // Single long-lived loop with fixed-step physics
  useEffect(() => {
    let acc = 0;
    let raf = 0;
    const loop = (t: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = t;
      const frame = Math.min((t - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = t;
      if (propsRef.current.isRunning && phaseRef.current !== "victory") {
        acc += frame;
        let steps = 0;
        while (acc >= FIXED_DT && steps < 5 && (phaseRef.current as BattlePhase) !== 'victory') { stepFnRef.current(FIXED_DT); acc -= FIXED_DT; steps++; }
        if (steps === 5) acc = Math.min(acc, FIXED_DT); // Backlog clamp instead of dropping all remaining simulation time.
        pushUi();
      } else {
        acc = 0;
        updateParticles(poolRef.current, frame);
      }
      renderFnRef.current();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); stopSpeaking(); };
  }, [pushUi]);

  stepFnRef.current = stepBattle;
  renderFnRef.current = renderBattle;

  // Lazily load real 3D fighter meshes. Keep the battlefield playable on
  // older devices by drawing human stick figures on Canvas 2D if WebGL fails.
  useEffect(() => {
    const canvas = unitCanvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let ownedLayer: StickFigure3DLayer | null = null;
    import("@/lib/stickFigure3DRenderer")
      .then(ops => {
        if (cancelled) return;
        try {
          const { width, height } = logicalSizeRef.current;
          ownedLayer = ops.createStickFigure3DLayer(canvas, width, height, menArmySize + womenArmySize);
          if (cancelled) {
            ops.destroyStickFigure3DLayer(ownedLayer);
            return;
          }
          stick3DOpsRef.current = ops;
          stick3DRef.current = ownedLayer;
        } catch (error) {
          console.warn("3D fighters unavailable; using 2D human stick figures", error);
        }
      })
      .catch(error => console.warn("3D fighter renderer could not load; using 2D fallback", error));
    return () => {
      cancelled = true;
      if (ownedLayer && stick3DOpsRef.current) {
        stick3DOpsRef.current.destroyStickFigure3DLayer(ownedLayer);
      }
      stick3DRef.current = null;
      stick3DOpsRef.current = null;
    };
  }, [menArmySize, womenArmySize]);

  useEffect(() => { initCanvas(); }, [initCanvas]);

  useEffect(() => {
    if (!isRunning && !initializedRef.current) initializeBattle();
  }, [menArmySize, womenArmySize, initializeBattle, isRunning]);

  useEffect(() => {
    if (isRunning && !initializedRef.current) initializeBattle();
  }, [isRunning, initializeBattle]);


  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      <canvas ref={unitCanvasRef} className="absolute inset-0 block pointer-events-none" />
      <canvas
        ref={fxCanvasRef}
        className="absolute inset-0 block cursor-crosshair"
        onClick={handleMeteorClick}
        aria-label="Battle Arena - Click to launch meteor strike"
      />
    </div>
  );
};

export default BattleSimulation;
