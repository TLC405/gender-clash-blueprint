# TLC Battlecast — real 3D human stick fighters

## Request

- Human-shaped articulated stick figures, not colored dots or spheres.
- Different-looking fighters, randomized once per unit so they do not flicker.
- **No visible health bars anywhere on fighters.**
- Preserve the single-screen Atomic cockpit, slower survival-oriented crowd physics, team colors and asymmetric power-vs-numbers presets.

## Implementation

### Main renderer: actual 3D geometry

\`src/lib/stickFigure3DRenderer.ts\` uses **Three.js GPU-instanced 3D geometry** in a transparent WebGL canvas over the existing 2D arena. Each unit is a skeletal stick figure assembled from nine true 3D cylinders (torso, upper/lower arms, thighs and shins), one 3D sphere head, and a flat ground shadow.

The renderer uses 11 instanced draw batches rather than thousands of separate mesh draw calls. Each unit has stable pseudo-randomized height, shoulders, hips, thickness, skin tone, team uniform shade, depth and walk cycle. Individual limbs move through XYZ space as the crowd advances and recoils. The arena's underlying movement and collision solver remains 2D; this is a **3D presentation layer** with true three-dimensional meshes, not a full 3D rigid-body combat game.

On large battles, 3D rig updates target roughly 30 Hz to reduce GPU/CPU pressure; the physics simulation keeps its existing fixed timestep. Mobile rendering uses capped device pixel ratio, low-polygon limbs/heads, and reused typed-array state. Actual device frame rate is unverified until phone testing.

### Fallback renderer

\`src/lib/spriteRenderer.ts\` now draws **human-shaped articulated stick figures** using Canvas 2D with limb outlines and highlights if WebGL, Three.js loading or context creation fails. There is no dot/sphere fallback and no health bar in either path.

The previous Pixi circle sprite renderer remains in the repo for compatibility but is no longer called by the live battle component.

### Hidden health

Combat health remains in the data model because it determines knockouts. Neither renderer draws HP meters. The Atomic team scoreboard also omits the thin health-style meter formerly shown beneath each side; match statistics such as standing fighter counts and a momentum comparison remain available.

### Performance and lifecycle

- Dynamically import the Three.js renderer only for active battle views, keeping the app shell smaller.
- Allocate instanced geometry for the active preset's initial total and reuse it.
- Mark dead fighter transforms invisible instead of rebuilding geometry every frame.
- Free WebGL resources on unmount/preset switch.
- Resize the orthographic camera and transparent unit canvas when viewport changes or the Galaxy Fold screen opens.
- Keep the same camera zoom/pan and arena-touch hitboxes; meteor strikes remain driven by 2D simulation positions.

## External technical references

These are primary Three.js sources, not claims of copying anyone's copyrighted fighter models.

1. Three.js [InstancedMesh API](https://threejs.org/docs/pages/InstancedMesh.html): GPU instancing reduces draw calls and supports per-unit matrices and colors.
2. Three.js [OrthographicCamera API](https://threejs.org/docs/pages/OrthographicCamera.html): constant on-screen sizes and 2D-world alignment.
3. Three.js [WebGLRenderer API](https://threejs.org/docs/pages/WebGLRenderer): alpha transparency, renderer and canvas size management.
4. Three.js [Making a canvas transparent](https://threejs.org/manual/pages/tips.html): WebGL overlay blending.
5. Arm [Optimization advice for graphics content on mobile devices](https://documentation-service.arm.com/static/65952df1159ca73387227425?token=): low-poly models and avoiding excessive tiny triangles.

## Validation

\`npm test\` runs deterministic anatomy, gait, reduced-motion and palette tests in addition to the existing Atomic crowd-physics suite. GitHub CI also checks TypeScript and builds Vite output.

Automated checks cannot establish real-world frame rates or ergonomic results on the user's Galaxy Fold 5. Those require device-level play testing.

## Future graphics upgrades

Retain the request to consult current GitHub code and outside technical sources. Improvements to 3D fights should be made only after measuring runtime cost and verifying the intended look, rather than assuming full 3D ragdoll physics is feasible for thousands of figures on mobile.
