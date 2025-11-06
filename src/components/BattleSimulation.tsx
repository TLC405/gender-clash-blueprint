import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Settings2 } from "lucide-react";
import { toast } from "sonner";

type Unit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  side: "men" | "women";
  target?: Unit;
};

type BattleStats = {
  menAlive: number;
  womenAlive: number;
  menKills: number;
  womenKills: number;
};

const BattleSimulation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [armySize, setArmySize] = useState(10000);
  const [battleSpeed, setBattleSpeed] = useState(1);
  const [stats, setStats] = useState<BattleStats>({
    menAlive: armySize,
    womenAlive: armySize,
    menKills: 0,
    womenKills: 0,
  });

  const unitsRef = useRef<Unit[]>([]);
  const lastTimeRef = useRef<number>(0);

  const initializeBattle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const units: Unit[] = [];

    // Men formation (left side - blue)
    for (let i = 0; i < armySize; i++) {
      const row = Math.floor(i / 100);
      const col = i % 100;
      units.push({
        x: 50 + col * 3,
        y: height / 2 - 150 + row * 3,
        vx: 0,
        vy: 0,
        health: 100,
        side: "men",
      });
    }

    // Women formation (right side - pink)
    for (let i = 0; i < armySize; i++) {
      const row = Math.floor(i / 100);
      const col = i % 100;
      units.push({
        x: width - 50 - col * 3,
        y: height / 2 - 150 + row * 3,
        vx: 0,
        vy: 0,
        health: 100,
        side: "women",
      });
    }

    unitsRef.current = units;
    setStats({
      menAlive: armySize,
      womenAlive: armySize,
      menKills: 0,
      womenKills: 0,
    });
    toast.success(`Battle initialized: ${armySize} vs ${armySize}`);
  }, [armySize]);

  const findNearestEnemy = (unit: Unit, units: Unit[]): Unit | undefined => {
    let nearest: Unit | undefined;
    let minDist = Infinity;

    for (const other of units) {
      if (other.side === unit.side || other.health <= 0) continue;
      const dx = other.x - unit.x;
      const dy = other.y - unit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = other;
      }
    }

    return nearest;
  };

  const updateBattle = useCallback((deltaTime: number) => {
    const units = unitsRef.current;
    const canvas = canvasRef.current;
    if (!canvas || units.length === 0) return;

    const MOVE_SPEED = 20 * battleSpeed;
    const ATTACK_RANGE = 5;
    const DAMAGE = 30 * battleSpeed;
    const COHESION_RADIUS = 30;
    const COHESION_STRENGTH = 0.1;

    let menAlive = 0;
    let womenAlive = 0;

    // Update each unit
    for (const unit of units) {
      if (unit.health <= 0) continue;

      // Count alive units
      if (unit.side === "men") menAlive++;
      else womenAlive++;

      // Find or update target
      if (!unit.target || unit.target.health <= 0) {
        unit.target = findNearestEnemy(unit, units);
      }

      if (unit.target) {
        const dx = unit.target.x - unit.x;
        const dy = unit.target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ATTACK_RANGE) {
          // Attack
          unit.target.health -= DAMAGE * deltaTime;
          if (unit.target.health <= 0) {
            setStats((prev) => ({
              ...prev,
              menKills: unit.side === "men" ? prev.menKills + 1 : prev.menKills,
              womenKills: unit.side === "women" ? prev.womenKills + 1 : prev.womenKills,
            }));
            unit.target = undefined;
          }
          unit.vx = 0;
          unit.vy = 0;
        } else {
          // Move towards target
          unit.vx = (dx / dist) * MOVE_SPEED;
          unit.vy = (dy / dist) * MOVE_SPEED;
        }
      }

      // Formation cohesion (flocking behavior)
      let cohesionX = 0;
      let cohesionY = 0;
      let nearbyCount = 0;

      for (const other of units) {
        if (other === unit || other.side !== unit.side || other.health <= 0) continue;
        const dx = other.x - unit.x;
        const dy = other.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < COHESION_RADIUS) {
          cohesionX += dx;
          cohesionY += dy;
          nearbyCount++;
        }
      }

      if (nearbyCount > 0) {
        unit.vx += (cohesionX / nearbyCount) * COHESION_STRENGTH;
        unit.vy += (cohesionY / nearbyCount) * COHESION_STRENGTH;
      }

      // Update position
      unit.x += unit.vx * deltaTime;
      unit.y += unit.vy * deltaTime;

      // Boundary check
      unit.x = Math.max(0, Math.min(canvas.width, unit.x));
      unit.y = Math.max(0, Math.min(canvas.height, unit.y));
    }

    setStats((prev) => ({
      ...prev,
      menAlive,
      womenAlive,
    }));

    // Check for victory
    if (menAlive === 0 || womenAlive === 0) {
      setIsRunning(false);
      toast.success(menAlive > 0 ? "Team MEN wins!" : "Team WOMEN wins!", {
        duration: 5000,
      });
    }
  }, [battleSpeed]);

  const renderBattle = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw battlefield grid
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw units
    const units = unitsRef.current;
    for (const unit of units) {
      if (unit.health <= 0) continue;

      ctx.fillStyle = unit.side === "men" ? "#1F6FEB" : "#E91E63";
      ctx.globalAlpha = Math.max(0.3, unit.health / 100);
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, []);

  const animate = useCallback(
    (currentTime: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      if (isRunning) {
        updateBattle(deltaTime);
      }
      renderBattle();

      animationRef.current = requestAnimationFrame(animate);
    },
    [isRunning, updateBattle, renderBattle]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    initializeBattle();
  }, [initializeBattle]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  const handlePlayPause = () => {
    setIsRunning(!isRunning);
    toast.info(isRunning ? "Battle paused" : "Battle resumed");
  };

  const handleReset = () => {
    setIsRunning(false);
    lastTimeRef.current = 0;
    initializeBattle();
  };

  const handleArmySizeChange = (value: number[]) => {
    setArmySize(value[0]);
  };

  const handleSpeedChange = (value: number[]) => {
    setBattleSpeed(value[0]);
  };

  return (
    <div className="w-full space-y-4">
      <Card className="p-6 bg-card border-border">
        <div className="space-y-4">
          {/* Stats Display */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Team MEN</div>
              <div className="text-3xl font-bold text-primary">{stats.menAlive.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{stats.menKills} kills</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Team WOMEN</div>
              <div className="text-3xl font-bold text-secondary">{stats.womenAlive.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{stats.womenKills} kills</div>
            </div>
          </div>

          {/* Canvas */}
          <div className="relative rounded-lg overflow-hidden border border-border bg-black">
            <canvas
              ref={canvasRef}
              className="w-full h-[500px]"
              aria-label="Battle simulation visualization"
            />
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              onClick={handlePlayPause}
              variant="default"
              size="lg"
              aria-label={isRunning ? "Pause battle" : "Start battle"}
            >
              {isRunning ? <Pause className="w-5 h-5 mr-2" aria-hidden="true" /> : <Play className="w-5 h-5 mr-2" aria-hidden="true" />}
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button onClick={handleReset} variant="outline" size="lg" aria-label="Reset battle">
              <RotateCcw className="w-5 h-5 mr-2" aria-hidden="true" />
              Reset
            </Button>
            <Button
              onClick={() => setShowControls(!showControls)}
              variant="outline"
              size="lg"
              aria-label="Toggle battle settings"
            >
              <Settings2 className="w-5 h-5 mr-2" aria-hidden="true" />
              Settings
            </Button>
          </div>

          {/* Advanced Controls */}
          {showControls && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <label htmlFor="army-size" className="text-sm font-medium">
                  Army Size: {armySize.toLocaleString()} per side
                </label>
                <Slider
                  id="army-size"
                  value={[armySize]}
                  onValueChange={handleArmySizeChange}
                  min={1000}
                  max={20000}
                  step={1000}
                  disabled={isRunning}
                  aria-label="Adjust army size"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="battle-speed" className="text-sm font-medium">
                  Battle Speed: {battleSpeed}x
                </label>
                <Slider
                  id="battle-speed"
                  value={[battleSpeed]}
                  onValueChange={handleSpeedChange}
                  min={0.5}
                  max={5}
                  step={0.5}
                  aria-label="Adjust battle speed"
                />
              </div>
              <Button
                onClick={handleReset}
                variant="secondary"
                className="w-full"
                disabled={isRunning}
                aria-label="Apply settings and reset battle"
              >
                Apply & Reset
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default BattleSimulation;
