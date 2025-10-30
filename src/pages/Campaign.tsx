import { Link } from "react-router-dom";
import { ArrowLeft, Lock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import i18n from "@/data/i18n.en.json";

const Campaign = () => {
  const missions = [
    { id: 1, name: "Bricktown Blockade", difficulty: "Easy", stars: 3, unlocked: true },
    { id: 2, name: "Skydance Showdown", difficulty: "Medium", stars: 2, unlocked: true },
    { id: 3, name: "Wheeler's Wheel", difficulty: "Medium", stars: 1, unlocked: true },
    { id: 4, name: "Devon Tower Assault", difficulty: "Hard", stars: 0, unlocked: true },
    { id: 5, name: "Riversport Rampage", difficulty: "Hard", stars: 0, unlocked: false },
    { id: 6, name: "OKC Finals", difficulty: "Extreme", stars: 0, unlocked: false },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{i18n.campaign}</h1>
          <div className="w-20"></div>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">OKC Saga</h2>
          <p className="text-muted-foreground">
            Battle through iconic OKC landmarks in this single-player campaign
          </p>
        </div>

        <div className="space-y-4">
          {missions.map((mission) => (
            <Card
              key={mission.id}
              className={`p-6 ${
                mission.unlocked
                  ? "hover:border-primary/50 cursor-pointer transition-colors"
                  : "opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                      mission.unlocked
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {mission.unlocked ? mission.id : <Lock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{mission.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          mission.difficulty === "Easy"
                            ? "bg-green-500/20 text-green-400"
                            : mission.difficulty === "Medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : mission.difficulty === "Hard"
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {mission.difficulty}
                      </span>
                      {mission.unlocked && (
                        <div className="flex gap-1">
                          {[...Array(3)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < mission.stars
                                  ? "fill-accent text-accent"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {mission.unlocked && (
                  <Button>Play Mission</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Campaign;
