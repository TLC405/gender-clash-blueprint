import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";

type FormationOverlayProps = {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  menFormationActive: boolean;
  womenFormationActive: boolean;
  centerX: number;
  passWidth: number;
};

export const FormationOverlay = ({
  canvasRef,
  menFormationActive,
  womenFormationActive,
  centerX,
  passWidth
}: FormationOverlayProps) => {
  if (!canvasRef.current) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Hot Gates Pass Indicator - Epic Central Zone */}
      <motion.div
        className="absolute top-0 bottom-0 border-l-4 border-r-4 border-[hsl(var(--gold-epic))] bg-[hsl(var(--gold-epic)_/_0.05)]"
        style={{
          left: `${centerX - passWidth / 2}px`,
          width: `${passWidth}px`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--gold-epic)_/_0.2)] via-transparent to-[hsl(var(--gold-epic)_/_0.2)] animate-pulse-glow" />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gold-epic text-xl font-epic whitespace-nowrap px-6 py-3 rounded-full bg-card/80 backdrop-blur-sm border-2 border-[hsl(var(--gold-epic))] shadow-gold"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ⚔ HOT GATES PASS ⚔
        </motion.div>
        
        {/* Vertical scanning lines effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(var(--gold-epic)_/_0.3)] to-transparent"
          animate={{ y: ["-100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ height: "50%" }}
        />
      </motion.div>

      {/* MEN Formation Indicator - Epic Shield Lock */}
      <AnimatePresence>
        {menFormationActive && (
          <motion.div
            initial={{ opacity: 0, x: -50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="absolute top-8 left-8 bg-[hsl(var(--men-primary)_/_0.3)] backdrop-blur-md px-6 py-4 rounded-2xl border-4 border-neon-blue shadow-neon-blue"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Shield className="w-8 h-8 text-neon-blue drop-shadow-[0_0_10px_hsl(var(--men-primary))]" />
              </motion.div>
              <div>
                <div className="text-lg font-epic text-neon-blue animate-text-glow">MEN PHALANX</div>
                <div className="text-xs font-battle text-[hsl(var(--men-glow))]">⚔ LOCKED ⚔</div>
              </div>
            </div>
            <motion.div 
              className="absolute inset-0 rounded-2xl border-2 border-[hsl(var(--men-primary))]"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* WOMEN Formation Indicator - Epic Shield Lock */}
      <AnimatePresence>
        {womenFormationActive && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="absolute top-8 right-8 bg-[hsl(var(--women-primary)_/_0.3)] backdrop-blur-md px-6 py-4 rounded-2xl border-4 border-neon-pink shadow-neon-pink"
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="text-lg font-epic text-neon-pink animate-text-glow text-right">WOMEN PHALANX</div>
                <div className="text-xs font-battle text-[hsl(var(--women-glow))] text-right">⚔ LOCKED ⚔</div>
              </div>
              <motion.div
                animate={{ rotate: [0, -360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Shield className="w-8 h-8 text-neon-pink drop-shadow-[0_0_10px_hsl(var(--women-primary))]" />
              </motion.div>
            </div>
            <motion.div 
              className="absolute inset-0 rounded-2xl border-2 border-[hsl(var(--women-primary))]"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};