import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import i18n from "@/data/i18n.en.json";

const Legends = () => {
  const cosmetics = {
    men: [
      { name: "Thunder Elite", type: "Skin", unlocked: true, level: 1 },
      { name: "OKC Champion", type: "Skin", unlocked: true, level: 5 },
      { name: "Neon Warrior", type: "Skin", unlocked: false, level: 10 },
      { name: "Blue Lightning", type: "Emblem", unlocked: true, level: 1 },
    ],
    women: [
      { name: "Storm Elite", type: "Skin", unlocked: true, level: 1 },
      { name: "Phoenix Champion", type: "Skin", unlocked: true, level: 5 },
      { name: "Neon Valkyrie", type: "Skin", unlocked: false, level: 10 },
      { name: "Pink Lightning", type: "Emblem", unlocked: true, level: 1 },
    ],
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-accent" />
            {i18n.legends}
          </h1>
          <div className="w-20"></div>
        </div>

        <Tabs defaultValue="men" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="men" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Team Men
            </TabsTrigger>
            <TabsTrigger value="women" className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
              Team Women
            </TabsTrigger>
          </TabsList>

          <TabsContent value="men">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cosmetics.men.map((item, index) => (
                <Card
                  key={index}
                  className={`p-6 ${
                    item.unlocked
                      ? "border-primary/30 hover:border-primary/50 cursor-pointer"
                      : "opacity-60"
                  } transition-colors`}
                >
                  <div className="aspect-square bg-primary/10 rounded-lg mb-4 flex items-center justify-center">
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cosmetics.women.map((item, index) => (
                <Card
                  key={index}
                  className={`p-6 ${
                    item.unlocked
                      ? "border-secondary/30 hover:border-secondary/50 cursor-pointer"
                      : "opacity-60"
                  } transition-colors`}
                >
                  <div className="aspect-square bg-secondary/10 rounded-lg mb-4 flex items-center justify-center">
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
