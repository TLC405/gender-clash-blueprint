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
import { createPixiUnitLayer, renderPixiUnits, resizePixiLayer, destroyPixiLayer, type PixiUnitLayer } from "@/lib/pixiUnitRenderer";
import { playKills, playBell } from "@/lib/battleAudio";

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
  const unitCanvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<BattlePhase>("stand");
  const timeRef = useRef(180);
  const aliveRef = useRef(0);
  const lastStatsRef = useRef<{ menAlive: number; womenAlive: number } | null>(null);
  const lastUiPushRef = useRef(0);
  const arenaCacheRef = useRef<HTMLCanvasElement | null>(null);
  const pixiRef = useRef<PixiUnitLayer | null>(null);
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
  const initializedRef = useRef(false);
  const dprRef = useRef<number>(1);
  const logicalSizeRef = useRef({ width: 800, height: 600 });
  const firstClashRef = useRef(false);

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
    if (pixiRef.current) resizePixiLayer(pixiRef.current, w, h);
    logicalSizeRef.current = { width: w, height: h };
    return { width: w, height: h };
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
    firstClashRef.current = false;
    shakeRef.current = { intensity: 0, offsetX: 0, offsetY: 0 };
    clashFlashRef.current = 0;
    arenaCacheRef.current = null; // clear scuff marks
    camRef.current = { x: 0, y: 0, zoom: 1 };
    clashPointRef.current = { x: width / 2, y: height / 2 };
    resetChargeState();
    setInitialCounts(menArmySize, womenArmySize);
    aliveRef.current = menArmySize + womenArmySize;
    lastStatsRef.current = null;

    onStatsUpdate({ menAlive: menArmySize, womenAlive: womenArmySize, menKills: 0, womenKills: 0 });
    phaseRef.current = "stand";
    onPhaseChange("stand");
    timeRef.current = 180;
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
    return () => observer.disconnect();
  }, [initCanvas]);

  const handleMeteorClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRunning || phaseRef.current === "victory") return;
    if (!gridRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const { width, height } = logicalSizeRef.current;
    const cam = camRef.current;
    // invert camera transform
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const x = (sx - width / 2 - cam.x * cam.zoom) / cam.zoom + width / 2;
    const y = (sy - height / 2 - cam.y * cam.zoom) / cam.zoom + height / 2;
    applyMeteorImpact(soaRef.current, gridRef.current, x, y, 100, 500);
    spawnMeteorImpact(poolRef.current, x, y);
    playKills(5);
    shakeRef.current.intensity = Math.min(shakeRef.current.intensity + 8, 12);
    toast.info("Meteor Strike!", { duration: 1000 });
  }, [isRunning]);

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
  const STAND_SECONDS = 1.5;

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
      speakNarration("meleePhase");
    }
    if (timeRef.current <= 30 && prevTime > 30) speakNarration("suddenDeath");

    const result = updatePhysics(
      soaRef.current, gridRef.current, poolRef.current,
      DEFAULT_CONFIG, phaseRef.current, dt,
      width, height, p.battleSpeed, p.menRageEnabled || p.womenRageEnabled
    );

    killStatsRef.current.menKills += result.stats.menKills;
    killStatsRef.current.womenKills += result.stats.womenKills;
    aliveRef.current = result.stats.menAlive + result.stats.womenAlive;
    lastStatsRef.current = result.stats;

    const newKills = result.stats.menKills + result.stats.womenKills;
    if (newKills > 0) {
      shakeRef.current.intensity = Math.min(shakeRef.current.intensity + newKills * 1.2, 5);
      playKills(newKills);
      for (const k of result.kills) {
        addScuff(k.x, k.y);
        clashPointRef.current.x += (k.x - clashPointRef.current.x) * 0.05;
        clashPointRef.current.y += (k.y - clashPointRef.current.y) * 0.05;
      }
    }
    if (newKills > 0 && !firstClashRef.current) {
      firstClashRef.current = true;
      if (result.kills.length > 0) spawnClashShockwave(poolRef.current, result.kills[0].x, result.kills[0].y);
      clashFlashRef.current = 0.25;
      shakeRef.current.intensity = 7;
    }
    if (clashFlashRef.current > 0) clashFlashRef.current = Math.max(0, clashFlashRef.current - dt * 1.5);

    updateParticles(poolRef.current, dt);

    if (result.stats.menAlive === 0 || result.stats.womenAlive === 0) {
      phaseRef.current = "victory";
      p.onPhaseChange("victory");
      const winner = result.stats.menAlive > 0 ? "men" : "women";
      speakNarration(winner === "men" ? "victoryMen" : "victoryWomen");
      spawnConfetti(poolRef.current, width / 2, height / 2, width);
      pushUi(true);
      p.onVictory(winner);
    }
  }, [speakNarration, addScuff]);

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
    if (sh.intensity > 0.1) {
      sh.offsetX = (Math.random() - 0.5) * sh.intensity * 2;
      sh.offsetY = (Math.random() - 0.5) * sh.intensity * 2;
      sh.intensity *= 0.88;
    } else { sh.intensity = 0; sh.offsetX = 0; sh.offsetY = 0; }

    // Camera: gentle follow of clash point during melee
    const cam = camRef.current;
    const fighting = phase === 'melee' || phase === 'sudden_death';
    const targetZoom = phase === 'stand' ? 1 + Math.min(phaseTimeRef.current / STAND_SECONDS, 1) * 0.03 : fighting && firstClashRef.current ? 1.08 : 1;
    const targetX = fighting && firstClashRef.current ? (width / 2 - clashPointRef.current.x) * 0.25 : 0;
    const targetY = fighting && firstClashRef.current ? (height / 2 - clashPointRef.current.y) * 0.25 : 0;
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

    // Layer 2: units on GPU (fallback to 2D if Pixi unavailable)
    if (pixiRef.current) {
      renderPixiUnits(pixiRef.current, soaRef.current, phase, { x: camX, y: camY, zoom: cam.zoom, w: width, h: height });
    } else {
      ctx.save(); applyCam(ctx); renderUnits(ctx, soaRef.current, false, 0, false, phase); ctx.restore();
    }

    // Layer 3: particles + lighting
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.clearRect(0, 0, width, height);
    fx.save(); applyCam(fx); renderParticles(fx, poolRef.current); fx.restore();
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
        while (acc >= FIXED_DT && steps < 5) { stepFnRef.current(FIXED_DT); acc -= FIXED_DT; steps++; }
        if (steps === 5) acc = 0;
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

  // Pixi GPU layer
  useEffect(() => {
    const c = unitCanvasRef.current;
    if (!c) return;
    let layer: PixiUnitLayer | null = null;
    let cancelled = false;
    const { width, height } = logicalSizeRef.current;
    createPixiUnitLayer(c, width, height)
      .then(l => { if (cancelled) destroyPixiLayer(l); else { layer = l; pixiRef.current = l; } })
      .catch(err => console.warn('PixiJS unavailable, using 2D fallback', err));
    return () => { cancelled = true; pixiRef.current = null; if (layer) destroyPixiLayer(layer); };
  }, []);

  useEffect(() => { initCanvas(); }, [initCanvas]);

  useEffect(() => {
    if (!isRunning && !initializedRef.current) initializeBattle();
  }, [menArmySize, womenArmySize, initializeBattle, isRunning]);

  useEffect(() => {
    if (isRunning && !initializedRef.current) initializeBattle();
  }, [isRunning, initializeBattle]);

  useEffect(() => {
    if (!isRunning) initializedRef.current = false;
  }, [isRunning]);

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
