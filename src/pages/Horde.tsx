import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Zap, Play, Pause, RotateCcw, Volume2, VolumeX, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BattleSimulation from "@/components/BattleSimulationEnhanced";
import { NFLScoreboard } from "@/components/battle/NFLScoreboard";
import { VictoryScreen } from "@/components/battle/VictoryScreen";
import type { BattlePhase } from "@/lib/battlePhysics";

type HordeTeam = "men" | "women";

const WAVE_CONFIGS = [
  { wave: 1, defenders: 500, attackers: 100 },
  { wave: 2, defenders: 500, attackers: 200 },
  { wave: 3, defenders: 500, attackers: 350 },
  { wave: 4, defenders: 500, attackers: 500 },
  { wave: 5, defenders: 500, attackers: 750 },
  { wave: 6, defenders: 500, attackers: 1000 },
  { wave: 7, defenders: 500, attackers: 1500 },
  { wave: 8, defenders: 500, attackers: 2000 },
  { wave: 9, defenders: 500, attackers: 3000 },
  { wave: 10, defenders: 500, attackers: 5000 },
];

const Horde = () => {
  const [selectedTeam, setSelectedTeam] = useState<HordeTeam | null>(null);
  const [wave, setWave] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [narratorEnabled, setNarratorEnabled] = useState(true);
  const [battleKey, setBattleKey] = useState(0);
  const [winner, setWinner] = useState<"men" | "women" | null>(null);
  const [battleDuration, setBattleDuration] = useState(0);
  const [battleStartTime, setBattleStartTime] = useState(0);
  const [highestWave, setHighestWave] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [stats, setStats] = useState({ menAlive: 0, womenAlive: 0, menKills: 0, womenKills: 0 });
  const [phase, setPhase] = useState<BattlePhase>("stand");
  const [timeRemaining, setTimeRemaining] = useState(180);
  const [currentQuip, setCurrentQuip] = useState("Ready for battle...");

  const waveConfig = WAVE_CONFIGS[Math.min(wave - 1, WAVE_CONFIGS.length - 1)];
  const defenderSize = waveConfig.defenders;
  const attackerSize = waveConfig.attackers;

  const menSize = selectedTeam === "men" ? defenderSize : attackerSize;
  const womenSize = selectedTeam === "women" ? defenderSize : attackerSize;

  const handleSelectTeam = (team: HordeTeam) => {
    setSelectedTeam(team);
    setWave(1);
    setGameOver(false);
    setWinner(null);
    setBattleKey(prev => prev + 1);
    setStats({ menAlive: 500, womenAlive: 100, menKills: 0, womenKills: 0 });
  };

  const handleStart = () => {
    if (!isRunning) setBattleStartTime(Date.now());
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setWinner(null);
    setPhase("stand");
    setTimeRemaining(180);
    setCurrentQuip("Ready for battle...");
    setBattleKey(prev => prev + 1);
  };

  const handleVictory = useCallback((w: "men" | "women") => {
    setWinner(w);
    setIsRunning(false);
    setBattleDuration((Date.now() - battleStartTime) / 1000);

    const defenderWon = w === selectedTeam;
    if (defenderWon) {
      const nextWave = wave + 1;
      setHighestWave(prev => Math.max(prev, wave));
      if (nextWave > WAVE_CONFIGS.length) {
        setGameOver(true);
      }
    } else {
      setGameOver(true);
      setHighestWave(prev => Math.max(prev, wave - 1));
    }
  }, [battleStartTime, selectedTeam, wave]);

  const handleNextWave = () => {
    const nextWave = wave + 1;
    setWave(nextWave);
    setWinner(null);
    setPhase("stand");
    setTimeRemaining(180);
    setCurrentQuip(`Wave ${nextWave} incoming!`);
    setBattleKey(prev => prev + 1);
    setIsRunning(false);
  };

  const handleRestart = () => {
    setWave(1);
    setGameOver(false);
    setWinner(null);
    setIsRunning(false);
    setBattleKey(prev => prev + 1);
  };

  // Team selection screen
  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="w-8 h-8 text-accent" />
              Horde Mode
            </h1>
            <div className="w-20" />
          </header>

          <section className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Survive 10 Waves</h2>
            <p className="text-muted-foreground">
              Your team of 500 defenders faces escalating hordes — starting at 100, ending at 5,000
            </p>
          </section>

          {highestWave > 0 && (
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">Best: Wave {highestWave}</span>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card
              className="p-8 border-primary/30 hover:border-primary transition-all duration-200 cursor-pointer group"
              onClick={() => handleSelectTeam("men")}
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-primary">Defend as Men</h3>
                <p className="text-muted-foreground text-sm">
                  500 men hold off waves of women — starting 100, scaling to 5,000
                </p>
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Play as Men
                </Button>
              </div>
            </Card>

            <Card
              className="p-8 border-secondary/30 hover:border-secondary transition-all duration-200 cursor-pointer group"
              onClick={() => handleSelectTeam("women")}
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-2xl font-bold text-secondary">Defend as Women</h3>
                <p className="text-muted-foreground text-sm">
                  500 women hold off waves of men — starting 100, scaling to 5,000
                </p>
                <Button className="w-full bg-secondary hover:bg-secondary/90">
                  Play as Women
                </Button>
              </div>
            </Card>
          </div>

          <Card className="p-6 bg-muted/20">
            <h3 className="font-bold mb-3">Wave Progression</h3>
            <div className="grid grid-cols-5 gap-2">
              {WAVE_CONFIGS.map(w => (
                <div key={w.wave} className="text-center text-sm">
                  <div className="font-semibold text-xs text-muted-foreground">W{w.wave}</div>
                  <div className="text-xs">{w.attackers >= 1000 ? `${w.attackers/1000}k` : w.attackers}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Game over screen
  if (gameOver) {
    const survivedAllWaves = wave > WAVE_CONFIGS.length;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="text-6xl">{survivedAllWaves ? "🏆" : "💀"}</div>
          <h2 className="text-3xl font-bold">
            {survivedAllWaves ? "You Won!" : "Game Over"}
          </h2>
          <p className="text-muted-foreground">
            {survivedAllWaves
              ? "Incredible! You survived all 10 waves!"
              : `Your defenders fell on Wave ${wave}`}
          </p>
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{highestWave}</div>
            <div className="text-sm text-muted-foreground">Highest Wave</div>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleRestart}>Play Again</Button>
            <Button variant="outline" className="flex-1" onClick={() => setSelectedTeam(null)}>
              Change Team
            </Button>
            <Link to="/" className="flex-1">
              <Button variant="ghost" className="w-full">Home</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Battle screen
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Arena */}
      <main className="h-[75vh] w-full relative">
        <BattleSimulation
          key={battleKey}
          menArmySize={menSize}
          womenArmySize={womenSize}
          battleSpeed={1}
          menRageEnabled={false}
          womenRageEnabled={false}
          isRunning={isRunning}
          onStatsUpdate={setStats}
          onPhaseChange={setPhase}
          onTimeUpdate={setTimeRemaining}
          onQuipChange={setCurrentQuip}
          onVictory={handleVictory}
          narratorEnabled={narratorEnabled}
        />

        {/* Wave + status overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/80 px-6 py-2 rounded-lg backdrop-blur-sm border border-border">
          <span className="text-xs uppercase tracking-wider text-accent font-bold">Wave {wave}/10</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-men font-bold">{stats.menAlive.toLocaleString()}</span>
          <span className="text-muted-foreground text-sm">vs</span>
          <span className="text-women font-bold">{stats.womenAlive.toLocaleString()}</span>
          <span className="text-muted-foreground">|</span>
          <span className="font-mono">{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
        </div>

        {/* Defender indicator */}
        <div className="absolute top-4 left-4 bg-background/80 px-3 py-1.5 rounded border border-border text-xs">
          <span className="text-muted-foreground">Defending: </span>
          <span className={selectedTeam === "men" ? "text-men font-bold" : "text-women font-bold"}>
            {selectedTeam === "men" ? "Men" : "Women"} ({defenderSize})
          </span>
          <span className="text-muted-foreground"> vs </span>
          <span className="font-semibold">{attackerSize.toLocaleString()} attackers</span>
        </div>
      </main>

      {/* Command Dock */}
      <div className="h-[25vh] w-full bg-card border-t border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Link to="/horde">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Waves
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleStart} disabled={winner !== null} size="sm" className="gap-2">
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Restart Wave
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
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm">Best: Wave {highestWave}</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-3">
          <div className="w-80">
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
        </div>
      </div>

      {/* Victory Screen with next wave option */}
      {winner && !gameOver && (
        <div className="fixed inset-0 bg-background/90 flex items-center justify-center z-50">
          <Card className="p-8 max-w-md w-full text-center space-y-4">
            <div className="text-5xl">{winner === selectedTeam ? "✅" : "❌"}</div>
            <h2 className="text-2xl font-bold">
              {winner === selectedTeam ? `Wave ${wave} Cleared!` : "Defenders Eliminated!"}
            </h2>
            <p className="text-muted-foreground">
              {winner === selectedTeam
                ? `${stats.menAlive + stats.womenAlive} defenders survived`
                : `Fell to the Wave ${wave} horde of ${attackerSize.toLocaleString()}`}
            </p>
            {winner === selectedTeam && wave < WAVE_CONFIGS.length ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Next: Wave {wave + 1} — {WAVE_CONFIGS[wave].attackers.toLocaleString()} attackers
                </div>
                <Button className="w-full" onClick={handleNextWave}>
                  Next Wave →
                </Button>
              </div>
            ) : winner === selectedTeam && wave >= WAVE_CONFIGS.length ? (
              <Button className="w-full" onClick={() => setGameOver(true)}>
                Claim Victory 🏆
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleRestart}>Try Again</Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelectedTeam(null)}>
                  Menu
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default Horde;
