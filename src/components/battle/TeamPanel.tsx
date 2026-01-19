import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Zap, Sparkles, Flame, Shield, Target, Plus, Minus } from "lucide-react";

type Formation = "scatter" | "phalanx" | "wedge" | "shield_wall";

type TeamPanelProps = {
  team: "men" | "women";
  armySize: number;
  onArmySizeChange: (size: number) => void;
  formation: Formation;
  onFormationChange: (formation: Formation) => void;
  aggression: number;
  onAggressionChange: (value: number) => void;
  speed: number;
  onSpeedChange: (value: number) => void;
  rageEnabled: boolean;
  onRageToggle: () => void;
  godModeEnabled: boolean;
  onGodModeToggle: () => void;
  onSpawnReinforcements: () => void;
  disabled: boolean;
  compact?: boolean;
};

export const TeamPanel = ({
  team,
  armySize,
  onArmySizeChange,
  formation,
  onFormationChange,
  aggression,
  onAggressionChange,
  speed,
  onSpeedChange,
  rageEnabled,
  onRageToggle,
  godModeEnabled,
  onGodModeToggle,
  onSpawnReinforcements,
  disabled,
  compact = false
}: TeamPanelProps) => {
  const isMen = team === "men";
  const teamColor = isMen ? "text-men" : "text-women";
  const bgColor = isMen ? "bg-men" : "bg-women";

  const incrementArmy = () => onArmySizeChange(Math.min(armySize + 100, 5000));
  const decrementArmy = () => onArmySizeChange(Math.max(armySize - 100, 100));

  if (compact) {
    return (
      <div className="h-full flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Users className={`w-4 h-4 ${teamColor}`} />
          <span className={`text-sm font-semibold uppercase ${teamColor}`}>
            {isMen ? "Men" : "Women"}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Army Size */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={decrementArmy} disabled={disabled || armySize <= 100} className="h-6 w-6">
              <Minus className="w-3 h-3" />
            </Button>
            <span className={`font-display ${teamColor}`}>{armySize}</span>
            <Button variant="ghost" size="icon" onClick={incrementArmy} disabled={disabled || armySize >= 5000} className="h-6 w-6">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          {/* Formation */}
          <Select value={formation} onValueChange={(v) => onFormationChange(v as Formation)} disabled={disabled}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scatter">Scatter</SelectItem>
              <SelectItem value="phalanx">Phalanx</SelectItem>
              <SelectItem value="wedge">Wedge</SelectItem>
              <SelectItem value="shield_wall">Shield Wall</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Speed */}
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-muted-foreground" />
            <Slider value={[speed]} onValueChange={(v) => onSpeedChange(v[0])} min={0.5} max={3} step={0.5} disabled={disabled} className="flex-1" />
            <span className="text-muted-foreground w-6">{speed}x</span>
          </div>
          
          {/* Rage + God */}
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-destructive" />
            <Switch checked={rageEnabled} onCheckedChange={onRageToggle} disabled={disabled} className="scale-75" />
            <Shield className="w-3 h-3 text-warning ml-1" />
            <Switch checked={godModeEnabled} onCheckedChange={onGodModeToggle} disabled={disabled} className="scale-75" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 ${bgColor} text-white`}>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h2 className="text-lg font-display uppercase tracking-wide">
            {isMen ? "Men" : "Women"}
          </h2>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* Army Size */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Army Size
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={decrementArmy}
              disabled={disabled || armySize <= 100}
              className="h-8 w-8"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className={`flex-1 text-center text-2xl font-display ${teamColor}`}>
              {armySize.toLocaleString()}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={incrementArmy}
              disabled={disabled || armySize >= 5000}
              className="h-8 w-8"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Formation */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Formation
          </Label>
          <Select
            value={formation}
            onValueChange={(v) => onFormationChange(v as Formation)}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scatter">Scatter</SelectItem>
              <SelectItem value="phalanx">Phalanx</SelectItem>
              <SelectItem value="wedge">Wedge</SelectItem>
              <SelectItem value="shield_wall">Shield Wall</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Aggression */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Aggression
            </Label>
            <span className="text-sm font-medium">{aggression}%</span>
          </div>
          <Slider
            value={[aggression]}
            onValueChange={(v) => onAggressionChange(v[0])}
            min={0}
            max={100}
            step={10}
            disabled={disabled}
          />
        </div>

        {/* Speed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Speed
            </Label>
            <span className="text-sm font-medium">{speed}x</span>
          </div>
          <Slider
            value={[speed]}
            onValueChange={(v) => onSpeedChange(v[0])}
            min={0.5}
            max={3}
            step={0.5}
            disabled={disabled}
          />
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-4">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cheats
          </Label>
        </div>

        {/* Rage Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium">Rage Mode</span>
          </div>
          <Switch
            checked={rageEnabled}
            onCheckedChange={onRageToggle}
            disabled={disabled}
          />
        </div>

        {/* God Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium">God Mode</span>
          </div>
          <Switch
            checked={godModeEnabled}
            onCheckedChange={onGodModeToggle}
            disabled={disabled}
          />
        </div>

        {/* Spawn Reinforcements */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={onSpawnReinforcements}
          disabled={disabled}
        >
          <Target className="w-4 h-4" />
          +100 Reinforcements
        </Button>
      </div>
    </div>
  );
};
