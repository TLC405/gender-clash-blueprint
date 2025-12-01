import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Settings2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { NFLScoreboard } from "./battle/NFLScoreboard";
import { VictoryScreen } from "./battle/VictoryScreen";
import { FormationOverlay } from "./battle/FormationOverlay";
import { ParticleRenderer, useParticleSystem } from "./battle/ParticleEffects";
import { createArenaRenderer } from "./battle/ArenaRenderer";
import { speak, stopSpeaking, type NarratorContext } from "@/utils/battleNarrator";
import powerupsData from "@/data/powerups.json";

type FormationState = "scattered" | "forming" | "locked" | "charging" | "broken";
type BattlePhase = "stand" | "melee" | "sudden_death" | "victory";

type Unit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  side: "men" | "women";
  target?: Unit;
  formationState: FormationState;
  formationRow: number;
  formationCol: number;
  isLeader: boolean;
  powerup?: string;
  powerupEndTime?: number;
};

type PowerUp = {
  id: string;
  x: number;
  y: number;
  type: string;
  icon: string;
  color: string;
  spawnTime: number;
};

type BattleStats = {
  menAlive: number;
  womenAlive: number;
  menKills: number;
  womenKills: number;
};

const BattleSimulationEnhanced = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [narratorEnabled, setNarratorEnabled] = useState(true);
  const [armySize, setArmySize] = useState(10000);
  const [battleSpeed, setBattleSpeed] = useState(1);
  const [phase, setPhase] = useState<BattlePhase>("stand");
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const [currentQuip, setCurrentQuip] = useState("Prepare for battle!");
  const [stats, setStats] = useState<BattleStats>({
    menAlive: armySize,
    womenAlive: armySize,
    menKills: 0,
    womenKills: 0,
  });
  const [menFormationActive, setMenFormationActive] = useState(false);
  const [womenFormationActive, setWomenFormationActive] = useState(false);
  const [battleStartTime, setBattleStartTime] = useState(0);

  const unitsRef = useRef<Unit[]>([]);
  const powerupsRef = useRef<PowerUp[]>([]);
  const lastTimeRef = useRef<number>(0);
  const phaseTimeRef = useRef<number>(0);
  const arenaRenderer = useRef(createArenaRenderer());
  
  const particleSystem = useParticleSystem(canvasRef);

  const speakNarration = useCallback((context: NarratorContext) => {
    const quip = speak(context, narratorEnabled);
    if (quip) setCurrentQuip(quip);
  }, [narratorEnabled]);

  const initializeBattle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const units: Unit[] = [];

    // MEN formation (left side)
    for (let i = 0; i < armySize; i++) {
      const row = Math.floor(i / 100);
      const col = i % 100;
      units.push({
        x: 50 + col * 3,
        y: height / 2 - 150 + row * 3,
        vx: 0,
        vy: 0,
        health: 100,
        maxHealth: 100,
        side: "men",
        formationState: "scattered",
        formationRow: row,
        formationCol: col,
        isLeader: i === 0,
      });
    }

    // WOMEN formation (right side)
    for (let i = 0; i < armySize; i++) {
      const row = Math.floor(i / 100);
      const col = i % 100;
      units.push({
        x: width - 50 - col * 3,
        y: height / 2 - 150 + row * 3,
        vx: 0,
        vy: 0,
        health: 100,
        maxHealth: 100,
        side: "women",
        formationState: "scattered",
        formationRow: row,
        formationCol: col,
        isLeader: i === 0,
      });
    }

    unitsRef.current = units;
    powerupsRef.current = [];
    setStats({
      menAlive: armySize,
      womenAlive: armySize,
      menKills: 0,
      womenKills: 0,
    });
    setPhase("stand");
    setTimeRemaining(180);
    phaseTimeRef.current = 0;
    setBattleStartTime(Date.now());
    
    speakNarration("standPhase");
    toast.success(`Battle initialized: ${armySize.toLocaleString()} vs ${armySize.toLocaleString()}`);
  }, [armySize, speakNarration]);

  const findNearestEnemy = (unit: Unit, units: Unit[]): Unit | undefined => {
    let nearest: Unit | undefined;
    let minDist = Infinity;

    for (const other of units) {
      if (other.side === unit.side || other.health <= 0) continue;
      const dx = other.x - unit.x;
      const dy = other.y - unit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = other;
      }
    }

    return nearest;
  };

  const checkFormation = (side: "men" | "women", units: Unit[], centerX: number, passWidth: number): boolean => {
    const sideUnits = units.filter(u => u.side === side && u.health > 0);
    if (sideUnits.length === 0) return false;

    const inCenterPass = sideUnits.filter(u => 
      Math.abs(u.x - centerX) < passWidth / 2
    );

    const formationRatio = inCenterPass.length / sideUnits.length;
    return formationRatio > 0.5;
  };

  const spawnPowerUp = (canvas: HTMLCanvasElement) => {
    const powerups = powerupsData.powerups;
    const totalWeight = powerups.reduce((sum, p) => sum + p.spawnWeight, 0);
    let random = Math.random() * totalWeight;
    
    let selectedPowerup = powerups[0];
    for (const p of powerups) {
      random -= p.spawnWeight;
      if (random <= 0) {
        selectedPowerup = p;
        break;
      }
    }

    const flankLeft = canvas.width * 0.2;
    const flankRight = canvas.width * 0.8;
    const isLeftFlank = Math.random() > 0.5;

    powerupsRef.current.push({
      id: `powerup_${Date.now()}_${Math.random()}`,
      x: isLeftFlank ? Math.random() * flankLeft : flankRight + Math.random() * (canvas.width - flankRight),
      y: Math.random() * canvas.height,
      type: selectedPowerup.id,
      icon: selectedPowerup.icon,
      color: selectedPowerup.color,
      spawnTime: Date.now()
    });

    speakNarration("powerupSpawn");
  };

  const updateBattle = useCallback((deltaTime: number) => {
    const units = unitsRef.current;
    const powerups = powerupsRef.current;
    const canvas = canvasRef.current;
    if (!canvas || units.length === 0) return;

    const MOVE_SPEED = 20 * battleSpeed;
    const ATTACK_RANGE = 5;
    const BASE_DAMAGE = 30 * battleSpeed;
    const COHESION_RADIUS = 30;
    const COHESION_STRENGTH = 0.1;
    const centerX = canvas.width / 2;
    const passWidth = 200;

    // Phase management
    phaseTimeRef.current += deltaTime;
    setTimeRemaining(prev => Math.max(0, prev - deltaTime));

    if (phase === "stand" && phaseTimeRef.current > 180) {
      setPhase("melee");
      phaseTimeRef.current = 0;
      setTimeRemaining(60);
      speakNarration("meleePhase");
    } else if (phase === "melee" && phaseTimeRef.current > 60) {
      setPhase("stand");
      phaseTimeRef.current = 0;
      setTimeRemaining(180);
      speakNarration("standPhase");
    }

    // Spawn power-ups during melee
    if (phase === "melee" && Math.random() < 0.01 * battleSpeed) {
      spawnPowerUp(canvas);
    }

    let menAlive = 0;
    let womenAlive = 0;

    // Check formations
    const menInFormation = checkFormation("men", units, centerX, passWidth);
    const womenInFormation = checkFormation("women", units, centerX, passWidth);
    
    if (menInFormation !== menFormationActive) {
      setMenFormationActive(menInFormation);
      if (menInFormation) speakNarration("phalanxForm");
      else speakNarration("phalanxBreak");
    }
    if (womenInFormation !== womenFormationActive) {
      setWomenFormationActive(womenInFormation);
      if (womenInFormation) speakNarration("phalanxForm");
      else speakNarration("phalanxBreak");
    }

    // Update units
    for (const unit of units) {
      if (unit.health <= 0) continue;

      if (unit.side === "men") menAlive++;
      else womenAlive++;

      // Power-up collection
      for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        const dx = powerup.x - unit.x;
        const dy = powerup.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10) {
          unit.powerup = powerup.type;
          unit.powerupEndTime = Date.now() + 5000;
          particleSystem.spawnStars(powerup.x, powerup.y);
          powerups.splice(i, 1);
          break;
        }
      }

      // Formation logic
      const inCenterPass = Math.abs(unit.x - centerX) < passWidth / 2;
      if (phase === "stand" && inCenterPass) {
        unit.formationState = "locked";
      } else {
        unit.formationState = "scattered";
      }

      const formationBonus = unit.formationState === "locked" ? 1.5 : 1.0;

      // Find or update target
      if (!unit.target || unit.target.health <= 0) {
        unit.target = findNearestEnemy(unit, units);
      }

      if (unit.target) {
        const dx = unit.target.x - unit.x;
        const dy = unit.target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ATTACK_RANGE) {
          // Attack with formation bonus
          const damage = BASE_DAMAGE * formationBonus * deltaTime;
          unit.target.health -= damage;
          
          if (unit.target.health <= 0) {
            // Loveable KO effects
            if (unit.side === "men") {
              particleSystem.spawnBeerSplash(unit.target.x, unit.target.y);
            } else {
              particleSystem.spawnFlowerBloom(unit.target.x, unit.target.y);
            }
            
            setStats(prev => ({
              ...prev,
              menKills: unit.side === "men" ? prev.menKills + 1 : prev.menKills,
              womenKills: unit.side === "women" ? prev.womenKills + 1 : prev.womenKills,
            }));
            unit.target = undefined;
          }
          unit.vx = 0;
          unit.vy = 0;
        } else {
          const moveSpeed = unit.formationState === "locked" ? MOVE_SPEED * 0.8 : MOVE_SPEED;
          unit.vx = (dx / dist) * moveSpeed;
          unit.vy = (dy / dist) * moveSpeed;
        }
      }

      // Formation cohesion
      if (unit.formationState === "locked") {
        let cohesionX = 0;
        let cohesionY = 0;
        let nearbyCount = 0;

        for (const other of units) {
          if (other === unit || other.side !== unit.side || other.health <= 0) continue;
          const dx = other.x - unit.x;
          const dy = other.y - unit.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < COHESION_RADIUS) {
            cohesionX += dx;
            cohesionY += dy;
            nearbyCount++;
          }
        }

        if (nearbyCount > 0) {
          unit.vx += (cohesionX / nearbyCount) * COHESION_STRENGTH * 2;
          unit.vy += (cohesionY / nearbyCount) * COHESION_STRENGTH * 2;
        }
      }

      // Update position
      unit.x += unit.vx * deltaTime;
      unit.y += unit.vy * deltaTime;

      // Boundary check
      unit.x = Math.max(0, Math.min(canvas.width, unit.x));
      unit.y = Math.max(0, Math.min(canvas.height, unit.y));
    }

    setStats(prev => ({
      ...prev,
      menAlive,
      womenAlive,
    }));

    // Check for victory
    if (menAlive === 0 || womenAlive === 0) {
      setIsRunning(false);
      setPhase("victory");
      const winner = menAlive > 0 ? "men" : "women";
      speakNarration(winner === "men" ? "victoryMen" : "victoryWomen");
      particleSystem.spawnConfetti(canvas.width / 2, canvas.height / 2);
    } else if (timeRemaining <= 0 && phase === "sudden_death") {
      // Sudden death timeout
      const winner = menAlive > womenAlive ? "men" : "women";
      setPhase("victory");
      speakNarration(winner === "men" ? "victoryMen" : "victoryWomen");
    }

    // Announce lead changes
    if (menAlive > womenAlive && menAlive - womenAlive > armySize * 0.1) {
      if (Math.random() < 0.01) speakNarration("menLead");
    } else if (womenAlive > menAlive && womenAlive - menAlive > armySize * 0.1) {
      if (Math.random() < 0.01) speakNarration("womenLead");
    }
  }, [battleSpeed, phase, armySize, particleSystem, speakNarration, menFormationActive, womenFormationActive, timeRemaining]);

  const renderBattle = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const time = performance.now() / 1000;
    const renderer = arenaRenderer.current;

    // Render arena layers
    renderer.renderBackground(ctx, canvas.width, canvas.height);
    renderer.renderTurf(ctx, canvas.width, canvas.height);
    renderer.renderCrowd(ctx, canvas.width, canvas.height, time);
    renderer.renderLighting(ctx, canvas.width, canvas.height, phase);

    // Draw power-ups
    const powerups = powerupsRef.current;
    ctx.save();
    for (const powerup of powerups) {
      const pulse = Math.sin(time * 5) * 0.2 + 1;
      ctx.globalAlpha = 0.8;
      ctx.font = `${24 * pulse}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(powerup.icon, powerup.x, powerup.y);
      
      // Glow effect
      ctx.shadowColor = powerup.color;
      ctx.shadowBlur = 20 * pulse;
      ctx.fillText(powerup.icon, powerup.x, powerup.y);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // Draw units
    const units = unitsRef.current;
    for (const unit of units) {
      if (unit.health <= 0) continue;

      const color = unit.side === "men" ? "#1F6FEB" : "#E91E63";
      const glowColor = unit.formationState === "locked" 
        ? "#FFD700" 
        : color;

      ctx.fillStyle = color;
      ctx.globalAlpha = Math.max(0.3, unit.health / unit.maxHealth);
      
      // Formation glow
      if (unit.formationState === "locked") {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 5;
      }
      
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, unit.isLeader ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    initializeBattle();
  }, [initializeBattle]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      stopSpeaking();
    };
  }, [animate]);

  const handlePlayPause = () => {
    setIsRunning(!isRunning);
    toast.info(isRunning ? "Battle paused" : "Battle resumed");
  };

  const handleReset = () => {
    setIsRunning(false);
    lastTimeRef.current = 0;
    stopSpeaking();
    initializeBattle();
  };

  const handleVictoryPlayAgain = () => {
    handleReset();
    setIsRunning(true);
  };

  const handleVictoryBackHome = () => {
    handleReset();
  };

  const battleDuration = phase === "victory" ? (Date.now() - battleStartTime) / 1000 : 0;

  return (
    <div className="w-full space-y-6 pb-32">
      <Card className="p-8 bg-card border-4 border-primary/30 shadow-epic overflow-hidden relative">
        {/* Epic Background Effects */}
        <div className="absolute inset-0 bg-arena-gradient opacity-50" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse-glow" />
        
        <div className="space-y-6 relative">
          {/* 3D Stadium View Container */}
          <div className="relative" style={{ perspective: '1500px' }}>
            {/* Stadium Seating Backdrop */}
            <div className="absolute inset-0 -inset-x-32 -inset-y-20 bg-gradient-to-b from-[hsl(var(--arena-dark))] via-[hsl(var(--background))] to-[hsl(var(--arena-dark))] rounded-3xl opacity-60 blur-sm" 
                 style={{ transform: 'translateZ(-100px) scale(1.2)' }} />
            
            {/* Canvas with 3D perspective transform */}
            <div 
              className="relative rounded-2xl overflow-visible border-4 border-primary/50 shadow-2xl"
              style={{ 
                transformStyle: 'preserve-3d',
                transform: 'rotateX(25deg) translateY(-40px)',
                transformOrigin: 'center center',
              }}
            >
              {/* Arena floor container */}
              <div className="relative bg-black rounded-2xl overflow-hidden" style={{ boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8)' }}>
                <canvas
                  ref={canvasRef}
                  className="w-full h-[600px]"
                  aria-label="TLC Battle Arena - Epic combat visualization"
                />
                
                <FormationOverlay
                  menFormationActive={menFormationActive}
                  womenFormationActive={womenFormationActive}
                />

                <div className="absolute inset-0 pointer-events-none">
                  <ParticleRenderer particles={particleSystem.particles} />
                </div>

                {/* Epic corner accents */}
                <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-[hsl(var(--men-primary))] opacity-50" />
                <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-[hsl(var(--women-primary))] opacity-50" />
                <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-[hsl(var(--men-primary))] opacity-50" />
                <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-[hsl(var(--women-primary))] opacity-50" />
              </div>
              
              {/* Stadium depth effect - far edge darkening */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none rounded-t-2xl" />
            </div>
          </div>

          {/* Epic Controls */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={handlePlayPause}
              variant="default"
              size="lg"
              disabled={phase === "victory"}
              className="gap-2 font-battle text-lg px-6 bg-men-gradient hover:scale-105 transition-transform shadow-neon-blue border-2 border-[hsl(var(--men-primary))]"
            >
              {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              {isRunning ? "Pause" : "Start Battle"}
            </Button>
            <Button 
              onClick={handleReset} 
              variant="outline" 
              size="lg"
              className="gap-2 font-battle text-lg px-6 hover:scale-105 transition-transform border-2"
            >
              <RotateCcw className="w-6 h-6" />
              Reset
            </Button>
            <Button
              onClick={() => setNarratorEnabled(!narratorEnabled)}
              variant="outline"
              size="lg"
              className="gap-2 font-battle text-lg px-6 hover:scale-105 transition-transform border-2"
            >
              {narratorEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              Narrator
            </Button>
            <Button
              onClick={() => setShowControls(!showControls)}
              variant="outline"
              size="lg"
              className="gap-2 font-battle text-lg px-6 hover:scale-105 transition-transform border-2"
            >
              <Settings2 className="w-6 h-6" />
              Settings
            </Button>
          </div>

          {/* Advanced Controls */}
          {showControls && (
            <div className="space-y-6 pt-6 border-t-2 border-primary/30">
              <div className="space-y-3">
                <label className="text-base font-battle text-foreground">
                  Army Size: <span className="text-primary">{armySize.toLocaleString()}</span> per side
                </label>
                <Slider
                  value={[armySize]}
                  onValueChange={(v) => setArmySize(v[0])}
                  min={1000}
                  max={20000}
                  step={1000}
                  disabled={isRunning}
                  className="cursor-pointer"
                />
              </div>
              <div className="space-y-3">
                <label className="text-base font-battle text-foreground">
                  Battle Speed: <span className="text-primary">{battleSpeed}x</span>
                </label>
                <Slider
                  value={[battleSpeed]}
                  onValueChange={(v) => setBattleSpeed(v[0])}
                  min={0.5}
                  max={5}
                  step={0.5}
                  className="cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* NFL Scoreboard */}
      <NFLScoreboard
        menCount={stats.menAlive}
        womenCount={stats.womenAlive}
        menKills={stats.menKills}
        womenKills={stats.womenKills}
        phase={phase}
        timeRemaining={timeRemaining}
        currentQuip={currentQuip}
      />

      {/* Victory Screen */}
      {phase === "victory" && (
        <VictoryScreen
          winner={stats.menAlive > stats.womenAlive ? "men" : "women"}
          menKills={stats.menKills}
          womenKills={stats.womenKills}
          battleDuration={battleDuration}
          onPlayAgain={handleVictoryPlayAgain}
          onBackHome={handleVictoryBackHome}
        />
      )}
    </div>
  );
};

export default BattleSimulationEnhanced;
