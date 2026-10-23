## Faster, Smoother Battle + Free Open-Source Rendering Engine

### Why it feels slow (what the code shows)
- The battle timer is saved into React state every single frame, and the game loop depends on that timer. This makes the page redraw ~60 times/sec and likely restarts the loop, so the battle stutters and feels sluggish. To confirm first: measure frame rate before/after.
- Unit speeds are modest (top speed 180, push force 80) and the stand phase holds everyone for 3 seconds before anything happens.
- All drawing uses the basic 2D canvas, which gets heavy with hundreds of units plus effects.

### The plan

**1. Fix the game loop (biggest win)**
- Keep timer, phase and stats in refs inside the loop; push them to the screen only ~4 times per second.
- Game loop starts once and never restarts mid-battle.
- Use a fixed-step physics update so movement speed is the same on any device.

**2. Faster, punchier movement**
- Roughly double speed: top speed 180 -> 340, charge 250 -> 450, stronger pursuit.
- Shorten stand phase 3s -> 1.5s.
- Speed slider range extended to 0.5x – 4x.

**3. Switch rendering to PixiJS (free, open-source, MIT, WebGL)**
- GPU drawing: thousands of units at 60 FPS, real glow/blur filters, smooth zoom.
- Units become pre-made textures drawn in one batch; particles use Pixi's particle container.
- Keep existing physics engine (spatial grid, centroids, fury) unchanged in logic.

**4. Free open-source art & sound**
- Kenney.nl (CC0) top-down character/soldier sprites and impact effects instead of plain dots.
- Kenney / OpenGameArt (CC0) sword clash, crowd roar and whistle sounds, played via Howler.js (MIT), rate-limited so it doesn't get noisy.
- Downloaded into the project so nothing depends on outside sites at runtime.

**5. Battlefield upgrade**
- Textured grass field with mowing stripes, painted lines, dust/blood-free scuff marks that stay where fights happened.
- Simple camera that gently follows the main clash point.

### Technical details
- Files: `BattleSimulationEnhanced.tsx` (loop refactor, Pixi stage), `battlePhysics.ts` (speed config, fixed step), new `src/lib/pixiRenderer.ts` replacing `spriteRenderer.ts` drawing, `particlePool.ts` hooked to Pixi, `Index.tsx` slider range.
- Packages: `pixi.js` v8, `howler`.
- Assets under `src/assets/battle/` with a CREDITS note for CC0 sources.
- Verify with a Playwright run: start battle, confirm armies meet within ~3s and FPS stays high.
