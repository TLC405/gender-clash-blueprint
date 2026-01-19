import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import BattleSimulation from "@/components/BattleSimulationEnhanced";
import { TeamPanel } from "@/components/battle/TeamPanel";
import { NFLScoreboard } from "@/components/battle/NFLScoreboard";
import { VictoryScreen } from "@/components/battle/VictoryScreen";
import type { BattlePhase } from "@/lib/battlePhysics";

type Formation = "scatter" | "phalanx" | "wedge" | "shield_wall";

const Index = () => {
  // Battle state
  const [isRunning, setIsRunning] = useState(false);
  const [narratorEnabled, setNarratorEnabled] = useState(true);
  const [battleKey, setBattleKey] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    menAlive: 500,
    womenAlive: 500,
    menKills: 0,
    womenKills: 0,
  });
  const [phase, setPhase] = useState<BattlePhase>("stand");
  const [timeRemaining, setTimeRemaining] = useState(180);
  const [currentQuip, setCurrentQuip] = useState("Ready for battle...");
  const [winner, setWinner] = useState<"men" | "women" | null>(null);
  const [battleDuration, setBattleDuration] = useState(0);
  const [battleStartTime, setBattleStartTime] = useState(0);

  // Men team settings
  const [menArmySize, setMenArmySize] = useState(500);
  const [menFormation, setMenFormation] = useState<Formation>("scatter");
  const [menAggression, setMenAggression] = useState(50);
  const [menSpeed, setMenSpeed] = useState(1);
  const [menRageEnabled, setMenRageEnabled] = useState(false);
  const [menGodMode, setMenGodMode] = useState(false);

  // Women team settings
  const [womenArmySize, setWomenArmySize] = useState(500);
  const [womenFormation, setWomenFormation] = useState<Formation>("scatter");
  const [womenAggression, setWomenAggression] = useState(50);
  const [womenSpeed, setWomenSpeed] = useState(1);
  const [womenRageEnabled, setWomenRageEnabled] = useState(false);
  const [womenGodMode, setWomenGodMode] = useState(false);

  const handleStart = () => {
    if (!isRunning) {
      setBattleStartTime(Date.now());
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setWinner(null);
    setPhase("stand");
    setTimeRemaining(180);
    setCurrentQuip("Ready for battle...");
    setStats({
      menAlive: menArmySize,
      womenAlive: womenArmySize,
      menKills: 0,
      womenKills: 0,
    });
    setBattleKey(prev => prev + 1);
  };

  const handleVictory = useCallback((w: "men" | "women") => {
    setWinner(w);
    setIsRunning(false);
    setBattleDuration((Date.now() - battleStartTime) / 1000);
  }, [battleStartTime]);

  const handlePlayAgain = () => {
    handleReset();
  };

  const handleSpawnMenReinforcements = () => {
    setMenArmySize(prev => Math.min(prev + 100, 5000));
  };

  const handleSpawnWomenReinforcements = () => {
    setWomenArmySize(prev => Math.min(prev + 100, 5000));
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Battle Arena - Top 75% */}
      <main className="h-[75vh] w-full relative">
        <BattleSimulation
          key={battleKey}
          menArmySize={menArmySize}
          womenArmySize={womenArmySize}
          battleSpeed={Math.max(menSpeed, womenSpeed)}
          menRageEnabled={menRageEnabled}
          womenRageEnabled={womenRageEnabled}
          isRunning={isRunning}
          onStatsUpdate={setStats}
          onPhaseChange={setPhase}
          onTimeUpdate={setTimeRemaining}
          onQuipChange={setCurrentQuip}
          onVictory={handleVictory}
          narratorEnabled={narratorEnabled}
        />
        
        {/* Minimal Status Overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/80 px-6 py-2 rounded-lg backdrop-blur-sm border border-border">
          <span className="text-men font-bold text-lg">{stats.menAlive}</span>
          <span className="text-muted-foreground text-sm">vs</span>
          <span className="text-women font-bold text-lg">{stats.womenAlive}</span>
          <span className="mx-2 text-muted-foreground">|</span>
          <span className="text-foreground font-mono">{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
          <span className="mx-2 text-muted-foreground">|</span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{phase}</span>
        </div>
      </main>

      {/* Command Dock - Bottom 25% */}
      <div className="h-[25vh] w-full bg-card border-t border-border flex flex-col">
        {/* Control Row */}
        <div className="flex items-center justify-center gap-3 py-2 border-b border-border">
          <Button
            onClick={handleStart}
            disabled={winner !== null}
            size="sm"
            className="gap-2"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? "Pause" : "Start"}
          </Button>
          <Button onClick={handleReset} variant="outline" size="sm" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            onClick={() => setNarratorEnabled(!narratorEnabled)}
            variant="outline"
            size="icon"
            className="h-8 w-8"
          >
            {narratorEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>

        {/* Team Panels + Scoreboard */}
        <div className="flex-1 flex items-stretch overflow-hidden">
          {/* Women Team */}
          <div className="flex-1 p-3 overflow-y-auto border-r border-border">
            <TeamPanel
              team="women"
              armySize={womenArmySize}
              onArmySizeChange={setWomenArmySize}
              formation={womenFormation}
              onFormationChange={setWomenFormation}
              aggression={womenAggression}
              onAggressionChange={setWomenAggression}
              speed={womenSpeed}
              onSpeedChange={setWomenSpeed}
              rageEnabled={womenRageEnabled}
              onRageToggle={() => setWomenRageEnabled(!womenRageEnabled)}
              godModeEnabled={womenGodMode}
              onGodModeToggle={() => setWomenGodMode(!womenGodMode)}
              onSpawnReinforcements={handleSpawnWomenReinforcements}
              disabled={isRunning}
              compact
            />
          </div>

          {/* Center Scoreboard */}
          <div className="w-80 p-3 flex flex-col justify-center">
            <NFLScoreboard
              menCount={stats.menAlive}
              womenCount={stats.womenAlive}
              menKills={stats.menKills}
              womenKills={stats.womenKills}
              phase={phase}
              timeRemaining={timeRemaining}
              currentQuip={currentQuip}
              compact
            />
          </div>

          {/* Men Team */}
          <div className="flex-1 p-3 overflow-y-auto border-l border-border">
            <TeamPanel
              team="men"
              armySize={menArmySize}
              onArmySizeChange={setMenArmySize}
              formation={menFormation}
              onFormationChange={setMenFormation}
              aggression={menAggression}
              onAggressionChange={setMenAggression}
              speed={menSpeed}
              onSpeedChange={setMenSpeed}
              rageEnabled={menRageEnabled}
              onRageToggle={() => setMenRageEnabled(!menRageEnabled)}
              godModeEnabled={menGodMode}
              onGodModeToggle={() => setMenGodMode(!menGodMode)}
              onSpawnReinforcements={handleSpawnMenReinforcements}
              disabled={isRunning}
              compact
            />
          </div>
        </div>
      </div>

      {/* Victory Screen */}
      {winner && (
        <VictoryScreen
          winner={winner}
          menKills={stats.menKills}
          womenKills={stats.womenKills}
          battleDuration={battleDuration}
          onPlayAgain={handlePlayAgain}
          onBackHome={handleReset}
        />
      )}
    </div>
  );
};

export default Index;
