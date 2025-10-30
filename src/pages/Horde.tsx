import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import i18n from "@/data/i18n.en.json";

const Horde = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
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
            <Shield className="w-8 h-8 text-accent" aria-hidden="true" />
            {i18n.horde}
          </h1>
          <div className="w-20" aria-hidden="true"></div>
        </header>

        <section className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-3">Endless Wave Defense</h2>
          <p className="text-muted-foreground text-lg">
            Choose your team and survive endless waves of AI opponents
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 border-primary/30 hover:border-primary transition-all duration-200 cursor-pointer group">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform" aria-hidden="true">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Team Men</h3>
              <p className="text-muted-foreground">
                Defend your territory against relentless waves
              </p>
              <Button 
                className="w-full bg-primary hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Start Horde Mode as Team Men"
              >
                Start Horde Mode
              </Button>
            </div>
          </Card>

          <Card className="p-8 border-secondary/30 hover:border-secondary transition-all duration-200 cursor-pointer group">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform" aria-hidden="true">
                <Zap className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-secondary">Team Women</h3>
              <p className="text-muted-foreground">
                Defend your territory against relentless waves
              </p>
              <Button 
                className="w-full bg-secondary hover:bg-secondary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Start Horde Mode as Team Women"
              >
                Start Horde Mode
              </Button>
            </div>
          </Card>
        </div>

        <Card className="mt-8 p-6 bg-muted/20">
          <h3 className="font-bold mb-4">Horde Mode Rules</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Waves increase in difficulty and enemy count</li>
            <li>• Earn bonus XP for survival streaks</li>
            <li>• Special power-ups drop every 5 waves</li>
            <li>• Compete for highest wave reached on leaderboards</li>
            <li>• Bots fill remaining team slots automatically</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Horde;
