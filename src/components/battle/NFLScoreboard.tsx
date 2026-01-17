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
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "stand": return "STANDOFF";
      case "melee": return "COMBAT";
      case "sudden_death": return "SUDDEN DEATH";
      case "victory": return "VICTORY";
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case "stand": return "bg-muted text-muted-foreground";
      case "melee": return "bg-destructive text-destructive-foreground";
      case "sudden_death": return "bg-warning text-foreground";
      case "victory": return "bg-success text-white";
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Main Scoreboard */}
      <div className="grid grid-cols-3 divide-x divide-border">
        {/* Men Score */}
        <div className="p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Men
          </div>
          <div className="text-4xl font-display text-men">
            {menCount.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {menKills} kills
          </div>
        </div>

        {/* Center - Phase & Time */}
        <div className="p-4 text-center flex flex-col justify-center">
          <div className={`inline-block px-3 py-1 rounded text-xs font-semibold uppercase tracking-wide mb-2 ${getPhaseColor()}`}>
            {getPhaseLabel()}
          </div>
          <div className="flex items-center justify-center gap-1 text-lg font-display">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Women Score */}
        <div className="p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Women
          </div>
          <div className="text-4xl font-display text-women">
            {womenCount.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {womenKills} kills
          </div>
        </div>
      </div>

      {/* Ticker */}
      <div className="px-4 py-2 bg-muted/50 border-t border-border">
        <p className="text-sm text-center text-muted-foreground truncate">
          {currentQuip}
        </p>
      </div>
    </div>
  );
};
