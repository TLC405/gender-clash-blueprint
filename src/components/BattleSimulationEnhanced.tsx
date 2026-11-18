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
import { updatePhysics, applyMeteorImpact, applyArcadeBlast, DEFAULT_CONFIG, resetChargeState, setInitialCounts, type BattlePhase } from "@/lib/battlePhysicsV4";
import { renderUnits } from "@/lib/spriteRenderer";
import type { StickFigure3DLayer } from "@/lib/stickFigure3DRenderer";
import { playKills, playImpacts, playBell, playClash, playMeteor, playVictory } from "@/lib/battleAudio";
import { renderPremiumArena } from "@/lib/arenaRenderer";
import type { ArenaSurface, FormationPattern } from "@/lib/arenaOptions";
import { heroWeaponConfig, type CombatMode, type HeroWeapon } from "@/lib/combatModes";
import { teamAttack, DEFAULT_TEAMS, type SandboxTeams } from "@/lib/sandboxLoadouts";
import { renderTlcCommander } from "@/lib/commanderRenderer";

type BattleSimulationProps = {
  menArmySize: number;
  womenArmySize: number;
  formationPattern?: FormationPattern;
  womenFormationPattern?: FormationPattern;
  arenaSurface?: ArenaSurface;
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
  menPower?: number;
  combatModeId?: CombatMode;
  heroAction?: {id:number;weapon:HeroWeapon;x:number;y:number};
  heroPosition?: {x:number;y:number};
  heroWeapon?: HeroWeapon;
  teamLoadouts?: SandboxTeams;
  chaosIntensity?: number;
  cameraScale?: number;
};

