import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Play, Trophy, Swords, Sparkles, Settings, Shield, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BattleSimulation from "@/components/BattleSimulation";
import i18n from "@/data/i18n.en.json";
import maps from "@/data/maps.json";

const Index = () => {
  const menuItems = useMemo(() => [
    { icon: Play, label: i18n.quick_play, path: "/quick-play", gradient: "from-primary to-accent", ariaLabel: "Navigate to Quick Play mode" },
    { icon: Swords, label: i18n.campaign, path: "/campaign", gradient: "from-accent to-primary", ariaLabel: "Navigate to Campaign mode" },
    { icon: Shield, label: i18n.horde, path: "/horde", gradient: "from-secondary to-accent", ariaLabel: "Navigate to Horde mode" },
    { icon: Trophy, label: i18n.leaderboards, path: "/leaderboards", gradient: "from-accent to-secondary", ariaLabel: "View Leaderboards" },
    { icon: Sparkles, label: i18n.legends, path: "/legends", gradient: "from-primary to-secondary", ariaLabel: "View Legends and Cosmetics" },
    { icon: Settings, label: i18n.settings, path: "/settings", gradient: "from-muted-foreground to-muted-foreground", ariaLabel: "Open Settings" },
  ], []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
              MEN
            </span>
            <span className="text-foreground mx-4">vs</span>
            <span className="bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent animate-pulse">
              WOMEN
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
            {i18n.subtitle}
          </p>

          {/* Current Map Display */}
          <Card className="inline-block px-6 py-3 bg-card/50 border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-accent" aria-hidden="true" />
              <span className="text-sm font-medium">Current Map:</span>
              <span className="text-sm font-bold text-foreground">{maps.maps[0].name}</span>
              <span className="text-xs">({maps.maps[0].objective.replace(/_/g, " ")})</span>
            </div>
          </Card>
        </header>

        {/* Battle Simulation */}
        <section aria-labelledby="battle-section">
          <h2 id="battle-section" className="sr-only">Live Battle Simulation</h2>
          <BattleSimulation />
        </section>

        {/* Menu Grid */}
        <nav className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="navigation" aria-label="Main navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} aria-label={item.ariaLabel}>
                <Button
                  variant="outline"
                  className="w-full h-32 relative overflow-hidden group border-border hover:border-primary/50 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <Icon className="w-8 h-8" aria-hidden="true" />
                    <span className="text-lg font-bold">{item.label}</span>
                  </div>
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} aria-hidden="true"></div>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Link to="/admin">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              {i18n.admin}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
