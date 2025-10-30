import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import TeamSelect from "@/components/TeamSelect";
import ClassCard from "@/components/ClassCard";
import RelicCard from "@/components/RelicCard";
import MapCard from "@/components/MapCard";
import classes from "@/data/classes.json";
import relics from "@/data/relics.json";
import maps from "@/data/maps.json";
import i18n from "@/data/i18n.en.json";
import { toast } from "sonner";

type Side = "men" | "women";

const QuickPlay = () => {
  const navigate = useNavigate();
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedRelic, setSelectedRelic] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  const handleStartMatch = () => {
    if (!selectedSide || !selectedClass || !selectedRelic || !selectedMap) {
      toast.error("Please complete your loadout selection");
      return;
    }

    toast.success(`Launching match as Team ${selectedSide.toUpperCase()}!`);
    // In a real implementation, this would start the Phaser game
    setTimeout(() => {
      toast.info("Match functionality coming soon - Phaser integration pending");
    }, 1500);
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
          <h1 className="text-3xl font-bold">{i18n.quick_play}</h1>
          <div className="w-20"></div>
        </div>

        <div className="space-y-12">
          {/* Team Selection */}
          {!selectedSide ? (
            <TeamSelect onPick={setSelectedSide} />
          ) : (
            <div className="space-y-8">
              {/* Selected Side Banner */}
              <div className="text-center">
                <div className="inline-block px-6 py-3 rounded-full bg-card border border-border">
                  <span className="text-sm text-muted-foreground mr-2">Playing as:</span>
                  <span className={`font-bold text-lg ${selectedSide === "men" ? "text-primary" : "text-secondary"}`}>
                    Team {selectedSide.toUpperCase()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSide(null);
                      setSelectedClass(null);
                      setSelectedRelic(null);
                      setSelectedMap(null);
                    }}
                    className="ml-4"
                  >
                    Change
                  </Button>
                </div>
              </div>

              {/* Class Selection */}
              <div>
                <h2 className="text-2xl font-bold mb-4">{i18n.choose_class}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.classes.map((cls) => (
                    <ClassCard
                      key={cls.id}
                      classData={cls}
                      selected={selectedClass === cls.id}
                      onSelect={() => setSelectedClass(cls.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Relic Selection */}
              {selectedClass && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">{i18n.select_relic}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relics.relics.map((relic) => (
                      <RelicCard
                        key={relic.id}
                        relic={relic}
                        selected={selectedRelic === relic.id}
                        onSelect={() => setSelectedRelic(relic.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Map Selection */}
              {selectedRelic && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">{i18n.choose_map}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {maps.maps.map((map) => (
                      <MapCard
                        key={map.id}
                        map={map}
                        selected={selectedMap === map.id}
                        onSelect={() => setSelectedMap(map.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Start Match Button */}
              {selectedMap && (
                <div className="flex justify-center pt-8">
                  <Button
                    size="lg"
                    onClick={handleStartMatch}
                    className="text-xl px-12 py-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    <Play className="w-6 h-6 mr-2" />
                    Start Match
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickPlay;
