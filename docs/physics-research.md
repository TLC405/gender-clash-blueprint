# TLC Battle — Atomic Physics V4

**Repository:** TLC405/gender-clash-blueprint  
**Active engine:** \`src/lib/battlePhysicsV4.ts\` loaded by \`src/components/BattleSimulationEnhanced.tsx\`.  
**Legacy engine:** \`src/lib/battlePhysics.ts\` remains available for the older game route; do not confuse it with the active Atomic arena.

## External sources used

1. **Glenn Fiedler — "Fix Your Timestep!"**  
   https://www.gafferongames.com/post/fix_your_timestep/  
   Applied: fixed-size 1/60-second simulation steps, an accumulator, a bounded backlog, and step-based rather than frame-based velocity damping.  
   Limit: the full game is **not** guaranteed bit-for-bit deterministic across all devices because viewport sizes, sprite initialization, timing of user interactions, particle effects and rendering still differ. The core physics state is reproducible for an identical starting state and sequence of step inputs.

2. **Craig W. Reynolds — "Steering Behaviors for Autonomous Characters" (GDC 1999)**  
   https://www.red3d.com/cwr/steer/gdc99/  
   Applied: proximity-based separation, cohesion and alignment; movement toward targets; ensuring crowd agents steer with local neighborhoods rather than scanning every actor.  
   Limit: this is a **stylized 2D combat crowd**, not a biomechanically realistic model of human motion.

3. **van den Berg, Guy, Snape, Lin & Manocha — "Optimal Reciprocal Collision Avoidance" (ORCA)**  
   https://gamma-web.iacs.umd.edu/ORCA/  
   Applied conceptually: smoother local avoidance is preferable to unbounded pursuit and agents overlapping.  
   Limit: TLC Battle **does not implement ORCA** or guarantee collision-free paths. A full ORCA solver would involve half-plane velocity constraints and linear programming, which adds overhead for thousands of tiny arena dots.

4. **Unity — "Enhanced physics performance for smooth gameplay"**  
   https://unity.com/how-to/enhanced-physics-performance-smooth-gameplay  
   Applied: bounded simulation catch-up to avoid the spiral-of-death problem on slower mobile devices, with a fixed-step budget.

5. **Vitest 2 official guide**  
   https://v2.vitest.dev/guide/  
   Applied: Vitest 2 for regression tests because this repository uses Vite 5. Avoid installing the incompatible newer Vitest 5 unless Vite is upgraded.

## GitHub source audit findings

Before V4, \`src/lib/battlePhysics.ts\` asked every active fighter to search a 51×51 cell window (radius 25) for enemies, including non-frontline agents. Each per-unit attack directly subtracted health and immediately killed targets, privileging attackers earlier in the array order. Separating forces were switched off in the combat zone. Meteor damage applied without returning casualties to the scoreboard. Damage and motion had several per-tick constants rather than physical-time-scaled controls.

## V4 changes

- **Bounded spatial targeting:** the nearest-enemy query now expands through spatial cell rings and exits when no other cell can provide a closer target. The active game limits sight to three 50px cells before reverting to enemy centroid pursuit. This is not global O(N) neighbor lookup for every unit.
- **Unbiased two-phase combat:** each unit plans attacks and movement from the same world-state snapshot; damage and knockback are accumulated in typed arrays, then applied after both teams attack. A unit killed this tick still completes its attack for this tick.
- **Incoming damage saturation:** multiple agents surrounding one opponent cannot stack infinite per-tick damage; the damage-per-second cap makes the contact zone watchable.
- **More organic motion:** local neighbor steering continues in combat; allied separation is strong, enemy separation weaker; drag is exponentially scaled by simulated seconds; forces are bounded.
- **Reproducible core:** charge spread and zero-distance separation fallback use stable hashes instead of global random numbers. Results can be tested with identical inputs and same fixed timestep.
- **Correct environmental effects:** meteor impact returns hits and lost-unit counts, updates the live scoreboard immediately and can resolve a match. Meteor kills are *not* credited to Men's or Women's KOs.
- **Fair asymmetric scoring:** if regulation ends with survivors, compare each team's *percentage* of initial fighters remaining. Equal survival ratios result in a true draw.
- **Lower-end device discipline:** reuse SoA typed arrays for damage, target velocity and impact accumulation instead of allocating a damage map each frame; cap both local interactions and catch-up steps.

## Test contract

\`npm test\` runs the active physics tests:

- formations take no damage before the bell;
- a lethal 1v1 trade resolves as **two simultaneous KOs**;
- KO credit belongs to the attacking side;
- meteor deaths are environmental and cannot be double-counted;
- direct-center meteor impacts never produce non-finite velocity;
- 2D spatial hashes correctly resize on mobile screens;
- nearby search selects the correct target and respects its radius;
- fixed-step physics state replays identically from identical initial state;
- units remain within world bounds and kill counts conserve fighters;
- SoA allocation remains capped at 20,000 units.

GitHub Actions now runs the tests before the production build. **The GitHub build and tests prove compilation plus regression behavior, not performance targets such as 60fps on every phone.** Manual gameplay and device-specific performance profiling are still needed.

## Standing research standard

For subsequent TLC Battle physics, graphics, accessibility, and gameplay upgrades, consult **external primary sources** (papers, official engine documentation, maintained upstream code) and inspect the actual GitHub implementation. Keep a source trail here, distinguish verified behavior from projections, and do not label custom crowd behavior as ORCA, true rigid-body physics, or scientifically realistic without implementing and validating those properties.
