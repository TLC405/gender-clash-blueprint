import { Link } from "react-router-dom";
import { ArrowLeft, Volume2, Palette, Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import i18n from "@/data/i18n.en.json";

const Settings = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{i18n.settings}</h1>
          <div className="w-20"></div>
        </div>

        <div className="space-y-6">
          {/* Audio Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Volume2 className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-bold">Audio</h2>
            </div>
            <div className="space-y-6">
              <div>
                <Label className="mb-2 block">Master Volume</Label>
                <Slider defaultValue={[75]} max={100} step={1} />
              </div>
              <div>
                <Label className="mb-2 block">Music Volume</Label>
                <Slider defaultValue={[60]} max={100} step={1} />
              </div>
              <div>
                <Label className="mb-2 block">SFX Volume</Label>
                <Slider defaultValue={[80]} max={100} step={1} />
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
                  <Label>Screen Shake</Label>
                  <p className="text-sm text-muted-foreground">
                    Camera effects during impacts
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Particle Effects</Label>
                  <p className="text-sm text-muted-foreground">
                    Visual effects quality
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Motion Blur</Label>
                  <p className="text-sm text-muted-foreground">
                    Blur during rapid movement
                  </p>
                </div>
                <Switch />
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
                  <Label>Colorblind Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Adjust team colors for visibility
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Reduce Flashing</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimize rapid visual changes
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Haptic Feedback</Label>
                  <p className="text-sm text-muted-foreground">
                    Controller vibration (if supported)
                  </p>
                </div>
                <Switch defaultChecked />
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
