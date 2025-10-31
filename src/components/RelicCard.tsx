import { Gem } from "lucide-react";

type RelicData = {
  id: string;
  name: string;
  effect: string;
  description: string;
};

interface RelicCardProps {
  relic: RelicData;
  selected?: boolean;
  onSelect: () => void;
}

export default function RelicCard({ relic, selected, onSelect }: RelicCardProps) {
  return (
    <button
      onClick={onSelect}
      aria-label={`Select ${relic.name} relic${selected ? ' - currently selected' : ''}`}
      aria-pressed={selected}
      className={`
        relative overflow-hidden rounded-xl p-5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${selected 
          ? "bg-card ring-2 ring-accent shadow-[0_0_20px_hsl(var(--accent)/0.3)]" 
          : "bg-card/50 hover:bg-card hover:scale-105"
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-lg transition-colors shrink-0
          ${selected ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}
        `}>
          <Gem className="w-5 h-5" aria-hidden="true" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm mb-1 truncate">{relic.name}</h3>
          <div className="text-xs font-semibold text-accent mb-2">{relic.effect}</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {relic.description}
          </p>
        </div>
      </div>
    </button>
  );
}
