import { Shield, Zap, Brain, Heart, Sparkles } from "lucide-react";

type ClassData = {
  id: string;
  name: string;
  role: string;
  description: string;
  abilities: string[];
};

interface ClassCardProps {
  classData: ClassData;
  selected?: boolean;
  onSelect: () => void;
}

const roleIcons = {
  tank: Shield,
  dps: Zap,
  utility: Brain,
  healer: Heart,
  chaos: Sparkles,
};

export default function ClassCard({ classData, selected, onSelect }: ClassCardProps) {
  const Icon = roleIcons[classData.role as keyof typeof roleIcons] || Shield;

  return (
    <button
      onClick={onSelect}
      className={`
        relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300
        ${selected 
          ? "bg-card ring-2 ring-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]" 
          : "bg-card/50 hover:bg-card hover:scale-105"
        }
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`
          p-3 rounded-lg transition-colors
          ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
        `}>
          <Icon className="w-6 h-6" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">{classData.name}</h3>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {classData.role}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {classData.description}
          </p>
          
          <div className="flex flex-wrap gap-1">
            {classData.abilities.map((ability) => (
              <span 
                key={ability}
                className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground"
              >
                {ability.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
