import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Volume2, Palette, Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import i18n from "@/data/i18n.en.json";

interface SettingsState {
  audio: {
    master: number;
    music: number;
    sfx: number;
  };
  visual: {
    screenShake: boolean;
    particleEffects: boolean;
    motionBlur: boolean;
  };
  accessibility: {
    colorblindMode: boolean;
    reduceFlashing: boolean;
    hapticFeedback: boolean;
  };
}

const defaultSettings: SettingsState = {
  audio: { master: 75, music: 60, sfx: 80 },
  visual: { screenShake: true, particleEffects: true, motionBlur: false },
  accessibility: { colorblindMode: false, reduceFlashing: false, hapticFeedback: true },
};

const Settings = () => {
  const [settings, setSettings] = useLocalStorage<SettingsState>("tlc-settings", defaultSettings);

  const updateSetting = useCallback(
    (category: keyof SettingsState, key: string, value: number | boolean) => {
      setSettings((prev) => ({
        ...prev,
        [category]: { ...prev[category], [key]: value },
      }));
      toast.success("Setting updated");
    },
    [setSettings]
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    toast.success("Settings reset to defaults");
  }, [setSettings]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link to="/" aria-label="Back to home">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{i18n.settings}</h1>
          <Button variant="ghost" size="sm" onClick={resetSettings} aria-label="Reset all settings to defaults">
            Reset
          </Button>
        </header>

        <div className="space-y-6">
          {/* Audio Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Volume2 className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-bold">Audio</h2>
            </div>
            <div className="space-y-6">
              <div>
                <Label htmlFor="master-volume" className="mb-2 block">
                  Master Volume: {settings.audio.master}%
                </Label>
                <Slider
                  id="master-volume"
                  value={[settings.audio.master]}
                  onValueChange={([val]) => updateSetting("audio", "master", val)}
                  max={100}
                  step={1}
                  aria-label="Master volume control"
                />
              </div>
              <div>
                <Label htmlFor="music-volume" className="mb-2 block">
                  Music Volume: {settings.audio.music}%
                </Label>
                <Slider
                  id="music-volume"
                  value={[settings.audio.music]}
                  onValueChange={([val]) => updateSetting("audio", "music", val)}
                  max={100}
                  step={1}
                  aria-label="Music volume control"
                />
              </div>
              <div>
                <Label htmlFor="sfx-volume" className="mb-2 block">
                  SFX Volume: {settings.audio.sfx}%
                </Label>
                <Slider
                  id="sfx-volume"
                  value={[settings.audio.sfx]}
                  onValueChange={([val]) => updateSetting("audio", "sfx", val)}
                  max={100}
                  step={1}
                  aria-label="Sound effects volume control"
                />
              </div>
            </div>
          </Card>

          {/* Visual Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-bold">Visual</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="screen-shake">Screen Shake</Label>
                  <p className="text-sm text-muted-foreground">
                    Camera effects during impacts
                  </p>
                </div>
                <Switch
                  id="screen-shake"
                  checked={settings.visual.screenShake}
                  onCheckedChange={(val) => updateSetting("visual", "screenShake", val)}
                  aria-label="Toggle screen shake effects"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="particle-effects">Particle Effects</Label>
                  <p className="text-sm text-muted-foreground">
                    Visual effects quality
                  </p>
                </div>
                <Switch
                  id="particle-effects"
                  checked={settings.visual.particleEffects}
                  onCheckedChange={(val) => updateSetting("visual", "particleEffects", val)}
                  aria-label="Toggle particle effects"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="motion-blur">Motion Blur</Label>
                  <p className="text-sm text-muted-foreground">
                    Blur during rapid movement
                  </p>
                </div>
                <Switch
                  id="motion-blur"
                  checked={settings.visual.motionBlur}
                  onCheckedChange={(val) => updateSetting("visual", "motionBlur", val)}
                  aria-label="Toggle motion blur"
                />
              </div>
            </div>
          </Card>

          {/* Accessibility */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Accessibility className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-bold">Accessibility</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="colorblind-mode">Colorblind Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Adjust team colors for visibility
                  </p>
                </div>
                <Switch
                  id="colorblind-mode"
                  checked={settings.accessibility.colorblindMode}
                  onCheckedChange={(val) => updateSetting("accessibility", "colorblindMode", val)}
                  aria-label="Toggle colorblind mode"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="reduce-flashing">Reduce Flashing</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimize rapid visual changes
                  </p>
                </div>
                <Switch
                  id="reduce-flashing"
                  checked={settings.accessibility.reduceFlashing}
                  onCheckedChange={(val) => updateSetting("accessibility", "reduceFlashing", val)}
                  aria-label="Toggle flashing reduction"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="haptic-feedback">Haptic Feedback</Label>
                  <p className="text-sm text-muted-foreground">
                    Controller vibration (if supported)
                  </p>
                </div>
                <Switch
                  id="haptic-feedback"
                  checked={settings.accessibility.hapticFeedback}
                  onCheckedChange={(val) => updateSetting("accessibility", "hapticFeedback", val)}
                  aria-label="Toggle haptic feedback"
                />
              </div>
            </div>
          </Card>

          {/* Game Info */}
          <Card className="p-6 bg-muted/20">
            <div className="text-center space-y-2">
              <h3 className="font-bold">MEN vs WOMEN — TLC Battle</h3>
              <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              <p className="text-xs text-muted-foreground">
                © 2025 TLC Gaming. OKC Themed Arena Combat.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
