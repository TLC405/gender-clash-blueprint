/**
 * TLC Battlecast — original, sample-free game audio.
 * Generates 7 PCM WAV sound effects during npm run build (NOT on the phone).
 * No paid generation, no API key, no stock samples, no runtime network call.
 *
 * Each sound is synthesized from seeded noise, swept oscillators, envelopes,
 * soft saturation, and timed echoes. This is original procedural audio.
 */
import fs from "node:fs";
import path from "node:path";

const SR = 44100;
const OUT = path.resolve("public/audio/tlc");
fs.mkdirSync(OUT, { recursive: true });
let seed = 1162026;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function noise() { return random() * 2 - 1; }
function env(t, attack = .003, decay = .12) {
  return Math.min(1, t / Math.max(.0001, attack)) * Math.exp(-t / Math.max(.001, decay));
}
function create(duration) {
  return new Float32Array(Math.round(duration * SR));
}
function osc(target, at, duration, fromHz, toHz, gain, decay = .14, attack = .002, shape = "sine") {
  let phase = 0;
  const start = Math.max(0, Math.floor(at * SR));
  const len = Math.min(target.length - start, Math.round(duration * SR));
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    const u = j / len;
    const f = toHz + (fromHz - toHz) * Math.exp(-u * 4);
    phase += 2 * Math.PI * f / SR;
    const tone = shape === "brass"
      ? Math.sin(phase) + .34 * Math.sin(2 * phase) + .12 * Math.sin(3 * phase)
      : Math.sin(phase);
    target[start + j] += tone * gain * env(t, attack, decay);
  }
}
function hiss(target, at, duration, gain, decay, cut = 0.24, high = false) {
  const start = Math.max(0, Math.floor(at * SR));
  const len = Math.min(target.length - start, Math.round(duration * SR));
  let filtered = 0;
  for (let j = 0; j < len; j++) {
    const n = noise();
    filtered += cut * (n - filtered);
    const sound = high ? n - filtered : filtered;
    target[start + j] += sound * gain * env(j / SR, .001, decay);
  }
}
function echo(target, delay = .07, gain = .18, repeats = 3) {
  const shift = Math.round(delay * SR);
  const original = target.slice();
  for (let n = 1; n <= repeats; n++) {
    const offset = shift * n;
    for (let i = 0; i < target.length - offset; i++) {
      target[i + offset] += original[i] * Math.pow(gain, n);
    }
  }
}
function write(name, samples) {
  const n = samples.length;
  const fade = Math.min(Math.round(.012 * SR), Math.floor(n / 4));
  for (let i = 0; i < fade; i++) {
    samples[i] *= i / fade;
    samples[n - 1 - i] *= i / fade;
  }
  let peak = 0;
  for (const value of samples) {
    peak = Math.max(peak, Math.abs(Math.tanh(value * 1.35)));
  }
  const scale = .80 / Math.max(peak, .001);
  const wav = Buffer.allocUnsafe(44 + n * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + n * 2, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);     // PCM fmt chunk
  wav.writeUInt16LE(1, 20);      // PCM
  wav.writeUInt16LE(1, 22);      // mono
  wav.writeUInt32LE(SR, 24);
  wav.writeUInt32LE(SR * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    wav.writeInt16LE(Math.round(Math.tanh(samples[i] * 1.35) * scale * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, name + ".wav"), wav);
  console.log("TLC original SFX:", name, (n / SR).toFixed(2) + "s", wav.byteLength, "bytes");
}
{
  const x = create(.32);
  osc(x, 0, .32, 1750, 220, .52, .023);
  osc(x, .012, .24, 390, 310, .20, .075);
  hiss(x, 0, .1, .18, .015, .18, true);
  write("ui_click", x);
}
{
  const x = create(3.1);
  for (const [f, a, d] of [[340, .49, 1.8], [442, .22, 1.3], [615, .17, 1.36], [943, .1, .84], [1413, .08, .6], [1792, .045, .5]]) {
    osc(x, 0, 3.08, f, f, a, d, .004);
  }
  hiss(x, 0, .1, .18, .035);
  echo(x, .13, .20, 4);
  write("arena_bell", x);
}
{
  const x = create(.46);
  osc(x, 0, .35, 180, 64, .63, .082);
  hiss(x, 0, .15, .35, .021);
  hiss(x, 0, .09, .16, .012, .11, true);
  write("light_hit", x);
}
{
  const x = create(.82);
  osc(x, 0, .65, 119, 44, .70, .20);
  osc(x, .01, .63, 59, 48, .34, .22);
  hiss(x, 0, .42, .43, .095, .075);
  hiss(x, .012, .12, .17, .024, .11, true);
  write("heavy_hit", x);
}
{
  const x = create(3.2);
  for (let i = 0; i < 25; i++) {
    const onset = .08 + i * .072 + (random() - .5) * .015;
    osc(x, onset, .095, 100 + random() * 70, 78, .042, .032);
    hiss(x, onset, .065, .065, .022);
  }
  for (let i = 0; i < 25; i++) {
    const onset = .15 + i * .055;
    hiss(x, onset, .33, .017 + (i / 25) * .03, .17, .16, true);
  }
  osc(x, 1.62, 1.45, 155, 44, .87, .25);
  hiss(x, 1.63, 1.2, .45, .22, .06);
  echo(x, .11, .14, 2);
  write("crowd_clash", x);
}
{
  const x = create(3.8);
  osc(x, 0, 1.85, 250, 1500, .16, 1.15);
  for (let i = 0; i < 15; i++) {
    hiss(x, .11 + i * .10, .42, .035 + i * .014, .3, .1, true);
  }
  osc(x, 1.65, 2.07, 170, 35, .79, .55);
  hiss(x, 1.65, 1.80, .6, .30, .075);
  hiss(x, 1.65, .9, .21, .18, .18, true);
  for (let i = 0; i < 17; i++) {
    const at = 1.83 + random() * 1.2;
    osc(x, at, .11, 190 + random() * 480, 110, .035, .026);
  }
  echo(x, .1, .16, 3);
  write("meteor", x);
}
{
  const x = create(3.25);
  for (const [f, start] of [[293.66, 0], [369.99, .27], [440.0, .56]]) {
    osc(x, start, 3.23 - start, f, f, .19, 1.0, .014, "brass");
  }
  for (const at of [0, .27, .58, 1.17]) {
    osc(x, at, .42, 95, 45, .27, .12);
    hiss(x, at, .19, .16, .052);
  }
  osc(x, 1.6, .6, 1110, 1410, .03, .3);
  echo(x, .17, .23, 4);
  write("victory_sting", x);
}
const files = [
  "ui_click", "arena_bell", "light_hit", "heavy_hit", "crowd_clash", "meteor", "victory_sting"
];
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({
  status: "ready", provider: "TLC Original DSP", asset_type: "original-procedural",
  description: "Original TLC Battlecast sound effects generated at build time using sample-free signal synthesis. No AI provider or stock clips.",
  assets: Object.fromEntries(files.map(name => [name, name + ".wav"])),
}, null, 2) + "\n");
