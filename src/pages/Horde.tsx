import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Play, Sparkles, Swords, Zap } from "lucide-react";
import "./Index.css";

const modes = [
  { id: "classic", icon: "⚔️", name: "THE CLASSIC", eyebrow: "01 / THE ORIGINAL", size: "500 VS 500", copy: "A timeless battle of egos. No excuses. No mercy. Just the original showdown.", theme: "blue" },
  { id: "chaos", icon: "💥", name: "TOTAL CHAOS", eyebrow: "02 / MAXIMUM MAYHEM", size: "1,200 VS 1,200", copy: "The arena is packed. The stakes are imaginary. The spectacle is very, very real.", theme: "pink" },
  { id: "upset", icon: "👀", name: "THE UPSET", eyebrow: "03 / ODDS DEFIED", size: "350 VS 800", copy: "The most disrespectful matchup on the schedule. Can the underdogs survive?", theme: "gold" },
  { id: "last-stand", icon: "🔥", name: "LAST STAND", eyebrow: "04 / FAST & FURIOUS", size: "120 VS 120", copy: "A smaller cast. A bigger spotlight. Blink and you'll miss the plot twist.", theme: "purple" },
];

const Horde = () => (
  <div className="tlc-app">
    <header className="tlc-topbar">
      <Link to="/" className="tlc-brand" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="tlc-brand-symbol"><span>T</span><span>✦</span></div>
        <div><div className="tlc-brand-title">TLC <strong>BATTLE</strong></div><div className="tlc-brand-subtitle">THE BATTLE CLUB <span>•</span> EST. 2026</div></div>
      </Link>
      <Link to="/" className="tlc-utility" style={{ textDecoration: "none" }}><ArrowLeft size={16} /> BACK TO ARENA</Link>
    </header>
    <main className="tlc-main tlc-mode-page">
      <div className="tlc-eyebrow"><Sparkles size={14} /> PICK YOUR PROBLEM</div>
      <h1>CHOOSE YOUR <span>CHAOS.</span></h1>
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
