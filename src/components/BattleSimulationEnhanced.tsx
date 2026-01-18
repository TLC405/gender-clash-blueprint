/**
 * Ultra-Premium Battle Simulation
 * Disney-quality visuals with professional arena rendering
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { speak, stopSpeaking, type NarratorContext } from "@/utils/battleNarrator";
import { createArenaRenderer } from "./battle/ArenaRenderer";

// High-performance modules
import { createBattleSoA, initializeUnits, type BattleSoA, TEAM_MEN } from "@/lib/battleSoA";
import { createSpatialHashGrid, resizeGrid, type SpatialHashGrid } from "@/lib/spatialHash";
import { createParticlePool, updateParticles, renderParticles, spawnConfetti, spawnMeteorImpact, spawnRageEffect, clearParticles, type ParticlePool } from "@/lib/particlePool";
import { updatePhysics, applyMeteorImpact, DEFAULT_CONFIG, type BattlePhase, type PhysicsConfig } from "@/lib/battlePhysics";
import { renderUnits, initSprites } from "@/lib/spriteRenderer";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [phase, setPhase] = useState<BattlePhase>("stand");
  const [timeRemaining, setTimeRemaining] = useState(180);

  // High-performance refs
  const soaRef = useRef<BattleSoA>(createBattleSoA());
  const gridRef = useRef<SpatialHashGrid | null>(null);
  const poolRef = useRef<ParticlePool>(createParticlePool());
  const arenaRef = useRef(createArenaRenderer());
  const lastTimeRef = useRef<number>(0);
  const phaseTimeRef = useRef<number>(0);
  const killStatsRef = useRef({ menKills: 0, womenKills: 0 });
  const initializedRef = useRef(false);
  const frameCountRef = useRef(0);

  const speakNarration = useCallback((context: NarratorContext) => {
    const quip = speak(context, narratorEnabled);
    if (quip) onQuipChange(quip);
  }, [narratorEnabled, onQuipChange]);

  const initializeBattle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    
    const maxArmySize = Math.max(menArmySize, womenArmySize);
    initializeUnits(soaRef.current, maxArmySize, width, height);
    
    if (!gridRef.current) {
      gridRef.current = createSpatialHashGrid(width, height, 50);
    } else {
      resizeGrid(gridRef.current, width, height);
    }
    
    clearParticles(poolRef.current);
    killStatsRef.current = { menKills: 0, womenKills: 0 };
    
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
  }, [menArmySize, womenArmySize, speakNarration, onStatsUpdate, onPhaseChange, onTimeUpdate]);

  const handleMeteorClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRunning || phase === "victory") return;
    
    const canvas = canvasRef.current;
    if (!canvas || !gridRef.current) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    applyMeteorImpact(soaRef.current, gridRef.current, x, y, 100, 500);
    spawnMeteorImpact(poolRef.current, x, y);
    toast.info("Meteor Strike!");
  }, [isRunning, phase]);

  const updateBattle = useCallback((deltaTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !gridRef.current) return;

    phaseTimeRef.current += deltaTime;
    const newTime = Math.max(0, timeRemaining - deltaTime);
    setTimeRemaining(newTime);
    onTimeUpdate(newTime);

    if (phase === "stand" && phaseTimeRef.current > 3) {
      setPhase("melee");
      onPhaseChange("melee");
      phaseTimeRef.current = 0;
      setTimeRemaining(60);
      onTimeUpdate(60);
      speakNarration("meleePhase");
    } else if (phase === "melee" && phaseTimeRef.current > 60) {
      setPhase("stand");
      onPhaseChange("stand");
      phaseTimeRef.current = 0;
      setTimeRemaining(180);
      onTimeUpdate(180);
      speakNarration("standPhase");
    }

    const rageActive = menRageEnabled || womenRageEnabled;
    const result = updatePhysics(
      soaRef.current,
      gridRef.current,
      poolRef.current,
      DEFAULT_CONFIG,
      phase,
      deltaTime,
      canvas.width,
      canvas.height,
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

    if (result.stats.menAlive === 0 || result.stats.womenAlive === 0) {
      setPhase("victory");
      onPhaseChange("victory");
      const winner = result.stats.menAlive > 0 ? "men" : "women";
      speakNarration(winner === "men" ? "victoryMen" : "victoryWomen");
      spawnConfetti(poolRef.current, canvas.width / 2, canvas.height / 2);
      onVictory(winner);
    }
  }, [battleSpeed, phase, timeRemaining, menRageEnabled, womenRageEnabled, speakNarration, onStatsUpdate, onPhaseChange, onTimeUpdate, onVictory]);

  const renderBattle = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const time = frameCountRef.current / 60;
    frameCountRef.current++;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Layer 1: Stadium background (shell, seating, lighting rigs)
    arenaRef.current.renderBackground(ctx, width, height);

    // Layer 2: Turf (grass, lines, end zones)
    arenaRef.current.renderTurf(ctx, width, height);

    // Layer 3: Crowd animation
    arenaRef.current.renderCrowd(ctx, width, height, time);

    // Layer 4: Units with Disney-quality rendering
    renderUnits(ctx, soaRef.current, false, frameCountRef.current);

    // Layer 5: Particles (elegant geometric effects)
    renderParticles(ctx, poolRef.current);

    // Layer 6: Dynamic lighting overlay
    arenaRef.current.renderLighting(ctx, width, height, phase);

  }, [phase]);

  const animate = useCallback(
    (currentTime: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      if (isRunning && phase !== "victory") {
        updateBattle(deltaTime);
      }
      renderBattle();

      animationRef.current = requestAnimationFrame(animate);
    },
    [isRunning, phase, updateBattle, renderBattle]
  );

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    initSprites();
  }, []);

  // Initialize battle when army sizes change
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

  // Reset function
  useEffect(() => {
    if (!isRunning) {
      initializedRef.current = false;
    }
  }, [isRunning]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair rounded-lg shadow-2xl"
      onClick={handleMeteorClick}
      aria-label="Battle Arena - Click to launch meteor strike"
    />
  );
};

export default BattleSimulation;
