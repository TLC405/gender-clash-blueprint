import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("TLC original-only spoken announcer and production release", () => {
  it("never substitutes phone text-to-speech or runtime paid TTS for ElevenLabs", () => {
    const source = readFileSync(new URL("./battleNarrator.ts", import.meta.url), "utf8");
    expect(source).toContain("playVoiceCue");
    expect(source).toContain("ELEVEN_VOICE_SCRIPT");
    expect(source).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance|speakPremium|isPremiumAvailable|supabase/i);
  });

  it("shows an honest pending voice state rather than an inactive but clickable toggle", () => {
    const source = readFileSync(new URL("../pages/Index.tsx", import.meta.url), "utf8");
    expect(source).toContain("disabled={!elevenAudioReady}");
    expect(source).toContain("no phone-generated announcer");
  });

  it("requires all fourteen original files to decode before reporting success", () => {
    const source = readFileSync(new URL("../lib/battleAudio.ts", import.meta.url), "utf8");
    expect(source).toContain("ELEVEN_SFX.length + ELEVEN_VOICES.length");
    expect(source).toContain("await Promise.all");
    expect(source).toContain("decoded.some");
    expect(source).toContain("packReady = true");
  });

  it("does not trigger unconfigured GitHub Pages publishing from main", () => {
    const workflow = readFileSync(new URL("../../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
    expect(workflow).toContain("TLC_ENABLE_PAGES");
  });
});