const BattleSimulation = ({
  menArmySize, womenArmySize, battleSpeed,
  formationPattern = "battle-lines", womenFormationPattern = formationPattern, arenaSurface = "championship",
  menRageEnabled, womenRageEnabled, isRunning,
  onStatsUpdate, onPhaseChange, onTimeUpdate, onQuipChange, onVictory,
  narratorEnabled, meteorTrigger = 0, meteorCharges = 0, onMeteorUsed, reducedMotion = false, menPower = 1, combatModeId = 'brawl', heroAction, heroPosition, heroWeapon = 'water',
  teamLoadouts = DEFAULT_TEAMS, chaosIntensity = 1, cameraScale = 1.18
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
  const failedArenaRef = useRef(false);
  // ?safe=1 is a reliable low-resource entrypoint if the Android GPU stalls.
  const gpuDisabledRef = useRef(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('safe') === '1');
  const lastPaintRef = useRef(0);
  const hasPaintedRef = useRef(false);
  const centerCrestRef = useRef<HTMLImageElement | null>(null);
  const stick3DRef = useRef<StickFigure3DLayer | null>(null);
  const stick3DOpsRef = useRef<typeof import("@/lib/stickFigure3DRenderer") | null>(null);
  const camRef = useRef({ x: 0, y: 0, zoom: 1 });
  const clashPointRef = useRef({ x: 0, y: 0 });
  const stepFnRef = useRef<(dt: number) => void>(() => {});
  const renderFnRef = useRef<() => void>(() => {});
  const propsRef = useRef({ menPower, battleSpeed, menRageEnabled, womenRageEnabled, isRunning, combatModeId, teamLoadouts, chaosIntensity, cameraScale, onStatsUpdate, onPhaseChange, onTimeUpdate, onVictory });
  propsRef.current = { menPower, battleSpeed, menRageEnabled, womenRageEnabled, isRunning, combatModeId, teamLoadouts, chaosIntensity, cameraScale, onStatsUpdate, onPhaseChange, onTimeUpdate, onVictory };

  const soaRef = useRef<BattleSoA>(createBattleSoA());
  const gridRef = useRef<SpatialHashGrid | null>(null);
  const poolRef = useRef<ParticlePool>(createParticlePool());
  const lastTimeRef = useRef<number>(0);
  const phaseTimeRef = useRef<number>(0);
  const killStatsRef = useRef({ menKills: 0, womenKills: 0 });
  // A bounded, temporary 2D aftermath trail adds readable knockdowns without 3D ragdolls.
  const fallenRef = useRef<Array<{ x: number; y: number; dx: number; dy: number; angle: number; age: number; color: string; z: number; vz: number; spin: number; word: string }>>([]);
  const initializedRef = useRef(false);
  const dprRef = useRef<number>(1);
  const logicalSizeRef = useRef({ width: 800, height: 600 });
  const firstClashRef = useRef(false);
  const meleeRageRef = useRef(false);
  const lastWeaponAtRef = useRef([0,0]);
  const weaponSequenceRef = useRef([0,0]);
  const rallyUntilRef = useRef(0);
  const heroVisualRef = useRef<{position?:{x:number;y:number};weapon:HeroWeapon}>({weapon:'water'});
  heroVisualRef.current = {position:heroPosition,weapon:heroWeapon};
  const projectileRef = useRef<Array<{ax:number;ay:number;bx:number;by:number;age:number;kind:string}>>([]);
  const heroHandledRef = useRef(0);
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
    // Three fullscreen canvases at high DPI can exhaust Fold/in-app browser GPU memory.
    const screenSize = Math.min(window.innerWidth,window.innerHeight);
    const dpr = gpuDisabledRef.current ? 1 : Math.min(window.devicePixelRatio || 1, screenSize <= 500 ? 1.3 : 1.75);
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
    initializeUnits(soaRef.current, menArmySize, width, height, womenArmySize, formationPattern, womenFormationPattern);

    if (!gridRef.current) {
      gridRef.current = createSpatialHashGrid(width, height, 50);
    } else {
      resizeGrid(gridRef.current, width, height);
    }

    clearParticles(poolRef.current);
    killStatsRef.current = { menKills: 0, womenKills: 0 };
    fallenRef.current = [];
    firstClashRef.current = false;
    meleeRageRef.current = false;
    projectileRef.current = [];
    lastWeaponAtRef.current = [0,0];
    weaponSequenceRef.current = [0,0];
    rallyUntilRef.current = 0;
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
  }, [menArmySize, womenArmySize, formationPattern, womenFormationPattern, initCanvas, speakNarration, onStatsUpdate, onPhaseChange, onTimeUpdate]);

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

  // Commander is a fully drawn game-world fighter. Input attacks affect actual unit state.
  useEffect(() => {
    if(!heroAction || heroAction.id===heroHandledRef.current) return;
    heroHandledRef.current=heroAction.id;
    if(!isRunning || phaseRef.current==="victory" || !gridRef.current) return;
    const {width,height}=logicalSizeRef.current;
    if(heroAction.weapon==="rally"){
      rallyUntilRef.current=phaseTimeRef.current+9;
      playClash();
      return;
    }
    const weapon=heroWeaponConfig(heroAction.weapon);
    const x=Math.max(20,Math.min(width-20,width*heroAction.x));
    const y=Math.max(20,Math.min(height-20,height*heroAction.y));
    applyArcadeBlast(soaRef.current,x,y,weapon.radius,weapon.damage,weapon.strength,TEAM_WOMEN);
    const origin=heroVisualRef.current.position;
    if(origin){
      projectileRef.current.push({ax:origin.x*width,ay:origin.y*height-24,bx:x,by:y,age:0,kind:heroAction.weapon});
      if(projectileRef.current.length>60)projectileRef.current.shift();
    }
    if(heroAction.weapon==="nuke" || heroAction.weapon==="shockwave")spawnMeteorImpact(poolRef.current,x,y);
    else spawnClashShockwave(poolRef.current,x,y);
    playMeteor();
    propsRef.current.onStatsUpdate({menAlive:soaRef.current.menCount,womenAlive:soaRef.current.womenCount,...killStatsRef.current});
    if(soaRef.current.menCount===0||soaRef.current.womenCount===0)finishBattle(soaRef.current.menCount,soaRef.current.womenCount);
  },[heroAction,isRunning,finishBattle]);

  // Premium scalable center-court graphics: SVG decodes once and the entire
  // floor is cached as a device-pixel-ratio-aware Canvas bitmap.
  useEffect(() => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      centerCrestRef.current = image;
      arenaCacheRef.current = null;
    };
    image.onerror = () => { centerCrestRef.current = null; };
    image.src = import.meta.env.BASE_URL + "branding/tlc-championship-crest.svg";
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, []);

  useEffect(() => { arenaCacheRef.current = null; }, [arenaSurface]);

  const renderArena = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    renderPremiumArena(ctx, width, height, arenaSurface, centerCrestRef.current);
  }, [arenaSurface]);

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
  }, [menArmySize, womenArmySize, isRunning]);

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
    try {
      renderArena(g, width, height);
      failedArenaRef.current = false;
    } catch (error) {
      // Fail open if any SVG/Canvas operation fails: keep play controls usable.
      if (!failedArenaRef.current) console.error('[TLC Arena] Advanced floor failed; fallback active',error);
      failedArenaRef.current = true;
      g.fillStyle = '#10273d';
      g.fillRect(0,0,width,height);
      g.strokeStyle = '#718da6';
      g.lineWidth = 2;
      g.strokeRect(8,8,Math.max(0,width-16),Math.max(0,height-16));
      g.beginPath();g.moveTo(width/2,8);g.lineTo(width/2,height-8);g.stroke();
    }
    arenaCacheRef.current = c;
    return c;
  }, [renderArena]);

  const FIXED_DT = 1 / 60;
  const STAND_SECONDS = 0.8;

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
      width, height, p.battleSpeed * (0.65 + p.chaosIntensity * .35), { men: p.menRageEnabled || meleeRageRef.current || phaseTimeRef.current<rallyUntilRef.current, women: p.womenRageEnabled || meleeRageRef.current }, p.menPower * (phaseTimeRef.current<rallyUntilRef.current?1.35:1),
      p.teamLoadouts.women.speed, p.teamLoadouts.women.furiosa ? 1.55 : 1
    );

    killStatsRef.current.menKills += result.stats.menKills;
    killStatsRef.current.womenKills += result.stats.womenKills;
    aliveRef.current = result.stats.menAlive + result.stats.womenAlive;
    lastStatsRef.current = result.stats;

    // The first REAL contact triggers rage for the entire arena.
    if(result.impacts>0 && !meleeRageRef.current) {
      meleeRageRef.current=true;
      playClash();
      if(!reducedMotionRef.current){clashFlashRef.current=.3;shakeRef.current.intensity=5;}
      for(let i=0;i<soaRef.current.unitCount;i++) if(soaRef.current.stateFlags[i]&FLAG_ALIVE)soaRef.current.stagger[i]=Math.max(soaRef.current.stagger[i],.12);
    }
    // Each team's loadout is independent; weapons fire at real living opponents.
    if(phaseRef.current!=="stand"){
      const s=soaRef.current;
      for(const side of [TEAM_MEN,TEAM_WOMEN] as const){
        const order=weaponSequenceRef.current[side];
        const attack=teamAttack(p.teamLoadouts,side,order,p.chaosIntensity);
        if(!attack || phaseTimeRef.current-lastWeaponAtRef.current[side]<attack.delay)continue;
        lastWeaponAtRef.current[side]=phaseTimeRef.current;
        weaponSequenceRef.current[side]++;
        const target=side===TEAM_MEN?TEAM_WOMEN:TEAM_MEN;
        const slots:number[]=[];
        for(let i=0;i<s.unitCount;i++)if(s.teamID[i]===target&&(s.stateFlags[i]&FLAG_ALIVE))slots.push(i);
        if(!slots.length)continue;
        const victim=slots[(order*7+Math.floor(phaseTimeRef.current*3))%slots.length];
        let attacker=-1;
        for(let i=0;i<s.unitCount;i++){if(s.teamID[i]===side&&(s.stateFlags[i]&FLAG_ALIVE)){attacker=i;break;}}
        if(attacker>=0){
          projectileRef.current.push({
            ax:s.posX[attacker],ay:s.posY[attacker]-12,
            bx:s.posX[victim],by:s.posY[victim],age:0,kind:attack.kind,
          });
          if(projectileRef.current.length>60)projectileRef.current.shift();
        }
        applyArcadeBlast(s,s.posX[victim],s.posY[victim],attack.radius,attack.damage,attack.push,target);
        spawnClashShockwave(poolRef.current,s.posX[victim],s.posY[victim]);
        playImpacts(attack.kind==="makeup"?6:2);
      }
      // Arcade attacks may eliminate fighters after the melee engine's snapshot.
      lastStatsRef.current={...result.stats,menAlive:s.menCount,womenAlive:s.womenCount};
    }

    // Deterministic bounded trails fade independently from the battle scores.
    projectileRef.current=projectileRef.current.filter(p=>(p.age+=dt)<.55);
    const fallen = fallenRef.current;
    let livingMarkers = 0;
    for (let j = 0; j < fallen.length; j++) {
      const body = fallen[j];
      body.age += dt;
      if (body.age >= 2.25) continue;
      // Cartoon ragdoll: launched into the air, spins, bounces, then slides to a stop.
      body.vz -= 900 * dt;
      body.z += body.vz * dt;
      if (body.z <= 0) {
        body.z = 0;
        if (body.vz < -120) { body.vz = -body.vz * 0.35; body.spin *= 0.5; }
        else { body.vz = 0; body.spin *= Math.exp(-6 * dt); }
        const friction = Math.exp(-4 * dt);
        body.dx *= friction; body.dy *= friction;
      }
      body.x += body.dx * dt;
      body.y += body.dy * dt;
      body.angle += body.spin * dt;
      fallen[livingMarkers++] = body;
    }
    fallen.length = livingMarkers;

    const newKills = result.stats.menKills + result.stats.womenKills;
    if(newKills===0 && result.impacts>0) playImpacts(result.impacts);
    if (newKills > 0) {
      if (!reducedMotionRef.current) shakeRef.current.intensity = Math.min(shakeRef.current.intensity + newKills * 1.2, 5);
      playKills(newKills);
      for (const k of result.kills) {
        const forward = k.killerTeam === TEAM_MEN ? 1 : -1;
        const calm = reducedMotionRef.current;
        const power = calm ? 0.3 : 0.6 + Math.random() * 0.9;
        const words = ["BONK!", "YEET!", "OOF!", "POW!", "WHEEE!", "SPLAT!", "BOING!"];
        fallen.push({
          x: k.x, y: k.y,
          dx: forward * (110 + Math.random() * 170) * power,
          dy: (Math.random() - 0.5) * 220 * power,
          z: 0, vz: (220 + Math.random() * 260) * power,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 14) * power,
          age: 0,
          word: !calm && Math.random() < 0.18 ? words[Math.floor(Math.random() * words.length)] : "",
          color: k.killerTeam === TEAM_MEN ? "#ff8ebd" : "#7ac5ff",
        });
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
    const targetZoom = propsRef.current.cameraScale * (reducedMotionRef.current ? 1 : phase === 'stand' ? 1.01 : fighting && firstClashRef.current ? 1.03 : 1);
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
    if (stick3DRef.current && stick3DOpsRef.current && !gpuDisabledRef.current) {
      try {
        stick3DOpsRef.current.renderStickFigure3DLayer(
          stick3DRef.current, soaRef.current,
          { x: camX, y: camY, zoom: cam.zoom, w: width, h: height },
          reducedMotionRef.current, performance.now() / 1000, propsRef.current.teamLoadouts, meleeRageRef.current
        );
      } catch (error) {
        console.warn('[TLC Arena] 3D rendering failed; switching to safe 2D mode',error);
        gpuDisabledRef.current = true;
        if(unitCanvasRef.current)unitCanvasRef.current.style.display='none';
      }
    }
    if (!stick3DRef.current || !stick3DOpsRef.current || gpuDisabledRef.current) {
      ctx.save(); applyCam(ctx);
      try { renderUnits(ctx, soaRef.current, false, 0, false, phase, combatModeId, meleeRageRef.current, propsRef.current.teamLoadouts); }
      finally { ctx.restore(); }
    }

    // Layer 3: particles + lighting
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.clearRect(0, 0, width, height);
    fx.save(); applyCam(fx);
    // Impact aftermath: brief horizontal trails, not a fake 3D ragdoll claim.
    for (const body of fallenRef.current) {
      const fade = Math.min(1, (2.25 - body.age) / 0.6);
      // ground shadow shrinks as they fly higher
      const sh = Math.max(0.3, 1 - body.z / 160);
      fx.globalAlpha = 0.3 * fade * sh;
      fx.fillStyle = "#000";
      fx.beginPath(); fx.ellipse(body.x, body.y + 6, 7 * sh, 2.5 * sh, 0, 0, Math.PI * 2); fx.fill();
      // flailing stick figure
      fx.globalAlpha = fade;
      fx.save();
      fx.translate(body.x, body.y - body.z);
      fx.rotate(body.angle);
      fx.strokeStyle = body.color; fx.fillStyle = body.color;
      fx.lineWidth = 2; fx.lineCap = "round";
      const flail = Math.sin(body.age * 30) * 0.9;
      fx.beginPath();
      fx.moveTo(0, -4); fx.lineTo(0, 5);                       // torso
      fx.moveTo(0, -2); fx.lineTo(-6, -2 - 5 * flail);         // arms
      fx.moveTo(0, -2); fx.lineTo(6, -2 + 5 * flail);
      fx.moveTo(0, 5); fx.lineTo(-4, 11 + 2 * flail);          // legs
      fx.moveTo(0, 5); fx.lineTo(4, 11 - 2 * flail);
      fx.stroke();
      fx.beginPath(); fx.arc(0, -7.5, 3.2, 0, Math.PI * 2); fx.fill();
      fx.restore();
      if (body.word && body.age < 0.9) {
        fx.globalAlpha = 1 - body.age / 0.9;
        fx.font = "900 13px system-ui, sans-serif";
        fx.textAlign = "center";
        fx.lineWidth = 3; fx.strokeStyle = "#111"; fx.fillStyle = "#ffe14d";
        const ty = body.y - body.z - 22 - body.age * 30;
        fx.strokeText(body.word, body.x, ty); fx.fillText(body.word, body.x, ty);
      }
    }
    fx.globalAlpha = 1;
    for(const shot of projectileRef.current){
      const t=Math.min(1,shot.age/.32);
      const endX=shot.ax+(shot.bx-shot.ax)*t;
      const endY=shot.ay+(shot.by-shot.ay)*t;
      const color=shot.kind==="lipstick"||shot.kind==="makeup"?"#ff85c3":
        shot.kind==="water"?"#66e0ff":shot.kind==="nuke"?"#ffbe72":
        shot.kind==="sword"?"#d9ecff":"#9bc5ff";
      const fade=Math.max(0,1-shot.age/.55);
      fx.globalAlpha=fade;
      fx.strokeStyle=color;fx.lineWidth=shot.kind==="nuke"?5:shot.kind==="makeup"?3:2;
      fx.lineCap="round";fx.beginPath();
      fx.moveTo(shot.ax,shot.ay);
      fx.quadraticCurveTo((shot.ax+shot.bx)/2,(shot.ay+shot.by)/2-(shot.kind==="makeup"?38:9),endX,endY);
      fx.stroke();
      fx.fillStyle="#fff7e5";fx.beginPath();fx.arc(endX,endY,shot.kind==="nuke"?5:2.8,0,Math.PI*2);fx.fill();
    }
    fx.globalAlpha=1;
    renderParticles(fx, poolRef.current);
    const hero=heroVisualRef.current;
    if(hero.position){renderTlcCommander(fx,hero.position.x*width,hero.position.y*height,performance.now()/1000,hero.weapon,Math.min(1.4,Math.max(1.0,Math.min(width,height)/320)),reducedMotionRef.current);}
    fx.restore();
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
      // Do not run 2,000-person rig animation at 60FPS on the unopened screen.
      // A stable static preview is enough until the user taps Start.
      const running=propsRef.current.isRunning && phaseRef.current!=='victory';
      const frameInterval=running?16:250;
      if (!hasPaintedRef.current || t-lastPaintRef.current>=frameInterval){
        hasPaintedRef.current=true;
        lastPaintRef.current=t;
        try {renderFnRef.current();}
        catch(error){console.error('[TLC Arena] Frame paint recovered',error);gpuDisabledRef.current=true;if(unitCanvasRef.current)unitCanvasRef.current.style.display='none';}
      }
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
    // Delay WebGL allocation until the player explicitly starts a match.
    // Avoids an expensive GPU context/mesh initialization when merely opening.
    if (!isRunning || gpuDisabledRef.current) return;
    const canvas = unitCanvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const onContextLost=(event:Event)=>{
      event.preventDefault();
      gpuDisabledRef.current=true;
      canvas.style.display='none';
      console.warn('[TLC Arena] WebGL context lost; 2D fallback active');
    };
    canvas.addEventListener('webglcontextlost',onContextLost);
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
          canvas.style.display='block';
        } catch (error) {
          gpuDisabledRef.current = true;
          canvas.style.display='none';
          console.warn("3D fighters unavailable; using 2D human stick figures", error);
        }
      })
      .catch(error => console.warn("3D fighter renderer could not load; using 2D fallback", error));
    return () => {
      cancelled = true;
      canvas.removeEventListener('webglcontextlost',onContextLost);
      canvas.style.display='none'; // Never leave a stale WebGL frame over the 2D fallback on Pause.
      if (ownedLayer && stick3DOpsRef.current) {
        stick3DOpsRef.current.destroyStickFigure3DLayer(ownedLayer);
      }
      stick3DRef.current = null;
      stick3DOpsRef.current = null;
    };
  }, [menArmySize, womenArmySize, isRunning]);
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
      <canvas ref={unitCanvasRef} className="absolute inset-0 block pointer-events-none" style={{display:gpuDisabledRef.current?"none":undefined}} />
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
