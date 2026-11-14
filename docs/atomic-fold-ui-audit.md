# TLC Battlecast — Atomic Fold UI Sweep

## User screenshot evidence

Screenshot reviewed from the November 14, 2026 Fold/in-app-browser capture of `tlc-battle-atomic.onrender.com`. This audit is grounded in that screenshot, not a simulated phone run.

**Visible problems:**
- The bottom control dock begins at the bottom edge and is largely obscured by the phone's browser/taskbar. The user cannot reliably reach the Start/Pause, pace, mode, power, stats or share controls.
- Repeated SIM LIVE/broadcast labels and a tall scoreboard consume arena height.
- The broad red feed banner overlays the battle rather than complementing it.
- The old focus-camera icon did not remove mobile overlays; it merely hid the side stats panel, already hidden on smaller screens.
- Small stats said “100% remain” even after a fighter was eliminated, due to integer rounding.

## Root cause and fix

`src/pages/Index.css` sets `.tlc-app { min-height:100vh }`, which remained active inside `src/pages/OneScreen.css`'s `height:100dvh` cockpit. In mobile browsers where `100vh` is larger than the visible area, the minimum overrides the intended dynamic height and pushes the footer out of reach.

**Fixed:**
- Override the inherited minimum with `.tlc-app.tlc-one-screen.tlc-atomic { min-height:0 }`.
- Measure `window.visualViewport.height` and `offsetTop` plus `window.innerHeight` through the pure, tested `fitArenaViewport` helper. Set CSS variables to the visible height and top.
- Listen to resize, orientation-change, visual viewport resize and scroll. Update via requestAnimationFrame; clean up event listeners on unmount.
- Adjust breakpoint classes when visible height drops below 720px or 500px. Preserve the persistent dock, but compress scores and header to protect play space.
- Use CSS `env(safe-area-inset-bottom)` and dock-size variables for panel placement.
- Hide desktop Match Center sidebar below 1050px and make the Stats button open the in-place Match Center.
- Condense cam labels and feed graphics, with a broadcast **Focus view** that really hides clutter on mobile.
- Keep fighter outlines, colors, control functions, physics and the no-health-bar requirement unchanged.
- Change per-team details to exact KO and eliminated counts rather than a rounded percentage.

## External technical sources

- MDN: [CSS viewport length units](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length) explains why `vh` can represent the large viewport while `dvh` follows dynamic browser chrome.
- MDN: [VisualViewport API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) explains visual vs. layout viewport measurements and resize/scroll events.
- MDN: [CSS env() and safe area insets](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env) details safe-area spacing for fixed toolbars.
- MDN: [Viewport Segments API](https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API) covers foldable devices but remains limited-availability; do not rely on it as the only solution.

## Automated validation

`src/lib/arenaViewport.test.ts` validates:
1. Browser controls reduce visible viewport without hiding the dock.
2. Compact Fold landscape selects compressed layout.
3. Visual viewport offsets do not push content below the window.
4. Invalid and oversize measurements stay within the layout viewport.
5. Browsers without the API use a sensible fallback.

GitHub CI must complete TypeScript checking, Vitest regression tests and the Vite production build before merging.

## Device acceptance / remains to verify manually

- Fold 5: open, closed, portrait, landscape, and ChatGPT/Android in-app browser with expanded toolbar.
- At every state Start/Pause, Reset, 0.25/0.5/1x, Mods, Powers, Stats, Share, More **must remain visible and tappable** without page scrolling.
- Camera focus toggle must hide the feed, camera HUD and momentum bar, then restore them.
- Match Center pop-up must fit *above* the dock and scroll internally.
- Check gameplay during live battle, after win/loss, with system navigation/taskbar open, and on entering/exiting fullscreen.
- The screenshot is a diagnosis, not evidence that device testing has passed. No specific frame rate or fully verified Fold result is claimed.
