/**
 * Release gate: validate generated original WAV audio in the shipped Vite build.
 * Every cue must have real nonempty PCM data, not a JSON placeholder or 404.
 */
import fs from "node:fs";
import path from "node:path";
const cues = ["ui_click","arena_bell","light_hit","heavy_hit","crowd_clash","meteor","victory_sting","power_up","countdown","crowd_roar"];
const dir = path.resolve("dist/audio/tlc");
const manifest = JSON.parse(fs.readFileSync(path.join(dir,"manifest.json"),"utf8"));
if(manifest.status!=="ready" || manifest.provider!=="TLC Original DSP") throw new Error("Original pack is not marked ready");
for(const cue of cues) {
  const file=path.join(dir,manifest.assets[cue]||"missing.wav");
  const bytes=fs.readFileSync(file);
  if(bytes.length < 2000 || bytes.toString("ascii",0,4)!=="RIFF" || bytes.toString("ascii",8,12)!=="WAVE") throw new Error("Bad WAV header: "+cue);
  if(bytes.readUInt16LE(20)!==1 || bytes.readUInt16LE(22)!==1 || bytes.readUInt32LE(24)!==44100) throw new Error("Bad audio format: "+cue);
  if(bytes.readUInt32LE(40)+44 !== bytes.length) throw new Error("Incorrect PCM length: "+cue);
  console.log("PASS TLC original SFX",cue,bytes.length,"bytes");
}
console.log("Ten original TLC WAV effects verified in production dist.");
