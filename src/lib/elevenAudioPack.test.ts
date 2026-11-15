import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ELEVEN_SFX, ELEVEN_VOICES, ELEVEN_VOICE_SCRIPT,
  getReadyAudioFiles, validAudioFilename,
} from "./elevenAudioPack";

describe("TLC ElevenLabs production audio pack", () => {
  it("identifies seven original SFX and seven authored voice cues", () => {
    expect(ELEVEN_SFX).toHaveLength(7);
    expect(ELEVEN_VOICES).toHaveLength(7);
    expect(Object.keys(ELEVEN_VOICE_SCRIPT)).toHaveLength(7);
  });

  it("does not claim any licensed custom audio is ready while assets are pending", () => {
    const manifest = JSON.parse(readFileSync(
      new URL("../../public/audio/elevenlabs/manifest.json", import.meta.url), "utf8"
    ));
    expect(manifest.status).toBe("awaiting_generation");
    expect(getReadyAudioFiles(manifest)).toEqual({});
  });

  it("accepts only trusted local sound files and refuses traversal or external scripts", () => {
    expect(validAudioFilename("light_hit.mp3")).toBe(true);
    expect(validAudioFilename("voice_opening.ogg")).toBe(true);
    expect(validAudioFilename("../secret.mp3")).toBe(false);
    expect(validAudioFilename("https://host/foo.mp3")).toBe(false);
    expect(validAudioFilename("attack.mp3?key=secret")).toBe(false);
    expect(validAudioFilename("x.js")).toBe(false);
  });

  it("selects only recognized cue names from a ready manifest", () => {
    const files = getReadyAudioFiles({
      status: "ready", provider: "ElevenLabs",
      assets: {
        light_hit: "light_hit.mp3",
        opening: "opening.mp3",
        meteor: "../escape.mp3",
        unknown: "other.mp3",
      },
    });
    expect(files).toEqual({ light_hit: "light_hit.mp3", opening: "opening.mp3" });
  });
});

describe("TLC clean game field layout", () => {
  it("leaves gameplay canvas free of floating text and scorebug overlays", () => {
    const source = readFileSync(new URL("../pages/Index.tsx", import.meta.url), "utf8");
    const begin = source.indexOf('<div className="tlc-cockpit-field">');
    const end = source.indexOf('<div className="tlc-atomic-commentary-rail"', begin);
    expect(begin).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(begin);
    const field = source.slice(begin, end);
    expect(field).toContain("<BattleSimulation");
    expect(field).not.toMatch(/tlc-cockpit-ticker|tlc-cockpit-field-top|tlc-cockpit-spotlight|tlc-cockpit-idle/);
    expect(field).not.toMatch(/<h1|<p>|<strong/);
  });

  it("does not render MEN/WOMEN lettering inside the simulation canvas", () => {
    const source = readFileSync(
      new URL("../components/BattleSimulationEnhanced.tsx", import.meta.url), "utf8"
    );
    expect(source).not.toContain("ctx.fillText('MEN'");
    expect(source).not.toContain("ctx.fillText('WOMEN'");
  });
});
