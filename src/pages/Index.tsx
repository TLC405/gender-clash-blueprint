import { Link } from "react-router-dom";
import { Play, Trophy, Swords, Sparkles, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import i18n from "@/data/i18n.en.json";

const Index = () => {
  const menuItems = [
    { icon: Play, label: i18n.quick_play, path: "/quick-play", gradient: "from-primary to-accent" },
    { icon: Swords, label: i18n.campaign, path: "/campaign", gradient: "from-accent to-primary" },
    { icon: Shield, label: i18n.horde, path: "/horde", gradient: "from-secondary to-accent" },
    { icon: Trophy, label: i18n.leaderboards, path: "/leaderboards", gradient: "from-accent to-secondary" },
    { icon: Sparkles, label: i18n.legends, path: "/legends", gradient: "from-primary to-secondary" },
    { icon: Settings, label: i18n.settings, path: "/settings", gradient: "from-muted-foreground to-muted-foreground" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-block">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-2">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
                MEN
              </span>
              <span className="text-foreground mx-4">vs</span>
              <span className="bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent animate-pulse">
                WOMEN
              </span>
            </h1>
          </div>
          
          <div className="space-y-2">
            <p className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {i18n.subtitle}
            </p>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Competitive arcade warfare in the heart of OKC. Choose your side, master your class, dominate the arena.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-muted-foreground">{i18n.match_duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
              <span className="text-muted-foreground">{i18n.team_size}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
              <span className="text-muted-foreground">{i18n.first_to}</span>
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="outline"
                  className="w-full h-32 relative overflow-hidden group border-border hover:border-primary/50 transition-all duration-300"
                >
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <Icon className="w-8 h-8" />
                    <span className="text-lg font-bold">{item.label}</span>
                  </div>
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                </Button>
              </Link>
            );
          })}
        </div>

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
