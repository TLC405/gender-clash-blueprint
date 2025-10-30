import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import config from "@/data/config.json";

const Admin = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [matchSeconds, setMatchSeconds] = useState(config.matchSeconds);
  const [teamSize, setTeamSize] = useState(config.defaultTeamSize);

  const handleUnlock = () => {
    if (pin === "1234") {
      setIsUnlocked(true);
      toast.success("Admin panel unlocked");
    } else {
      toast.error("Invalid PIN");
    }
  };

  const handleSave = () => {
    toast.success("Settings saved (demo only - not persisted)");
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md p-8">
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">Admin Panel</h1>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pin">Enter Admin PIN</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="Enter PIN"
                className="mt-2"
              />
            </div>
            <Button onClick={handleUnlock} className="w-full">
              Unlock
            </Button>
            <div className="text-center">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Demo PIN: 1234
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings2 className="w-8 h-8 text-accent" />
            Admin Panel
          </h1>
          <Button
            variant="ghost"
            onClick={() => setIsUnlocked(false)}
          >
            <Lock className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Team Configuration */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Team Configuration</h2>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Active Sides</span>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                      Men
                    </span>
                    <span className="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-sm">
                      Women
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Locked to Men vs Women only — cannot be modified
                </p>
              </div>
            </div>
          </Card>

          {/* Match Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Match Settings</h2>
            <div className="space-y-6">
              <div>
                <Label className="mb-2 block">
                  Match Duration: {matchSeconds}s ({Math.floor(matchSeconds / 60)}:{(matchSeconds % 60).toString().padStart(2, '0')})
                </Label>
                <Slider
                  value={[matchSeconds]}
                  onValueChange={([val]) => setMatchSeconds(val)}
                  min={120}
                  max={480}
                  step={30}
                />
              </div>

              <div>
                <Label className="mb-2 block">Team Size: {teamSize}v{teamSize}</Label>
                <div className="flex gap-2">
                  {[3, 5].map((size) => (
                    <Button
                      key={size}
                      variant={teamSize === size ? "default" : "outline"}
                      onClick={() => setTeamSize(size)}
                    >
                      {size}v{size}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Scoring Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Scoring Configuration</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>KO Points</Label>
                <Input type="number" defaultValue={config.score.ko} className="mt-2" />
              </div>
              <div>
                <Label>Assist Points</Label>
                <Input type="number" defaultValue={config.score.assist} className="mt-2" />
              </div>
              <div>
                <Label>Objective Pts/Sec</Label>
                <Input type="number" defaultValue={config.score.objPerSecond} className="mt-2" />
              </div>
              <div>
                <Label>Streak Bonus Step</Label>
                <Input type="number" defaultValue={config.score.streakStep} className="mt-2" />
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} className="w-full" size="lg">
            Save Configuration
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            Note: In production, changes would persist to localStorage or backend
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
