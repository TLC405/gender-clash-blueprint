import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import i18n from "@/data/i18n.en.json";

const Leaderboards = () => {
  // Mock data - in real app would come from Supabase
  const teamStats = {
    men: { wins: 1247, losses: 1156, winRate: 51.9 },
    women: { wins: 1203, losses: 1189, winRate: 50.3 },
  };

  const topPlayers = {
    men: [
      { rank: 1, name: "ThunderStrike", wins: 342, kd: 2.8 },
      { rank: 2, name: "OKCWarrior", wins: 315, kd: 2.5 },
      { rank: 3, name: "VanguardKing", wins: 298, kd: 2.3 },
    ],
    women: [
      { rank: 1, name: "StormQueen", wins: 358, kd: 3.1 },
      { rank: 2, name: "PhoenixRise", wins: 331, kd: 2.7 },
      { rank: 3, name: "BlazeGoddess", wins: 304, kd: 2.4 },
    ],
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8 text-accent" />
            {i18n.leaderboards}
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Team Stats Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6 border-primary/30 bg-gradient-to-br from-card to-primary/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-primary">Team Men</h2>
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Wins</span>
                <span className="font-bold text-xl">{teamStats.men.wins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Losses</span>
                <span className="font-bold text-xl">{teamStats.men.losses}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-bold text-2xl text-primary">{teamStats.men.winRate}%</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-secondary/30 bg-gradient-to-br from-card to-secondary/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-secondary">Team Women</h2>
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Wins</span>
                <span className="font-bold text-xl">{teamStats.women.wins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Losses</span>
                <span className="font-bold text-xl">{teamStats.women.losses}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-bold text-2xl text-secondary">{teamStats.women.winRate}%</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Top Players */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Men Top Players */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Top Men Players
            </h3>
            <Card className="p-4">
              <div className="space-y-3">
                {topPlayers.men.map((player) => (
                  <div
                    key={player.rank}
                    className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                        #{player.rank}
                      </div>
                      <span className="font-semibold">{player.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{player.wins} wins</div>
                      <div className="text-xs text-primary">K/D: {player.kd}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Women Top Players */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-secondary" />
              Top Women Players
            </h3>
            <Card className="p-4">
              <div className="space-y-3">
                {topPlayers.women.map((player) => (
                  <div
                    key={player.rank}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/5 border border-secondary/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center font-bold text-secondary">
                        #{player.rank}
                      </div>
                      <span className="font-semibold">{player.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{player.wins} wins</div>
                      <div className="text-xs text-secondary">K/D: {player.kd}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboards;
