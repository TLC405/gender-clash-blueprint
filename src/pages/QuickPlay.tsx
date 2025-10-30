import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Sparkles, Swords, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import TeamSelect from "@/components/TeamSelect";
import ClassCard from "@/components/ClassCard";
import RelicCard from "@/components/RelicCard";
import MapCard from "@/components/MapCard";
import EmptyState from "@/components/EmptyState";
import classes from "@/data/classes.json";
import relics from "@/data/relics.json";
import maps from "@/data/maps.json";
import i18n from "@/data/i18n.en.json";
import { toast } from "sonner";

type Side = "men" | "women";

const QuickPlay = () => {
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedRelic, setSelectedRelic] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  const hasClasses = useMemo(() => classes?.classes?.length > 0, []);
  const hasRelics = useMemo(() => relics?.relics?.length > 0, []);
  const hasMaps = useMemo(() => maps?.maps?.length > 0, []);

  const handleStartMatch = useCallback(() => {
    if (!selectedSide || !selectedClass || !selectedRelic || !selectedMap) {
      toast.error("Please complete your loadout selection");
      return;
    }

    toast.success(`Launching match as Team ${selectedSide.toUpperCase()}!`);
    setTimeout(() => {
      toast.info("Match functionality coming soon - Phaser integration pending");
    }, 1500);
  }, [selectedSide, selectedClass, selectedRelic, selectedMap]);

  const handleReset = useCallback(() => {
    setSelectedSide(null);
    setSelectedClass(null);
    setSelectedRelic(null);
    setSelectedMap(null);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <Link to="/" aria-label="Back to home">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{i18n.quick_play}</h1>
          <div className="w-20" aria-hidden="true"></div>
        </header>

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
                    onClick={handleReset}
                    className="ml-4"
                    aria-label="Change team selection"
                  >
                    Change
                  </Button>
                </div>
              </div>

              {/* Class Selection */}
              <section aria-labelledby="class-selection">
                <h2 id="class-selection" className="text-2xl font-bold mb-4">{i18n.choose_class}</h2>
                {hasClasses ? (
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
                ) : (
                  <EmptyState
                    icon={Swords}
                    title="No classes available"
                    description="Classes data is missing. Please check configuration."
                    action={{ label: "Reset Selection", onClick: handleReset }}
                  />
                )}
              </section>

              {/* Relic Selection */}
              {selectedClass && (
                <section aria-labelledby="relic-selection">
                  <h2 id="relic-selection" className="text-2xl font-bold mb-4">{i18n.select_relic}</h2>
                  {hasRelics ? (
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
                  ) : (
                    <EmptyState
                      icon={Sparkles}
                      title="No relics available"
                      description="Relics data is missing. Please check configuration."
                      action={{ label: "Reset Selection", onClick: handleReset }}
                    />
                  )}
                </section>
              )}

              {/* Map Selection */}
              {selectedRelic && (
                <section aria-labelledby="map-selection">
                  <h2 id="map-selection" className="text-2xl font-bold mb-4">{i18n.choose_map}</h2>
                  {hasMaps ? (
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
                  ) : (
                    <EmptyState
                      icon={MapPin}
                      title="No maps available"
                      description="Maps data is missing. Please check configuration."
                      action={{ label: "Reset Selection", onClick: handleReset }}
                    />
                  )}
                </section>
              )}

              {/* Start Match Button */}
              {selectedMap && (
                <div className="flex justify-center pt-8">
                  <Button
                    size="lg"
                    onClick={handleStartMatch}
                    className="text-xl px-12 py-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Start match with current loadout"
                  >
                    <Play className="w-6 h-6 mr-2" aria-hidden="true" />
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
