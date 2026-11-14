import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Play, Sparkles, Swords, Zap } from "lucide-react";
import "./Index.css";
import "./AtomicUpgrade.css";
import { CROWD_PRESETS } from "@/lib/battleBalance";

const modes = CROWD_PRESETS.map((p, index) => ({
  ...p,
  eyebrow: ["01 / POWER VS NUMBERS", "02 / MASSIVE FRONTLINE", "03 / THE ODDS", "04 / ENDURANCE"][index],
  size: p.men.toLocaleString() + " MEN VS " + p.women.toLocaleString() + " WOMEN",
  copy: p.tagline + ". Men hit harder individually; women field more fighters.",
  theme: ["blue", "pink", "gold", "purple"][index],
}));

const Horde = () => (
  <div className="tlc-app tlc-atomic tlc-atomic-modes">
    <header className="tlc-topbar">
      <Link to="/" className="tlc-brand" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="tlc-brand-symbol"><span>T</span><span>✦</span></div>
        <div><div className="tlc-brand-title">TLC <strong>BATTLE</strong></div><div className="tlc-brand-subtitle">THE ATOMIC EDITION <span>•</span> 2026</div></div>
      </Link>
      <Link to="/" className="tlc-utility" style={{ textDecoration: "none" }}><ArrowLeft size={16} /> BACK TO ARENA</Link>
    </header>
    <main className="tlc-main tlc-mode-page">
      <div className="tlc-eyebrow"><Sparkles size={14} /> ATOMIC / MATCH SELECT</div>
      <h1>SELECT YOUR <span>BATTLE.</span></h1>
      <p className="tlc-mode-description">Four ways to settle the world's most unnecessary debate. Every mode launches a real, playable battle simulation.</p>
      <div className="tlc-mode-grid">
        {modes.map(mode => <Link key={mode.id} to={"/?preset=" + mode.id} className={"tlc-mode-card " + mode.theme}>
          <div className="tlc-mode-card-top"><span>{mode.eyebrow}</span><ArrowUpRight size={19} /></div>
          <div className="tlc-mode-card-emoji">{mode.icon}</div>
          <h2>{mode.name}</h2>
          <div className="tlc-mode-card-size"><Swords size={15} /> {mode.size}</div>
          <p>{mode.copy}</p>
          <div className="tlc-mode-card-launch"><Play size={15} fill="currentColor" /> ENTER THIS ARENA <ArrowUpRight size={15} /></div>
        </Link>)}
      </div>
      <div className="tlc-mode-note"><Zap size={18} /><div><strong>ALL MODES ARE PLAYABLE RIGHT NOW.</strong><span>Choose a preset, then press Start Battle. Power-ups, reactions and shareable posters are available in every mode.</span></div></div>
    </main>
  </div>
);

export default Horde;
