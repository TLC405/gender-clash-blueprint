

## Ultimate Horde Battle Engine Overhaul

### Problems Identified

1. **Units can't find enemies across the full battlefield** - The spatial hash search caps at 25 cells (1250px). On wide screens the armies can be further apart. When `findNearestEnemy` returns -1, the fallback attraction is weak and units drift aimlessly.

2. **Units look cheap** - 4px radius dots with simple gradients. At 500v500, they look like colored noise, not warriors.

3. **Arena looks flat** - Minimal field with faint lines. No atmosphere, no drama.

4. **Combat lacks weight** - Hits produce tiny sparks. Deaths are invisible. No sense of clash or impact.

5. **No global enemy tracking** - The system relies entirely on spatial hash proximity. Real horde games use a global "center of mass" so every unit always knows where the enemy army is.

---

### The Fix (4 files, 1 comprehensive overhaul)

#### 1. battlePhysics.ts - Relentless Global Pursuit

- **Add global enemy center-of-mass calculation** - Every frame, compute the average position of all alive enemies. This becomes the fallback target for ANY unit that can't find a nearby enemy. No unit ever "loses" the enemy.
- **Remove spatial hash dependency for targeting** - Use spatial hash for collision/separation only. For target acquisition, first try spatial hash (fast, nearby). If nothing found, use the global enemy centroid (guaranteed target).
- **Increase charge impulse** to 250 (from 180) with slight random spread for natural look.
- **Add "battle rage" escalation** - As units die, surviving units get progressively faster and more aggressive (fury mechanic). This prevents late-game floating.
- **Tighten attack range** to 8px and increase damage to 30 for faster, more decisive kills.
- **Add knockback on hit** - Attacker pushes target slightly, creating visible combat motion.

#### 2. spriteRenderer.ts - Premium Unit Visuals

- **Increase base unit size** from 4px to 6px radius (leaders 9px). Units will be visible and feel like warriors, not dust.
- **Add health-based size** - Hurt units shrink slightly (5px at 50% HP), dead units are gone instantly.
- **Add directional facing** - Units face the direction they're moving (subtle elongation toward velocity).
- **Improve shadow quality** - Larger, softer shadows that ground units on the field.
- **Add combat glow** - Units actively attacking get a subtle bright ring pulse.
- **Add team trail effect** - A faint motion trail behind fast-moving units (1-2 frames of afterimage using global alpha).

#### 3. BattleSimulationEnhanced.tsx - Premium Arena & Rendering

- **Upgrade arena rendering:**
  - Richer dark gradient background with depth
  - Professional field markings (yard lines, hash marks, center logo area)
  - Team end zones with colored gradients
  - Subtle animated scan line for broadcast feel
  - Stadium-style vignette darkening at edges
- **Add battle intensity overlay** - Screen gets warmer/redder as more units die (subtle, cinematic).
- **Add clash shockwave** - When the two armies first collide (first kill), spawn a brief expanding ring at the impact point.
- **Improve phase lighting** - Melee gets warm ambient glow, sudden death gets pulsing red edge.

#### 4. particlePool.ts - Impactful Effects

- **Bigger death explosions** - 8 particles per death (from 5), larger size, team-colored.
- **Hit sparks with team colors** - Blue sparks for men hitting, pink sparks for women hitting.
- **Screen-wide confetti on victory** - Spawn across the full arena width, not just center.
- **Add "clash dust"** - When groups of 5+ units are fighting in close proximity, spawn ambient dust clouds in the area.

---

### Technical Details

**Global Enemy Centroid (new in battlePhysics.ts):**
```text
Pre-pass each frame:
  menCenterX/Y = average position of all alive men
  womenCenterX/Y = average position of all alive women

For each unit:
  1. Try findNearestEnemy (spatial hash, 15 cells)
  2. If found -> pursue that specific enemy
  3. If NOT found -> steer toward enemy team centroid (guaranteed)
  
Result: Every unit ALWAYS has a target. Zero floating.
```

**Fury Escalation:**
```text
casualtyRatio = 1 - (aliveCount / startCount)
furyMultiplier = 1.0 + casualtyRatio * 0.8

Applied to: moveSpeed, attackDamage, maxSpeed
Result: Last survivors fight harder, battles always converge
```

**Unit Size Upgrade:**
```text
Before: 4px dots -> look like pixels
After: 6px spheres with 3D gradient, shadow, and glow
Leaders: 9px with gold crown ring
Result: Each unit is individually readable
```

---

### Expected Result

- Armies ALWAYS find each other and clash violently in the center
- Combat is continuous and escalating (no floating, no drifting)
- Units look like warriors with weight, shadow, and team identity
- The arena looks like a premium broadcast stadium
- Deaths are dramatic and visible
- Victory feels earned and cinematic

