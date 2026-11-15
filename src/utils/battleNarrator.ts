/**
 * TLC Battlecast original broadcast commentary.
 *
 * Only the reviewed, bundled ElevenLabs voices may make spoken announcements.
 * Until the complete ElevenLabs pack is licensed, generated and downloaded,
 * return captions without attempting paid backend TTS or phone synthesizers.
 * All captions render OUTSIDE the fighting field in the commentary rail.
 */
import { playVoiceCue, stopVoiceCue } from "@/lib/battleAudio";
import { ELEVEN_VOICE_SCRIPT, type ElevenVoice } from "@/lib/elevenAudioPack";

export type NarratorContext =
  | "menLead" | "womenLead" | "tie" | "clash"
  | "phalanxForm" | "phalanxBreak" | "powerupSpawn"
  | "victoryMen" | "victoryWomen" | "standPhase"
  | "meleePhase" | "suddenDeath";

export const elevenCueForContext: Readonly<Record<NarratorContext, ElevenVoice>> = {
  menLead: "men_surge",
  womenLead: "women_surge",
  tie: "clash",
  clash: "clash",
  phalanxForm: "opening",
  phalanxBreak: "clash",
  powerupSpawn: "clash",
  victoryMen: "men_win",
  victoryWomen: "women_win",
  standPhase: "opening",
  meleePhase: "clash",
  suddenDeath: "overtime",
};

/** One approved narration line per actual game event. Never fake speech. */
export const speak = (context: NarratorContext, enabled = true): string | undefined => {
  if (!enabled) return;
  const cue = elevenCueForContext[context];
  playVoiceCue(cue); // Plays only if its approved local audio file exists.
  return ELEVEN_VOICE_SCRIPT[cue]; // Always available as outside-field caption.
};

export const stopSpeaking = (): void => { stopVoiceCue(); };

/** Kept for older consumers; speech source is now strictly ElevenLabs. */
export const setPremiumVoice = (_enabled: boolean): void => {};
