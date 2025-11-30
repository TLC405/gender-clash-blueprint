import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

type BattlePhase = "stand" | "melee" | "sudden_death" | "victory";

type ScoreboardProps = {
  menCount: number;
  womenCount: number;
  menKills: number;
  womenKills: number;
  phase: BattlePhase;
  timeRemaining: number;
  currentQuip?: string;
};

export const NFLScoreboard = ({
  menCount,
  womenCount,
  menKills,
  womenKills,
  phase,
  timeRemaining,
  currentQuip = "Battle in progress..."
}: ScoreboardProps) => {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (phase === "melee") {
      setGlitch(true);
      const timer = setTimeout(() => setGlitch(false), 200);
      return () => clearTimeout(timer);
    } else {
      setGlitch(false);
    }
  }, [phase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      className={`fixed bottom-0 left-0 right-0 bg-arena-gradient text-foreground border-t-4 z-50 overflow-hidden ${
        glitch ? 'animate-glitch border-destructive' : 'border-primary/30'
      }`}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", damping: 20 }}
    >
      {/* Epic Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--men-primary)_/_0.1)] via-transparent to-[hsl(var(--women-primary)_/_0.1)]" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute left-0 top-0 w-1/3 h-full bg-gradient-to-r from-[hsl(var(--men-primary)_/_0.3)] to-transparent" />
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-[hsl(var(--women-primary)_/_0.3)] to-transparent" />
      </div>

      <div className="container mx-auto px-4 py-4 relative">
        <div className="grid grid-cols-3 gap-6 items-center">
          {/* MEN Stats */}
          <motion.div 
            className="flex items-center gap-4"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-men-gradient flex items-center justify-center text-3xl font-epic shadow-neon-blue animate-pulse-glow border-2 border-[hsl(var(--men-primary))]">
                M
              </div>
              <div className="absolute inset-0 rounded-full bg-[hsl(var(--men-primary)_/_0.3)] blur-xl animate-pulse-glow" />
            </div>
            <div>
              <div className="text-xs font-battle text-muted-foreground tracking-wider">MEN</div>
              <div className="text-4xl font-epic text-neon-blue animate-text-glow">{menCount}</div>
              <div className="text-xs text-muted-foreground mt-1">
                <span className="text-neon-blue font-battle">⚔ {menKills}</span> kills
              </div>
            </div>
          </motion.div>

          {/* Center Info */}
          <motion.div 
            className="text-center"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-lg font-battle mb-2 px-4 py-1 rounded-lg bg-card/50 backdrop-blur-sm border border-border">
              {currentQuip}
            </div>
            <div className="flex items-center justify-center gap-6 text-sm font-battle">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 backdrop-blur-sm">
                <Clock className="w-4 h-4 text-accent" />
                <span className="text-accent font-bold">{formatTime(timeRemaining)}</span>
              </div>
              <div className={`px-4 py-1 rounded-full font-epic text-xs backdrop-blur-sm border-2 ${
                phase === "stand" 
                  ? "bg-[hsl(var(--gold-epic)_/_0.2)] border-[hsl(var(--gold-epic))] text-gold-epic shadow-gold" 
                  : phase === "melee" 
                  ? "bg-destructive/20 border-destructive text-destructive animate-battle-pulse" 
                  : phase === "sudden_death"
                  ? "bg-destructive/30 border-destructive text-destructive animate-pulse-glow"
                  : "bg-primary/20 border-primary text-primary"
              }`}>
                {phase === "stand" ? "⚔ STAND" : phase === "melee" ? "💥 MELEE" : phase === "sudden_death" ? "☠ SUDDEN DEATH" : "🏆 VICTORY"}
              </div>
            </div>
          </motion.div>

          {/* WOMEN Stats */}
          <motion.div 
            className="flex items-center justify-end gap-4"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-right">
              <div className="text-xs font-battle text-muted-foreground tracking-wider">WOMEN</div>
              <div className="text-4xl font-epic text-neon-pink animate-text-glow">{womenCount}</div>
              <div className="text-xs text-muted-foreground mt-1">
                <span className="text-neon-pink font-battle">⚔ {womenKills}</span> kills
              </div>
            </div>
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-women-gradient flex items-center justify-center text-3xl font-epic shadow-neon-pink animate-pulse-glow border-2 border-[hsl(var(--women-primary))]">
                W
              </div>
              <div className="absolute inset-0 rounded-full bg-[hsl(var(--women-primary)_/_0.3)] blur-xl animate-pulse-glow" />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};