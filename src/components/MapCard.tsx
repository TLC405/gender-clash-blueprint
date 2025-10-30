import { MapPin } from "lucide-react";

type MapData = {
  id: string;
  name: string;
  objective: string;
  landmark: string;
  description: string;
};

interface MapCardProps {
  map: MapData;
  selected?: boolean;
  onSelect: () => void;
}

export default function MapCard({ map, selected, onSelect }: MapCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300
        ${selected 
          ? "bg-card ring-2 ring-secondary shadow-[0_0_20px_hsl(var(--secondary)/0.3)]" 
          : "bg-card/50 hover:bg-card hover:scale-105"
        }
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`
          p-3 rounded-lg transition-colors shrink-0
          ${selected ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}
        `}>
          <MapPin className="w-6 h-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">{map.name}</h3>
          <div className="text-sm text-secondary font-semibold mb-2">{map.landmark}</div>
          <p className="text-sm text-muted-foreground mb-3">{map.description}</p>
          <div className="inline-block px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
            {map.objective.replace(/_/g, " ")}
          </div>
        </div>
      </div>
    </button>
  );
}
