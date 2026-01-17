import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Home, Clock } from "lucide-react";

type VictoryScreenProps = {
  winner: "men" | "women";
  menKills: number;
  womenKills: number;
  battleDuration: number;
  onPlayAgain: () => void;
  onBackHome: () => void;
};

export const VictoryScreen = ({
  winner,
  menKills,
  womenKills,
  battleDuration,
  onPlayAgain,
  onBackHome
}: VictoryScreenProps) => {
  const winnerColor = winner === "men" ? "text-men" : "text-women";
  const winnerBg = winner === "men" ? "bg-men" : "bg-women";

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center space-y-6">
        {/* Trophy */}
        <div className={`w-20 h-20 mx-auto rounded-full ${winnerBg} flex items-center justify-center`}>
          <Trophy className="w-10 h-10 text-white" />
        </div>

        {/* Winner Text */}
        <div>
          <h1 className={`text-3xl font-display uppercase ${winnerColor}`}>
            {winner === "men" ? "Men" : "Women"} Win!
          </h1>
          <p className="text-muted-foreground mt-1">
            Battle Complete
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border ${winner === "men" ? "border-men bg-men/5" : "border-border"}`}>
            <div className="text-2xl font-display text-men">{menKills}</div>
            <div className="text-xs text-muted-foreground uppercase">Men Kills</div>
          </div>
          <div className={`p-4 rounded-lg border ${winner === "women" ? "border-women bg-women/5" : "border-border"}`}>
            <div className="text-2xl font-display text-women">{womenKills}</div>
            <div className="text-xs text-muted-foreground uppercase">Women Kills</div>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            {Math.floor(battleDuration / 60)}m {Math.floor(battleDuration % 60)}s
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={onPlayAgain} className="flex-1 gap-2">
            <RotateCcw className="w-4 h-4" />
            Play Again
          </Button>
          <Button onClick={onBackHome} variant="outline" className="flex-1 gap-2">
            <Home className="w-4 h-4" />
            Home
          </Button>
        </div>
      </div>
    </div>
  );
};
