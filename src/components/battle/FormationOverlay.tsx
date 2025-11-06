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

  const canvas = canvasRef.current;
  const passLeft = centerX - passWidth / 2;
  const passRight = centerX + passWidth / 2;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Hot Gates Pass Indicator */}
      <div
        className="absolute top-0 bottom-0 border-l-2 border-r-2 border-dashed opacity-30"
        style={{
          left: `${(passLeft / canvas.width) * 100}%`,
          width: `${(passWidth / canvas.width) * 100}%`,
          borderColor: 'hsl(var(--accent))'
        }}
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs uppercase tracking-wider opacity-60 bg-black/50 px-3 py-1 rounded">
          ⚔️ Hot Gates Pass
        </div>
      </div>

      {/* MEN Formation Indicator */}
      {menFormationActive && (
        <div 
          className="absolute top-4 left-4 px-4 py-2 rounded-lg border-2 animate-pulse"
          style={{
            background: 'hsl(var(--men-primary) / 0.2)',
            borderColor: 'hsl(var(--men-primary))',
            boxShadow: 'var(--shadow-neon-blue)'
          }}
        >
          <div className="text-sm font-bold" style={{ color: 'hsl(var(--men-primary))' }}>
            🛡️ MEN PHALANX LOCKED
          </div>
          <div className="text-xs opacity-75">+50% Defense</div>
        </div>
      )}

      {/* WOMEN Formation Indicator */}
      {womenFormationActive && (
        <div 
          className="absolute top-4 right-4 px-4 py-2 rounded-lg border-2 animate-pulse"
          style={{
            background: 'hsl(var(--women-primary) / 0.2)',
            borderColor: 'hsl(var(--women-primary))',
            boxShadow: 'var(--shadow-neon-pink)'
          }}
        >
          <div className="text-sm font-bold" style={{ color: 'hsl(var(--women-primary))' }}>
            💞 WOMEN PHALANX LOCKED
          </div>
          <div className="text-xs opacity-75">+50% Defense</div>
        </div>
      )}
    </div>
  );
};
