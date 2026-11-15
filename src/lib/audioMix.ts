/** Independent audio channel mixing; no ElevenLabs secret or browser API call. */
export interface AudioMix { effects:number; voice:number; ui:number }
export const DEFAULT_AUDIO_MIX: AudioMix = {effects:0.8,voice:0.85,ui:0.65};
function volume(value:unknown, fallback:number):number {
  return typeof value==="number"&&Number.isFinite(value)
    ?Math.max(0,Math.min(1,value)):fallback;
}
export function normalizeAudioMix(value:unknown):AudioMix {
  const v=value&&typeof value==="object"?value as Partial<AudioMix>:{};
  return {
    effects:volume(v.effects,DEFAULT_AUDIO_MIX.effects),
    voice:volume(v.voice,DEFAULT_AUDIO_MIX.voice),
    ui:volume(v.ui,DEFAULT_AUDIO_MIX.ui),
  };
}
