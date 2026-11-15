import {describe,expect,it} from "vitest";
import {DEFAULT_AUDIO_MIX,normalizeAudioMix} from "./audioMix";
import {readFileSync} from "node:fs";

describe("TLC critical audio mix",()=>{
  it("keeps effects, commentary and UI levels separate",()=>{
    expect(Object.keys(DEFAULT_AUDIO_MIX).sort()).toEqual(["effects","ui","voice"]);
    expect(normalizeAudioMix({effects:0,ui:1,voice:.4})).toEqual({effects:0,ui:1,voice:.4});
  });
  it("clamps bad values and uses safe defaults",()=>{
    expect(normalizeAudioMix({effects:2,voice:-1,ui:Number.NaN})).toEqual({
      effects:1,voice:0,ui:DEFAULT_AUDIO_MIX.ui,
    });
    expect(normalizeAudioMix(null)).toEqual(DEFAULT_AUDIO_MIX);
  });
  it("keeps custom ElevenLabs audio pending until provider generates actual files",()=>{
    const manifest=JSON.parse(readFileSync(new URL("../../public/audio/elevenlabs/manifest.json",import.meta.url),"utf8"));
    expect(manifest.status).toBe("awaiting_generation");
    expect(manifest.assets).toEqual({});
  });
  it("never sends ElevenLabs API keys from browser source",()=>{
    const source=readFileSync(new URL("./battleAudio.ts",import.meta.url),"utf8");
    expect(source).not.toMatch(/api\.elevenlabs\.io|ELEVENLABS_API_KEY|xi-api-key/);
    expect(source).toContain("playImpacts");
    expect(source).toContain("voiceDucking");
  });
});
