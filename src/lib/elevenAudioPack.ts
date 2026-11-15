/**
 * Offline ElevenLabs game-audio library.
 *
 * Text-to-sound effects and speech are GENERATED ONCE, then reviewed and
 * bundled as static files. NEVER expose ElevenLabs API keys in the browser.
 * Manifest remains "awaiting_generation" until real, licensed assets exist.
 */
export const ELEVEN_SFX = [
  "ui_click", "arena_bell", "light_hit", "heavy_hit",
  "crowd_clash", "meteor", "victory_sting",
] as const;
export const ELEVEN_VOICES = [
  "opening", "clash", "men_surge", "women_surge",
  "overtime", "men_win", "women_win",
] as const;
export type ElevenSfx = typeof ELEVEN_SFX[number];
export type ElevenVoice = typeof ELEVEN_VOICES[number];
export type ElevenCue = ElevenSfx | ElevenVoice;

export const ELEVEN_VOICE_SCRIPT: Record<ElevenVoice, string> = {
  opening: "Welcome to TLC Battlecast! Blue corner versus pink corner. The Atomic arena is ready. Let the battle begin!",
  clash: "Here comes the collision! Both armies are charging straight into the frontline!",
  men_surge: "Blue corner is surging! Those heavier hitters are pushing forward!",
  women_surge: "Pink corner is pushing back! The numbers advantage is taking over!",
  overtime: "The clock has expired. This is the final stretch. Every fighter counts!",
  men_win: "Team Men takes the victory! What a battle!",
  women_win: "Team Women takes the victory! Unbelievable finish!",
};

export interface ElevenAudioManifest {
  status: "awaiting_generation" | "ready";
  provider: "ElevenLabs";
  assets: Partial<Record<ElevenCue, string>>;
}

/** Defend against directory traversal and accidentally trusting remote URLs. */
export function validAudioFilename(filename: unknown): filename is string {
  return typeof filename === "string" &&
    /^[a-z][a-z0-9_-]{1,40}\.(mp3|ogg|wav)$/.test(filename);
}

export function getReadyAudioFiles(manifest: unknown): Partial<Record<ElevenCue, string>> {
  if (!manifest || typeof manifest !== "object") return {};
  const value = manifest as Partial<ElevenAudioManifest>;
  if (value.status !== "ready" || value.provider !== "ElevenLabs" || !value.assets) return {};
  const recognized: Partial<Record<ElevenCue, string>> = {};
  for (const cue of [...ELEVEN_SFX, ...ELEVEN_VOICES]) {
    const file = value.assets[cue];
    if (validAudioFilename(file)) recognized[cue] = file;
  }
  return recognized;
}
