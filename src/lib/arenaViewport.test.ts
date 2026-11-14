import { describe, expect, it } from "vitest";
import { fitArenaViewport } from "./arenaViewport";

describe("TLC Atomic Fold / in-app browser layout", () => {
  it("reserves space for expanded browser and Samsung taskbar", () => {
    const view = fitArenaViewport(970, 815, 0);
    expect(view.height).toBe(815);
    expect(view.top).toBe(0);
    expect(view.compact).toBe(false);
  });

  it("fits short Fold landscape visible screen and enables compact layout", () => {
    const view = fitArenaViewport(565, 434, 0);
    expect(view.height).toBe(434);
    expect(view.compact).toBe(true);
    expect(view.tiny).toBe(true);
  });

  it("subtracts visual offset when browser visual viewport is shifted", () => {
    const view = fitArenaViewport(730, 690, 60);
    expect(view.top).toBe(60);
    expect(view.height).toBe(670);
  });

  it("never extends beyond layout viewport even with invalid measurements", () => {
    expect(fitArenaViewport(500, 700).height).toBe(500);
    expect(fitArenaViewport(500, Number.NaN).height).toBe(500);
    expect(fitArenaViewport(500, 200, 400).height).toBe(100);
  });

  it("falls back to a valid viewport when the browser API is unavailable", () => {
    const view = fitArenaViewport(640);
    expect(view.height).toBe(640);
    expect(view.compact).toBe(true);
    expect(view.tiny).toBe(false);
  });
});
