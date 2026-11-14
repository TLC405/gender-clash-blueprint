/**
 * TLC Atomic viewport measurement.
 * Browser address bars and Fold taskbars can make the visual viewport
 * smaller than CSS 100vh; reserve the *actually visible* height for the
 * fixed game cockpit and its bottom controls.
 *
 * Source: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
 */
export type ArenaViewport = {
  top: number;
  height: number;
  compact: boolean;
  tiny: boolean;
};

export function fitArenaViewport(
  layoutHeight: number,
  visualHeight?: number | null,
  visualOffsetTop = 0
): ArenaViewport {
  const layout = Number.isFinite(layoutHeight) && layoutHeight > 0 ? layoutHeight : 720;
  const offset = Number.isFinite(visualOffsetTop) ? Math.max(0, visualOffsetTop) : 0;
  const top = Math.min(offset, Math.max(0, layout - 1));
  const visible = typeof visualHeight === "number" && Number.isFinite(visualHeight) && visualHeight > 0
    ? visualHeight
    : layout;
  const height = Math.max(1, Math.floor(Math.min(visible, layout - top)));
  return { top, height, compact: height < 720, tiny: height < 500 };
}
