import teams from "@/data/teams.json";
import { Swords } from "lucide-react";

type Side = "men" | "women";

interface TeamSelectProps {
  onPick: (teamId: Side) => void;
}

export default function TeamSelect({ onPick }: TeamSelectProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Swords className="w-8 h-8 text-accent" />
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Choose Your Side
          </h2>
          <Swords className="w-8 h-8 text-secondary" />
        </div>
        <p className="text-muted-foreground text-lg">The battle begins now</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {teams.teams.map((t) => {
          const isMen = t.id === "men";
          return (
            <button
              key={t.id}
              onClick={() => onPick(t.id as Side)}
              className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              style={{
                background: `linear-gradient(135deg, ${t.palette.primary}, ${t.palette.accent})`,
                boxShadow: isMen 
                  ? "0 0 30px hsla(207, 90%, 54%, 0.4)" 
                  : "0 0 30px hsla(338, 78%, 60%, 0.4)"
              }}
            >
              <div className="relative z-10">
                <div className="text-4xl font-black text-white mb-2 tracking-tight">
                  {t.name}
                </div>
                <div className="text-white/90 text-sm font-medium mb-4">
                  Join Team {t.name}
                </div>
                <div className="h-px bg-white/20 mb-4"></div>
                <div className="text-white/70 text-xs uppercase tracking-wider">
                  Men vs Women Only
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        All classes and abilities are balanced — side differences are cosmetic only
      </div>
    </div>
  );
}
