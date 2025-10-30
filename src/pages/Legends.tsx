import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import i18n from "@/data/i18n.en.json";

const Legends = () => {
  const cosmetics = useMemo(() => ({
    men: [
      { id: "thunder-elite", name: "Thunder Elite", type: "Skin", unlocked: true, level: 1 },
      { id: "okc-champion", name: "OKC Champion", type: "Skin", unlocked: true, level: 5 },
      { id: "neon-warrior", name: "Neon Warrior", type: "Skin", unlocked: false, level: 10 },
      { id: "blue-lightning", name: "Blue Lightning", type: "Emblem", unlocked: true, level: 1 },
    ],
    women: [
      { id: "storm-elite", name: "Storm Elite", type: "Skin", unlocked: true, level: 1 },
      { id: "phoenix-champion", name: "Phoenix Champion", type: "Skin", unlocked: true, level: 5 },
      { id: "neon-valkyrie", name: "Neon Valkyrie", type: "Skin", unlocked: false, level: 10 },
      { id: "pink-lightning", name: "Pink Lightning", type: "Emblem", unlocked: true, level: 1 },
    ],
  }), []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button 
              variant="ghost" 
              size="sm"
              aria-label="Back to home"
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-accent" aria-hidden="true" />
            {i18n.legends}
          </h1>
          <div className="w-20" aria-hidden="true"></div>
        </header>

        <Tabs defaultValue="men" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger 
              value="men" 
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="View Team Men cosmetics"
            >
              Team Men
            </TabsTrigger>
            <TabsTrigger 
              value="women" 
              className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="View Team Women cosmetics"
            >
              Team Women
            </TabsTrigger>
          </TabsList>

          <TabsContent value="men">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
              {cosmetics.men.map((item) => (
                <Card
                  key={item.id}
                  className={`p-6 transition-all duration-200 ${
                    item.unlocked
                      ? "border-primary/30 hover:border-primary/50 cursor-pointer hover:scale-105"
                      : "opacity-60"
                  }`}
                  role="listitem"
                  tabIndex={item.unlocked ? 0 : undefined}
                  aria-label={`${item.name}, ${item.type}, ${item.unlocked ? 'owned' : 'locked'}, requires level ${item.level}`}
                >
                  <div className="aspect-square bg-primary/10 rounded-lg mb-4 flex items-center justify-center" aria-hidden="true">
                    {item.unlocked ? (
                      <Sparkles className="w-12 h-12 text-primary" />
                    ) : (
                      <Lock className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-bold mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{item.type}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Level {item.level}
                    </span>
                    {item.unlocked ? (
                      <span className="text-xs text-primary font-semibold">Owned</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Locked</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="women">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
              {cosmetics.women.map((item) => (
                <Card
                  key={item.id}
                  className={`p-6 transition-all duration-200 ${
                    item.unlocked
                      ? "border-secondary/30 hover:border-secondary/50 cursor-pointer hover:scale-105"
                      : "opacity-60"
                  }`}
                  role="listitem"
                  tabIndex={item.unlocked ? 0 : undefined}
                  aria-label={`${item.name}, ${item.type}, ${item.unlocked ? 'owned' : 'locked'}, requires level ${item.level}`}
                >
                  <div className="aspect-square bg-secondary/10 rounded-lg mb-4 flex items-center justify-center" aria-hidden="true">
                    {item.unlocked ? (
                      <Sparkles className="w-12 h-12 text-secondary" />
                    ) : (
                      <Lock className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-bold mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{item.type}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Level {item.level}
                    </span>
                    {item.unlocked ? (
                      <span className="text-xs text-secondary font-semibold">Owned</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Locked</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="mt-8 p-6 bg-muted/20">
          <h3 className="font-bold mb-3">Cosmetic System</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Unlock cosmetics by leveling up your chosen team</li>
            <li>• Side-specific items cannot be used cross-team</li>
            <li>• Cosmetics are visual only - no gameplay advantage</li>
            <li>• New items added with seasonal updates</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Legends;
