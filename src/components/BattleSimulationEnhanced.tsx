import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Settings2, Volume2, VolumeX, Zap, Sparkles, Flame } from "lucide-react";
import { toast } from "sonner";
import { NFLScoreboard } from "./battle/NFLScoreboard";
import { VictoryScreen } from "./battle/VictoryScreen";
import { FormationOverlay } from "./battle/FormationOverlay";
import { createArenaRenderer } from "./battle/ArenaRenderer";
import { speak, stopSpeaking, type NarratorContext } from "@/utils/battleNarrator";

// High-performance modules
import { createBattleSoA, initializeUnits, type BattleSoA, TEAM_MEN } from "@/lib/battleSoA";
import { createSpatialHashGrid, resizeGrid, type SpatialHashGrid } from "@/lib/spatialHash";
import { createParticlePool, updateParticles, renderParticles, spawnConfetti, spawnMeteorImpact, spawnRageEffect, clearParticles, type ParticlePool } from "@/lib/particlePool";
import { updatePhysics, applyMeteorImpact, DEFAULT_CONFIG, type BattlePhase, type PhysicsConfig } from "@/lib/battlePhysics";
import { renderUnits, initSprites } from "@/lib/spriteRenderer";

import powerupsData from "@/data/powerups.json";

type PowerUp = {
  id: string;
  x: number;
  y: number;
  type: string;
  icon: string;
  color: string;
  spawnTime: number;
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
  const [timeRemaining, setTimeRemaining] = useState(180);
  const [currentQuip, setCurrentQuip] = useState("Prepare for battle!");
  const [menFormationActive, setMenFormationActive] = useState(false);
  const [womenFormationActive, setWomenFormationActive] = useState(false);
  const [battleStartTime, setBattleStartTime] = useState(0);
  
  // Special modes
  const [rageActive, setRageActive] = useState(false);
  const [discoMode, setDiscoMode] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState({
    menAlive: armySize,
    womenAlive: armySize,
    menKills: 0,
    womenKills: 0,
  });

  // High-performance refs (no re-renders on mutation)
  const soaRef = useRef<BattleSoA>(createBattleSoA());
  const gridRef = useRef<SpatialHashGrid | null>(null);
  const poolRef = useRef<ParticlePool>(createParticlePool());
  const powerupsRef = useRef<PowerUp[]>([]);
  const lastTimeRef = useRef<number>(0);
  const phaseTimeRef = useRef<number>(0);
  const arenaRenderer = useRef(createArenaRenderer());
  const globalFrameRef = useRef(0);
  const killStatsRef = useRef({ menKills: 0, womenKills: 0 });

  const speakNarration = useCallback((context: NarratorContext) => {
    const quip = speak(context, narratorEnabled);
    if (quip) setCurrentQuip(quip);
  }, [narratorEnabled]);

  const initializeBattle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Initialize SoA
    initializeUnits(soaRef.current, armySize, width, height);
    
    // Initialize spatial hash
    if (!gridRef.current) {
      gridRef.current = createSpatialHashGrid(width, height, 50);
    } else {
      resizeGrid(gridRef.current, width, height);
    }
    
    // Clear particles
    clearParticles(poolRef.current);
    
    // Reset powerups
    powerupsRef.current = [];
    
    // Reset stats
    killStatsRef.current = { menKills: 0, womenKills: 0 };
    setStats({
      menAlive: armySize,
      womenAlive: armySize,
      menKills: 0,
      womenKills: 0,
    });
    
    setPhase("stand");
    setTimeRemaining(180);
    setRageActive(false);
    phaseTimeRef.current = 0;
    setBattleStartTime(Date.now());
    
    speakNarration("standPhase");
    toast.success(`Battle initialized: ${armySize.toLocaleString()} vs ${armySize.toLocaleString()}`);
  }, [armySize, speakNarration]);

  const spawnPowerUp = useCallback((canvas: HTMLCanvasElement) => {
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
  }, [speakNarration]);

  const handleMeteorClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRunning || phase === "victory") return;
    
    const canvas = canvasRef.current;
    if (!canvas || !gridRef.current) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Apply meteor physics
    applyMeteorImpact(soaRef.current, gridRef.current, x, y, 100, 500);
    
    // Spawn visual effect
    spawnMeteorImpact(poolRef.current, x, y);
    
    toast.info("💥 METEOR STRIKE!");
  }, [isRunning, phase]);

  const toggleRage = useCallback(() => {
    setRageActive(prev => {
      const newState = !prev;
      if (newState) {
        // Spawn rage effects at center
        const canvas = canvasRef.current;
        if (canvas) {
          spawnRageEffect(poolRef.current, canvas.width / 2, canvas.height / 2);
        }
        speakNarration("clash");
        toast.error("🔥 RAGE MODE ACTIVATED!");
      } else {
        toast.info("Rage mode deactivated");
      }
      return newState;
    });
  }, [speakNarration]);

  const updateBattle = useCallback((deltaTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !gridRef.current) return;

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

    // Run physics update
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

    // Update kill stats
    killStatsRef.current.menKills += result.stats.menKills;
    killStatsRef.current.womenKills += result.stats.womenKills;

    // Update state (batched)
    setStats({
      menAlive: result.stats.menAlive,
      womenAlive: result.stats.womenAlive,
      menKills: killStatsRef.current.menKills,
      womenKills: killStatsRef.current.womenKills,
    });

    // Update formation overlays
    if (result.menFormationActive !== menFormationActive) {
      setMenFormationActive(result.menFormationActive);
      if (result.menFormationActive) speakNarration("phalanxForm");
    }
    if (result.womenFormationActive !== womenFormationActive) {
      setWomenFormationActive(result.womenFormationActive);
      if (result.womenFormationActive) speakNarration("phalanxForm");
    }

    // Update particles
    updateParticles(poolRef.current, deltaTime);

    // Check victory
    if (result.stats.menAlive === 0 || result.stats.womenAlive === 0) {
      setIsRunning(false);
      setPhase("victory");
      const winner = result.stats.menAlive > 0 ? "men" : "women";
      speakNarration(winner === "men" ? "victoryMen" : "victoryWomen");
      spawnConfetti(poolRef.current, canvas.width / 2, canvas.height / 2);
    }

    // Announce lead changes
    if (result.stats.menAlive > result.stats.womenAlive && 
        result.stats.menAlive - result.stats.womenAlive > armySize * 0.1) {
      if (Math.random() < 0.01) speakNarration("menLead");
    } else if (result.stats.womenAlive > result.stats.menAlive && 
               result.stats.womenAlive - result.stats.menAlive > armySize * 0.1) {
      if (Math.random() < 0.01) speakNarration("womenLead");
    }
  }, [battleSpeed, phase, armySize, speakNarration, menFormationActive, womenFormationActive, rageActive, spawnPowerUp]);

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
      
      ctx.shadowColor = powerup.color;
      ctx.shadowBlur = 15 * pulse;
      ctx.fillText(powerup.icon, powerup.x, powerup.y);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // Render units using sprite batcher
    globalFrameRef.current++;
    renderUnits(ctx, soaRef.current, discoMode, Math.floor(globalFrameRef.current / 3));

    // Render particles
    renderParticles(ctx, poolRef.current);
    
    // Rage mode overlay
    if (rageActive) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }, [phase, discoMode, rageActive]);

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
    initSprites();
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
        <div className="absolute inset-0 bg-arena-gradient opacity-50" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse-glow" />
        
        <div className="space-y-6 relative">
          <div className="relative" style={{ perspective: '1500px' }}>
            <div className="absolute inset-0 -inset-x-32 -inset-y-20 bg-gradient-to-b from-[hsl(var(--arena-dark))] via-[hsl(var(--background))] to-[hsl(var(--arena-dark))] rounded-3xl opacity-60 blur-sm" 
                 style={{ transform: 'translateZ(-100px) scale(1.2)' }} />
            
            <div 
              className="relative rounded-2xl overflow-visible border-4 border-primary/50 shadow-2xl"
              style={{ 
                transformStyle: 'preserve-3d',
                transform: 'rotateX(25deg) translateY(-40px)',
                transformOrigin: 'center center',
              }}
            >
              <div className="relative bg-black rounded-2xl overflow-hidden" style={{ boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8)' }}>
                <canvas
                  ref={canvasRef}
                  className="w-full h-[600px] cursor-crosshair"
                  onClick={handleMeteorClick}
                  aria-label="TLC Battle Arena - Click to launch meteor strike"
                />
                
                <FormationOverlay
                  menFormationActive={menFormationActive}
                  womenFormationActive={womenFormationActive}
                />

                <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-[hsl(var(--men-primary))] opacity-50" />
                <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-[hsl(var(--women-primary))] opacity-50" />
                <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-[hsl(var(--men-primary))] opacity-50" />
                <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-[hsl(var(--women-primary))] opacity-50" />
                
                {rageActive && (
                  <div className="absolute inset-0 border-4 border-red-500/50 animate-pulse pointer-events-none" />
                )}
              </div>
              
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none rounded-t-2xl" />
            </div>
          </div>

          {/* Controls */}
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
              onClick={toggleRage}
              variant={rageActive ? "destructive" : "outline"}
              size="lg"
              className="gap-2 font-battle text-lg px-6 hover:scale-105 transition-transform border-2"
            >
              <Flame className="w-6 h-6" />
              Rage
            </Button>
            <Button
              onClick={() => setDiscoMode(!discoMode)}
              variant={discoMode ? "default" : "outline"}
              size="lg"
              className={`gap-2 font-battle text-lg px-6 hover:scale-105 transition-transform border-2 ${discoMode ? 'bg-women-gradient' : ''}`}
            >
              <Sparkles className="w-6 h-6" />
              Disco
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
              <div className="text-sm text-muted-foreground font-battle">
                💡 Click on the arena to launch a METEOR STRIKE!
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
