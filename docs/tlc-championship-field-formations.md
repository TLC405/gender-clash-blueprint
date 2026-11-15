# TLC Battlecast — Championship Field & Tactical Formation Upgrade

## Release goal

Upgrade TLC Battlecast from the older green turf to **an original championship-style branded arena** while making eight tactical formations actual gameplay options. Retain the existing single-screen cockpit, 3D human stick figures, two-phase combat, durable fighters, power-vs-numbers presets and no health bars / no extraneous field prose.

## Original championship branding

- New vector center-court asset: \`public/branding/tlc-championship-crest.svg\`.
- Canvas renders the SVG at responsive dimensions, beneath live fighters. It is a scalable vector with a 1200×800 viewBox and a 2400×1600 nominal raster size, so it can scale sharply to Fold open/closed and higher-DPI desktops.
- The logo features original italic metallic **TLC** lettering, faceted blue/amber championship badge, abstract Oklahoma City skyline silhouette and angular energy wings. It is **NOT** the official Oklahoma City Thunder logo and is **not affiliated with the NBA**.
- Field remains free of gameplay text, large banners, health bars or floating callouts; the intentional center logo is part of the floor marking.
- Asset loads once per game instance. Successful image decode invalidates a cached arena bitmap; until then a simple geometric TLC fallback renders.
- Original image-generation concept is an additional high-resolution PNG delivered to the user, but the production game uses the independently authored original vector for tiny download size and sharp scaling.

## Four original arena finishes

| ID | Surface | Distinction |
|----|---------|-------------|
| championship | TLC Championship | Satin cobalt floor, bronze highlights, authentic-looking court line work |
| thunderstorm | Stormfront | Dark layered storm-blue, blue inlay lighting and angular surface details |
| concrete | Midnight Concrete | Matte graphite, light distress speckles and copper trim |
| tactical | Tactical Grounds | Green athletic turf striping, precise subdued field lines |

All surfaces share the TLC center crest, balanced blue and pink team ends, legible floor boundaries and no HUD text on top of combat.

## Eight selectable formations with actual physics effects

| Pattern | Spawn / tactical effect |
|---------|-------------------------|
| Battle Lines | Coordinated classic lanes; baseline for comparisons |
| Thunder Wedge | Forward central apex; squad steering toward the center |
| Double Pincer | Leading upper and lower flanks, slower center; fan outward before contact |
| Iron Wall | Defensive rear-biased compact deployment; slower advance |
| Storm Spiral | Sinusoidal curved starting ranks and subtle evolving lane bias |
| Lightning Blitz | Alternating rows surge more aggressively, faster outer pulses |
| Chaos Swarm | Deterministically scattered starting packs, dispersed steering |
| The Citadel | Central core supported by slower wings and converging lanes |

Every pattern changes typed-array spawn coordinates via \`formationSlot(..., pattern)\`; the active \`soa.formationPattern\` also determines squad-specific charge speed and lane pursuit. Unlike a filter or appearance setting, these choices affect combat trajectories and collision timing.

**Match fairness:** Existing Men/Women fictional attributes are unchanged. The default applies to BOTH teams, but the player may independently assign different strategies to Blue/Men and Pink/Women. Formation choice never alters the teams' underlying strength/durability attributes. Initial deployment clamps the opposing fronts to either side of the center line with breathing room, including closed Fold widths.

## UI interaction contract

- Main game remains single-screen.
- Open existing **MODES** bottom-dock panel.
- Select match size (same four presets), assign tactical formations (eight illustrated cards) to Both Teams, Blue or Pink independently, and choose one of four visual arena styles. No new persistent tab bar or field overlays.
- Selecting a new formation while the simulation is running is blocked with a pause instruction; when paused it safely resets the round and initializes the new pattern. Changing a court surface switches live, invalidating only the cached background.
- Separate Blue/Pink formation choices and the floor style persist with \`localStorage\`; private browsers gracefully fall back to defaults. The navy/orange championship crest replaces the text-only header monogram.
- The panel already scrolls independently above the fixed Fold-safe control dock.

## External references and safeguards

- Oklahoma City Thunder official media guide (uniforms/primary mark): https://cdn.nba.com/teams/uploads/sites/1610612760/2025/10/Thunder-Media-Guide-2025-26_WEB.pdf
- Thunder logo historical designer analysis: https://www.jamesrobertwatson.com/thunderlogo.html
- Reynolds steering behaviors for autonomous characters: https://www.red3d.com/cwr/steer/gdc99/
- Three.js InstancedMesh performance and per-instance transformations: https://threejs.org/docs/pages/InstancedMesh.html
- MDN Canvas 2D drawImage (scalable center mark beneath actors): https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage

The Thunder references inform **sports identity energy, colors and court hierarchy**, not copying official logos or brand names. TLC's artwork is original and independent.

## Tests and verification limits

- Validate eight unique patterns, different actual spawn geometry, bounded starts and initial separation for all four match-size presets (including 340px-wide Fold).
- Validate tactical speed/bias changes by pattern.
- Validate four surfaces, SVG mark remains TLC only, proper UI state wiring and hot-surface cache invalidation.
- GitHub CI: TypeScript typecheck, Vitest regression tests and Vite production build. Merge only after checks pass and verify Render's production deployment.
- Manual phone testing of texture visibility, contrast, controls and performance is still required; successful CI/Render is not a measured Fold device test.
