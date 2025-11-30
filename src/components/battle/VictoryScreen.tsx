import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, RotateCcw, Home, Award, Clock } from "lucide-react";

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
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 bg-gradient-to-b from-black via-[hsl(var(--arena-dark))] to-black backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-hidden"
    >
      {/* Epic Background Effects */}
      <div className="absolute inset-0">
        <div className={`absolute inset-0 ${winner === "men" ? "bg-[hsl(var(--men-primary)_/_0.1)]" : "bg-[hsl(var(--women-primary)_/_0.1)]"}`} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[hsl(var(--gold-epic)_/_0.1)] blur-[100px] animate-pulse-glow" />
      </div>

      <Card className="max-w-3xl w-full p-10 text-center space-y-8 border-4 border-[hsl(var(--gold-epic))] shadow-gold bg-card/95 backdrop-blur-xl relative overflow-hidden">
        {/* Animated border glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(var(--gold-epic)_/_0.3)] to-transparent animate-victory-shine" style={{ backgroundSize: "200% 100%" }} />
        
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.2 
          }}
          className="relative"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-[hsl(var(--gold-epic)_/_0.2)] blur-3xl animate-pulse-glow" />
          </div>
          <Trophy className="w-24 h-24 mx-auto mb-6 text-[hsl(var(--gold-epic))] drop-shadow-[0_0_30px_hsl(var(--gold-epic)_/_0.6)] relative z-10" />
          
          <motion.h1 
            className={`text-6xl font-epic mb-4 relative z-10 ${
              winner === "men" ? "text-neon-blue" : "text-neon-pink"
            } animate-text-glow`}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {winner === "men" ? "MEN VICTORIOUS!" : "WOMEN VICTORIOUS!"}
          </motion.h1>
          
          <motion.p 
            className="text-2xl font-battle text-gold-epic"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            🏆 Epic Battle Complete! 🏆
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 150 }}
          className="grid grid-cols-2 gap-6 py-8"
        >
          <motion.div 
            className={`space-y-3 p-6 rounded-xl border-2 backdrop-blur-sm ${
              winner === "men" 
                ? "bg-[hsl(var(--men-primary)_/_0.2)] border-neon-blue shadow-neon-blue" 
                : "bg-[hsl(var(--men-primary)_/_0.1)] border-[hsl(var(--men-primary)_/_0.3)]"
            }`}
            whileHover={{ scale: 1.05 }}
          >
            <Award className={`w-12 h-12 mx-auto ${winner === "men" ? "text-neon-blue" : "text-[hsl(var(--men-primary))]"}`} />
            <div className={`text-5xl font-epic ${winner === "men" ? "text-neon-blue" : "text-[hsl(var(--men-primary))]"}`}>
              {menKills}
            </div>
            <div className="text-sm font-battle text-muted-foreground tracking-wider">MEN KILLS</div>
          </motion.div>
          
          <motion.div 
            className={`space-y-3 p-6 rounded-xl border-2 backdrop-blur-sm ${
              winner === "women" 
                ? "bg-[hsl(var(--women-primary)_/_0.2)] border-neon-pink shadow-neon-pink" 
                : "bg-[hsl(var(--women-primary)_/_0.1)] border-[hsl(var(--women-primary)_/_0.3)]"
            }`}
            whileHover={{ scale: 1.05 }}
          >
            <Award className={`w-12 h-12 mx-auto ${winner === "women" ? "text-neon-pink" : "text-[hsl(var(--women-primary))]"}`} />
            <div className={`text-5xl font-epic ${winner === "women" ? "text-neon-pink" : "text-[hsl(var(--women-primary))]"}`}>
              {womenKills}
            </div>
            <div className="text-sm font-battle text-muted-foreground tracking-wider">WOMEN KILLS</div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-muted/30 backdrop-blur-sm border border-border"
        >
          <Clock className="w-6 h-6 text-accent" />
          <span className="text-lg font-battle text-foreground">
            Battle Duration: <span className="text-accent">{Math.floor(battleDuration / 60)}m {Math.floor(battleDuration % 60)}s</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex gap-4 justify-center pt-6"
        >
          <Button 
            onClick={onPlayAgain} 
            size="lg" 
            className="gap-3 text-lg font-battle px-8 py-6 bg-men-gradient hover:scale-105 transition-transform shadow-neon-blue border-2 border-[hsl(var(--men-primary))]"
          >
            <RotateCcw className="w-6 h-6" />
            Play Again
          </Button>
          <Button 
            onClick={onBackHome} 
            variant="outline" 
            size="lg" 
            className="gap-3 text-lg font-battle px-8 py-6 hover:scale-105 transition-transform border-2"
          >
            <Home className="w-6 h-6" />
            Back Home
          </Button>
        </motion.div>
      </Card>
    </motion.div>
  );
};