import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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

  const getPhaseLabel = () => {
    switch (phase) {
      case "stand": return "⚔️ STAND PHASE";
      case "melee": return "💥 MELEE CHAOS";
      case "sudden_death": return "☠️ SUDDEN DEATH";
      case "victory": return "👑 VICTORY";
      default: return "BATTLE";
    }
  };

  const getPossessionArrow = () => {
    if (menCount > womenCount) return "→";
    if (womenCount > menCount) return "←";
    return "⚡";
  };

  return (
    <motion.div 
      className={`fixed bottom-0 left-0 right-0 h-24 z-50 border-t-2 ${glitch ? 'animate-glitch' : ''}`}
      style={{
        background: 'linear-gradient(90deg, hsl(var(--men-primary)) 0%, hsl(var(--background)) 50%, hsl(var(--women-primary)) 100%)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)'
      }}
      initial={{ y: 100 }} 
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <div className="container mx-auto h-full flex items-center justify-between px-6">
        {/* MEN Stats - Left */}
        <div className="flex items-center gap-4 flex-1">
          <div className="text-6xl">🏈</div>
          <div className="text-left">
            <div className="text-xs uppercase tracking-wider opacity-75">Team MEN</div>
            <div className="text-3xl font-bold" style={{ color: 'hsl(var(--men-accent))' }}>
              {menCount.toLocaleString()}
            </div>
            <div className="text-xs opacity-60">{menKills} KOs</div>
          </div>
        </div>

        {/* Center Info */}
        <div className="flex-1 text-center space-y-1">
          <div className="text-sm font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--foreground))' }}>
            {getPhaseLabel()}
          </div>
          <div className="text-2xl font-mono font-bold" style={{ color: 'hsl(var(--accent))' }}>
            {formatTime(timeRemaining)}
          </div>
          <div className="text-xs px-4 py-1 rounded-full bg-black/30 inline-block max-w-xs truncate">
            {currentQuip}
          </div>
          <div className="text-lg">
            {getPossessionArrow()}
          </div>
        </div>

        {/* WOMEN Stats - Right */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider opacity-75">Team WOMEN</div>
            <div className="text-3xl font-bold" style={{ color: 'hsl(var(--women-accent))' }}>
              {womenCount.toLocaleString()}
            </div>
            <div className="text-xs opacity-60">{womenKills} KOs</div>
          </div>
          <div className="text-6xl">💖</div>
        </div>
      </div>

      {/* Glitch overlay */}
      {glitch && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
          }}
        />
      )}
    </motion.div>
  );
};
