

## Atomic Battle Scene & Visuals Overhaul

### Current Issues

After reviewing all 6 core battle engine files, the system has good bones (SoA architecture, spatial hash, centroid tracking, fury escalation) but the **visual output** still feels flat and cheap because:

1. **Arena is too dark and empty** - Dark navy-blue field with barely visible lines. No sense of a stadium, crowd, or atmosphere. The vignette makes it even darker.
2. **Units are too small and samey** - 6px dots with subtle gradients are hard to distinguish at scale. The "3D sphere" effect is barely noticeable. No animation or personality.
3. **Particles are underwhelming** - Small sparks and dust that fade quickly. Deaths are barely noticeable in a 500v500 battle.
4. **No screen-level drama** - No screen shake on big kills, no flash on first clash, no dynamic camera energy.
5. **Formation phase is boring** - Units just sit there with damped velocity. No visual anticipation.

---

### The Overhaul (4 files)

#### 1. Arena Renderer (`BattleSimulationEnhanced.tsx` - `renderArena`)

**Make the field feel like a real stadium broadcast:**

- Brighter, richer turf color (dark green, not navy) with more visible alternating stripes
- Bolder yard lines and center line that are actually readable (opacity 0.08 -> 0.25)
- Visible team end zone labels ("MEN" / "WOMEN") with team colors
- Subtle crowd silhouette strip along top and bottom edges (static, no animation)
- Spotlight cones from corners pointing at center field
- Reduce vignette intensity so the action is visible

#### 2. Unit Renderer (`spriteRenderer.ts`)

**Make units feel like warriors, not dust:**

- Increase base radius to 7px (leaders 11px) for better visibility
- Add a bright white specular highlight dot on each unit (top-left, 1px) for that premium 3D pop
- Add a faint team-colored outer ring on every unit (not just leaders) for instant team identification at a glance
- Pulsing "heartbeat" scale animation during stand phase (units breathe while waiting)
- In combat: units that are actively hitting get a brief bright flash (white overlay for 1 frame)
- Health bar: tiny 2px-tall colored bar below each unit showing remaining health (only when < 80%)
- Leader units get a small "star" above them instead of just a ring
- Movement trail: draw 2 afterimage ghosts behind fast-moving units at 20% and 10% opacity

#### 3. Particle System (`particlePool.ts`)

**Make hits and deaths impossible to miss:**

- Hit sparks: increase count from 5 to 8 per hit, larger size (3.5 -> 5), and use additive blending (`globalCompositeOperation = 'lighter'`) for glow
- Death explosions: increase to 12 particles with a bright white center flash (PARTICLE_GLOW, size 20, life 0.15s)
- Add screen-edge kill indicators: when a unit dies, spawn a brief colored dash at the nearest screen edge
- Confetti on victory: increase to 80 particles, add spin animation via rotation speed
- Shockwave ring on first clash: make it bigger (speed 300) and add a second inner ring

#### 4. Battle Simulation Loop (`BattleSimulationEnhanced.tsx`)

**Add cinematic punch:**

- **Screen shake**: On kills, apply a small random offset to the canvas transform (2-4px, decaying over 100ms). Track shake intensity and decay it each frame.
- **First clash flash**: When `firstClashRef` triggers, render a full-screen white overlay at 30% opacity that fades over 200ms.
- **Stand phase anticipation**: During the 3-second stand phase, slowly zoom the camera (scale 1.0 -> 1.02) and add a subtle pulsing vignette, then snap back to 1.0 on melee start.
- **Battle intensity overlay**: Increase the warmth effect (current max 0.08 is invisible). Push to 0.15 at max casualties.
- **Victory slow-motion**: When victory is declared, render 3 more frames at 0.25x speed before stopping, for a dramatic finish.

---

### Technical Summary

| File | Changes |
|------|---------|
| `src/lib/spriteRenderer.ts` | Larger units (7px/11px), specular highlights, team rings, health bars, movement trails, stand-phase breathing |
| `src/lib/particlePool.ts` | More/bigger hit sparks with additive blending, brighter death flashes, enhanced confetti, bigger shockwave |
| `src/components/BattleSimulationEnhanced.tsx` | Brighter arena with visible markings, crowd silhouettes, spotlights, screen shake, first-clash flash, stand-phase zoom, stronger intensity overlay |
| `src/components/battle/ArenaRenderer.tsx` | Not used (rendering is inline in BattleSimulationEnhanced), but will be cleaned up if referenced |

### Expected Result

- The arena looks like an ESPN broadcast of a stadium battle
- Every unit is individually visible and team-identifiable at a glance
- Hits feel impactful with bright sparks and screen shake
- Deaths are dramatic with flashes and particle bursts
- The stand phase builds anticipation with breathing units and a slow zoom
- Victory is cinematic with slow-motion and screen-wide confetti
- The overall feel shifts from "debug prototype" to "premium game"

