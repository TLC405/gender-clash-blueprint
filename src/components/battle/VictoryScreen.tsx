import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Home } from "lucide-react";

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
  const winnerColor = winner === "men" 
    ? "hsl(var(--men-primary))" 
    : "hsl(var(--women-primary))";
  
  const winnerGradient = winner === "men"
    ? "var(--gradient-men)"
    : "var(--gradient-women)";

  const winnerEmoji = winner === "men" ? "🏈💪" : "💖✨";
  const winnerTitle = winner === "men" ? "TEAM MEN WINS!" : "TEAM WOMEN WINS!";
  const winnerSubtext = winner === "men" 
    ? "Bro power prevails! Ultimate chest bumps all around!" 
    : "Girl power supreme! Squad goals achieved forever!";

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(10px)'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="max-w-2xl w-full space-y-8 text-center"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
      >
        {/* Trophy Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 150, delay: 0.4 }}
        >
          <Trophy 
            className="w-32 h-32 mx-auto mb-4" 
            style={{ color: winnerColor }}
          />
        </motion.div>

        {/* Winner Announcement */}
        <div className="space-y-4">
          <motion.div
            className="text-8xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.6 }}
          >
            {winnerEmoji}
          </motion.div>

          <motion.h1
            className="text-6xl font-bold tracking-tight"
            style={{ 
              background: winnerGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            {winnerTitle}
          </motion.h1>

          <motion.p
            className="text-xl opacity-80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
          >
            {winnerSubtext}
          </motion.p>
        </div>

        {/* Battle Stats */}
        <motion.div
          className="grid grid-cols-3 gap-6 py-8 px-6 rounded-2xl border-2"
          style={{ 
            borderColor: winnerColor,
            background: 'rgba(255, 255, 255, 0.05)'
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <div className="space-y-2">
            <div className="text-sm uppercase tracking-wide opacity-60">MEN KOs</div>
            <div className="text-4xl font-bold" style={{ color: 'hsl(var(--men-primary))' }}>
              {menKills}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm uppercase tracking-wide opacity-60">Duration</div>
            <div className="text-4xl font-bold" style={{ color: 'hsl(var(--accent))' }}>
              {formatDuration(battleDuration)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm uppercase tracking-wide opacity-60">WOMEN KOs</div>
            <div className="text-4xl font-bold" style={{ color: 'hsl(var(--women-primary))' }}>
              {womenKills}
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          <Button
            onClick={onPlayAgain}
            size="lg"
            className="px-8 py-6 text-lg"
            style={{
              background: winnerGradient,
              color: 'white'
            }}
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Battle Again
          </Button>

          <Button
            onClick={onBackHome}
            size="lg"
            variant="outline"
            className="px-8 py-6 text-lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Home
          </Button>
        </motion.div>

        {/* Celebration Text */}
        <motion.div
          className="text-sm opacity-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.6 }}
        >
          "This is Sparta... with feelings!" 💕⚔️
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
