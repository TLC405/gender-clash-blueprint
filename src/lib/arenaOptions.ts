/**
 * TLC Battlecast arena playbook. These are authored arcade battle tactics,
 * not military doctrine or scientific models of human combat.
 *
 * Every option changes real initial positions and/or formation steering;
 * none is a decorative toggle.
 */
export const FORMATIONS = [
  { id: "battle-lines", name: "Battle Lines", tagline: "Classic squads charge in disciplined lanes", short: "Balanced", preview: [[15,20],[35,20],[55,20],[75,20],[15,50],[35,50],[55,50],[75,50],[15,80],[35,80],[55,80],[75,80]] },
  { id: "thunder-wedge", name: "Thunder Wedge", tagline: "A sharp central spear splits the frontline", short: "Center rush", preview: [[19,12],[19,88],[33,22],[33,78],[52,33],[52,67],[72,50]] },
  { id: "pincer", name: "Double Pincer", tagline: "Two fast flanks squeeze the opposing center", short: "Wide flanks", preview: [[23,12],[45,12],[73,12],[20,50],[34,50],[23,88],[45,88],[73,88]] },
  { id: "shield-wall", name: "Iron Wall", tagline: "Dense defensive ranks absorb the opening blow", short: "Defensive", preview: [[22,17],[31,17],[22,39],[31,39],[22,61],[31,61],[22,83],[31,83],[44,25],[44,75]] },
  { id: "storm-spiral", name: "Storm Spiral", tagline: "Rotating staggered lines swirl toward contact", short: "Curved attack", preview: [[18,65],[27,34],[40,16],[55,22],[67,43],[70,66],[55,81],[36,77]] },
  { id: "blitz", name: "Lightning Blitz", tagline: "Alternating forward battalions surge in bursts", short: "Fast attack", preview: [[20,10],[70,10],[22,31],[55,31],[22,51],[70,51],[22,71],[55,71],[20,90]] },
  { id: "scatter", name: "Chaos Swarm", tagline: "Loose independent packs converge and surround", short: "Unpredictable", preview: [[13,18],[64,13],[42,31],[81,40],[19,55],[53,67],[33,90],[80,86]] },
  { id: "citadel", name: "The Citadel", tagline: "A fortified core protected by two outer wings", short: "Last stand", preview: [[12,22],[14,76],[32,15],[33,83],[43,39],[43,61],[52,43],[52,57],[64,50]] },
] as const;

export type FormationPattern = typeof FORMATIONS[number]["id"];

export const ARENA_SURFACES = [
  { id: "championship", name: "TLC Championship", tagline: "Cobalt, bronze court and premium center crest", swatch: "#134a85" },
  { id: "thunderstorm", name: "Stormfront", tagline: "Brushed graphite and electric-blue court inlays", swatch: "#182e50" },
  { id: "concrete", name: "Midnight Concrete", tagline: "Industrial charcoal with copper scoring lines", swatch: "#41434b" },
  { id: "tactical", name: "Tactical Grounds", tagline: "Deep-green stadium turf and disciplined grid", swatch: "#194233" },
] as const;

export type ArenaSurface = typeof ARENA_SURFACES[number]["id"];

export function isFormationPattern(value: unknown): value is FormationPattern {
  return FORMATIONS.some(item => item.id === value);
}
export function isArenaSurface(value: unknown): value is ArenaSurface {
  return ARENA_SURFACES.some(item => item.id === value);
}

export function getTacticSpeed(pattern: FormationPattern, lane: number, lanes = 6): number {
  if (pattern === "blitz") return lane % 2 === 0 ? 1.14 : 1.02;
  if (pattern === "shield-wall") return 0.76;
  if (pattern === "citadel") return lane % 2 === 0 ? 0.89 : 0.95;
  if (pattern === "thunder-wedge") return 1.05;
  if (pattern === "pincer") return lane === 0 || lane === lanes-1 ? 1.12 : 0.97;
  return 1;
}

export function getTacticLaneBias(
  pattern: FormationPattern, lane: number, lanes: number,
  height: number, team: number, tick: number
): number {
  const rel = lanes <= 1 ? 0 : (lane / (lanes - 1)) * 2 - 1;
  if (pattern === "thunder-wedge") return -rel * height * 0.085;
  if (pattern === "pincer") return Math.sign(rel) * height * 0.075;
  if (pattern === "citadel") return -rel * height * 0.11;
  if (pattern === "storm-spiral") return Math.sin(tick * 0.012 + lane * 1.16 + team * Math.PI) * height * 0.048;
  if (pattern === "scatter") return Math.sin(lane * 2.5 + team * 1.3) * height * 0.035;
  return 0;
}
