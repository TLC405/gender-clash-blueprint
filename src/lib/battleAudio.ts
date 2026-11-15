/**
 * TLC Battlecast audio director.
 * Supports the pre-generated, reviewed ElevenLabs audio bank without exposing
 * ElevenLabs credentials to browsers or generating during gameplay.
 *
 * While the ElevenLabs flow is awaiting its assets, the original CC0 Kenney
 * impacts remain the explicit, temporary fallback (NOT labeled ElevenLabs).
 */
import { Howl } from "howler";
import {
  ELEVEN_SFX, ELEVEN_VOICES, getReadyAudioFiles, type ElevenCue,
  type ElevenSfx, type ElevenVoice,
} from "./elevenAudioPack";

let effectsEnabled = true;
let lastImpactAt = 0;
let lastUIClickAt = 0;
let lastVoiceAt = 0;
let lastNamedCueAt = 0;
let currentVoice: Howl | null = null;
const custom = new Map<ElevenCue, Howl>();
let packPromise: Promise<boolean> | null = null;
let packReady = false;

let legacyClashes: Howl[] | null = null;
let legacyPunches: Howl[] | null = null;
let legacyBell: Howl | null = null;

function legacy() {
  if (legacyClashes) return;
  const base = import.meta.env.BASE_URL;
  legacyClashes = ["000", "001", "002"].map(n => new Howl({
    src: [base + "sfx/impactMetal_light_" + n + ".ogg"], volume: 0.22,
  }));
  legacyPunches = ["000", "001"].map(n => new Howl({
    src: [base + "sfx/impactPunch_medium_" + n + ".ogg"], volume: 0.25,
  }));
  legacyBell = new Howl({ src: [base + "sfx/impactBell_heavy_000.ogg"], volume: 0.5 });
}

function createCue(cue: ElevenCue, file: string): Howl {
  const base = import.meta.env.BASE_URL + "audio/elevenlabs/";
  const isVoice = ELEVEN_VOICES.includes(cue as ElevenVoice);
  return new Howl({
    src: [base + file],
    html5: false,
    preload: true,
    volume: isVoice ? 0.72 : cue === "meteor" ? 0.65 : cue === "ui_click" ? 0.2 : 0.4,
    onloaderror: () => {
      custom.delete(cue);
      console.warn("[TLC Audio] Custom cue unavailable:", cue);
    },
  });
}

export function primeElevenLabsAudio(): Promise<boolean> {
  if (packPromise) return packPromise;
  packPromise = (async () => {
    try {
      const response = await fetch(import.meta.env.BASE_URL + "audio/elevenlabs/manifest.json");
      if (!response.ok) return false;
      const files = getReadyAudioFiles(await response.json());
      // Never mix partially generated packs with the temporary stock bank.
      if (Object.keys(files).length !== ELEVEN_SFX.length + ELEVEN_VOICES.length) return false;
      for (const [cue, filename] of Object.entries(files) as [ElevenCue, string][]) {
        custom.set(cue, createCue(cue, filename));
      }
      packReady = true;
      return true;
    } catch {
      return false;
    }
  })();
  return packPromise;
}

export function isElevenLabsPackReady(): boolean { return packReady; }

export function setSoundEnabled(on: boolean): void {
  // Mute effects independently; voice remains governed by commentary setting.
  effectsEnabled = on;
  void primeElevenLabsAudio();
}

function customSound(cue: ElevenSfx, volume?: number): boolean {
  const sound = custom.get(cue);
  if (!effectsEnabled || !sound) return false;
  const id = sound.play();
  if (typeof volume === "number") sound.volume(volume, id);
  return true;
}

export function playKills(count: number): void {
  if (!effectsEnabled || count <= 0) return;
  void primeElevenLabsAudio();
  const now = performance.now();
  if (now - lastImpactAt < 105) return;
  lastImpactAt = now;
  if (customSound(count >= 4 ? "heavy_hit" : "light_hit")) return;
  legacy();
  const pool = Math.random() < .5 ? legacyClashes! : legacyPunches!;
  const sound = pool[Math.floor(Math.random() * pool.length)];
  const id = sound.play();
  sound.rate(0.88 + Math.random() * .24, id);
}
export function playBell(): void {
  if (!effectsEnabled) return;
  void primeElevenLabsAudio();
  if (customSound("arena_bell")) return;
  legacy();
  legacyBell?.play();
}
export function playClash(): void {
  if (!effectsEnabled) return;
  void primeElevenLabsAudio();
  customSound("crowd_clash");
}
export function playMeteor(): void {
  if (!effectsEnabled) return;
  void primeElevenLabsAudio();
  if (performance.now() - lastNamedCueAt < 700) return;
  lastNamedCueAt = performance.now();
  customSound("meteor");
}
export function playVictory(): void {
  if (!effectsEnabled) return;
  void primeElevenLabsAudio();
  customSound("victory_sting");
}
export function playUiClick(): void {
  if (!effectsEnabled) return;
  void primeElevenLabsAudio();
  const now = performance.now();
  if (now - lastUIClickAt < 100) return;
  lastUIClickAt = now;
  customSound("ui_click");
}

export function playVoiceCue(cue: ElevenVoice): boolean {
  void primeElevenLabsAudio();
  const sound = custom.get(cue);
  if (!sound) return false;
  const now = performance.now();
  const isFinal = cue === "men_win" || cue === "women_win";
  // A throttled premium cue must not accidentally trigger the old TTS fallback.
  if (!isFinal && now - lastVoiceAt < 7500) return true;
  lastVoiceAt = now;
  if (currentVoice) currentVoice.stop();
  currentVoice = sound;
  sound.play();
  return true;
}
export function stopVoiceCue(): void {
  currentVoice?.stop();
  currentVoice = null;
}
