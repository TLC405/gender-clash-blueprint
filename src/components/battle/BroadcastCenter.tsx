import { useState } from "react";
import { Activity, BarChart3, Clock3, Flame, Radio, TrendingUp, Zap } from "lucide-react";
import type { BattlePhase } from "@/lib/battlePhysics";
import "./BroadcastCenter.css";

export type BroadcastStats = {
  menAlive: number;
  womenAlive: number;
  menKills: number;
  womenKills: number;
};

export type BroadcastMoment = {
  id: number;
  at: number;
  title: string;
  detail: string;
  icon: string;
  team?: "men" | "women";
};

export type BroadcastSnapshot = {
  time: number;
  men: number;
  women: number;
};

interface BroadcastCenterProps {
  stats: BroadcastStats;
  menStart: number;
  womenStart: number;
  moments: BroadcastMoment[];
  history: BroadcastSnapshot[];
  timeRemaining: number;
  matchDuration: number;
  phase: BattlePhase;
  isRunning: boolean;
  winner: "men" | "women" | null;
  battleSpeed: number;
  hype: number;
}

const format = (n: number) => Math.max(0, Math.round(n)).toLocaleString();
const clock = (n: number) => Math.floor(n / 60) + ":" + String(Math.floor(n % 60)).padStart(2, "0");
const pct = (current: number, start: number) => start > 0 ? (100 * current / start) : 0;
type Tab = "overview" | "playbyplay" | "analytics";
const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "playbyplay", label: "PLAYS" },
  { id: "analytics", label: "TRENDS" },
];

function TrendChart({ history }: { history: BroadcastSnapshot[] }) {
  const series = history.slice(-80);
  const w = 300, h = 126, xpad = 10, ypad = 10;
  const path = (side: "men" | "women") =>
    series.map((s, i) => {
      const x = xpad + (i / Math.max(1, series.length - 1)) * (w - 2 * xpad);
      const y = ypad + (1 - s[side] / 100) * (h - 2 * ypad);
      return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }).join(" ");
  return (
    <div className="broadcast-trend">
      <div className="broadcast-trend-top"><strong>SURVIVAL THROUGH THE MATCH</strong><small>ACTUAL SIMULATION DATA</small></div>
      <svg viewBox="0 0 300 126" role="img" aria-label="Survival rate trend. Blue represents Men and pink represents Women." preserveAspectRatio="none">
        {[10, 36.5, 63, 89.5, 116].map((y, i) => <line key={i} x1="10" x2="290" y1={y} y2={y} stroke="rgba(235,240,255,.11)" strokeDasharray="3 6" />)}
        {series.length > 1 && <><path d={path("men")} fill="none" stroke="#62baff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /><path d={path("women")} fill="none" stroke="#ff75b6" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></>}
      </svg>
      <div className="broadcast-chart-legend"><span><i className="broadcast-men-dot" /> MEN</span><span><i className="broadcast-women-dot" /> WOMEN</span></div>
    </div>
  );
}

export function BroadcastCenter({ stats, menStart, womenStart, moments, history, timeRemaining, matchDuration, phase, isRunning, winner, battleSpeed, hype }: BroadcastCenterProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const menPct = pct(stats.menAlive, menStart);
  const womenPct = pct(stats.womenAlive, womenStart);
  const menShare = menPct + womenPct > 0 ? menPct / (menPct + womenPct) * 100 : 50;
  const totalKOs = stats.menKills + stats.womenKills;
  const elapsed = Math.max(0, matchDuration - timeRemaining);
  const lead = Math.abs(menPct - womenPct) < 1.5 ? "EVEN MATCH" : menPct > womenPct ? "MEN LEAD" : "WOMEN LEAD";
  const status = winner ? "FINAL" : isRunning ? "IN PROGRESS" : phase === "stand" && timeRemaining === matchDuration ? "PREGAME" : "PAUSED";

  return (
    <aside className="broadcast-center" aria-label="Live TLC Battle match center">
      <div className="broadcast-center-heading">
        <div className="broadcast-eyebrow"><Radio size={14} /> TLC MATCH CENTER</div>
        <div className="broadcast-center-status"><span className={isRunning ? "broadcast-live-light active" : "broadcast-live-light"} /> {status}</div>
      </div>
      <div className="broadcast-tabs" role="tablist" aria-label="Broadcast statistics">
        {tabs.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {tab === "overview" && <div role="tabpanel" className="broadcast-section">
        <div className="broadcast-card-hero">
          <div className="broadcast-stat-kicker"><Activity size={14} /> MATCH ADVANTAGE</div>
          <strong className="broadcast-lead">{lead}</strong>
          <div className="broadcast-share-bar" aria-label={"Men's relative survival advantage " + menShare.toFixed(0) + " percent"}><div style={{ width: menShare + "%" }} /><span /></div>
          <div className="broadcast-share-figures"><span>{menShare.toFixed(0)}% MEN</span><span>{(100 - menShare).toFixed(0)}% WOMEN</span></div>
          <p>Advantage is based on each side's surviving share, not a predicted winner.</p>
        </div>
        <div className="broadcast-stat-pair">
          <div><small>COMBINED KOs</small><strong>{format(totalKOs)}</strong><span><Zap size={12} /> FROM THIS MATCH</span></div>
          <div><small>FIGHTERS ACTIVE</small><strong>{format(stats.menAlive + stats.womenAlive)}</strong><span><Activity size={12} /> ON THE FIELD</span></div>
        </div>
        <div className="broadcast-comparison">
          <div className="broadcast-comparison-head"><span>MEN</span><strong>TEAM SURVIVAL</strong><span>WOMEN</span></div>
          <div className="broadcast-comparison-values"><strong>{menPct.toFixed(0)}%</strong><strong>{womenPct.toFixed(0)}%</strong></div>
          <div className="broadcast-split-bars"><div><span style={{ width: menPct + "%" }} /></div><div><span style={{ width: womenPct + "%" }} /></div></div>
        </div>
        <div className="broadcast-match-details">
          <div><span>MATCH CLOCK</span><strong>{clock(timeRemaining)}</strong></div>
          <div><span>PLAYED</span><strong>{clock(elapsed)}</strong></div>
          <div><span>PACE</span><strong>{battleSpeed}×</strong></div>
          <div><span>DRAMA METER</span><strong>{hype}%</strong></div>
        </div>
        <TrendChart history={history} />
      </div>}

      {tab === "playbyplay" && <div role="tabpanel" className="broadcast-section broadcast-plays">
        <div className="broadcast-section-title"><Clock3 size={15} /> PLAY-BY-PLAY <span>SIMULATED EVENTS</span></div>
        {moments.length ? <ol className="broadcast-play-list">
          {moments.map(item => <li key={item.id} className={item.team || ""}>
            <time>{clock(item.at)}</time><span className="broadcast-play-dot" />
            <div><strong>{item.icon} {item.title}</strong><p>{item.detail}</p></div>
          </li>)}
        </ol> : <div className="broadcast-empty"><Radio size={27} /><strong>NO PLAYS YET</strong><span>Start a match to see actual game events and turning points.</span></div>}
      </div>}

      {tab === "analytics" && <div role="tabpanel" className="broadcast-section">
        <div className="broadcast-section-title"><BarChart3 size={15} /> MATCH ANALYTICS</div>
        <TrendChart history={history} />
        <div className="broadcast-analytics-list">
          <div><span>MEN STARTED</span><strong>{format(menStart)}</strong></div>
          <div><span>WOMEN STARTED</span><strong>{format(womenStart)}</strong></div>
          <div><span>MEN ELIMINATIONS</span><strong className="men">{format(stats.menKills)}</strong></div>
          <div><span>WOMEN ELIMINATIONS</span><strong className="women">{format(stats.womenKills)}</strong></div>
          <div><span>AVERAGE KOs / MATCH MINUTE</span><strong>{elapsed > 10 ? (totalKOs / (elapsed / 60)).toFixed(1) : "—"}</strong></div>
          <div><span>CURRENT PHASE</span><strong>{phase.replace("_", " ").toUpperCase()}</strong></div>
          <div><span>DATA SOURCE</span><strong>LOCAL GAME ENGINE</strong></div>
        </div>
        <div className="broadcast-data-note"><TrendingUp size={15} /> No fabricated win odds, audiences, player records or league standings.</div>
      </div>}

      <div className="broadcast-center-footer"><Flame size={14} /> ORIGINAL TLC BATTLECAST <span>•</span> NO ACTUAL SPORTS AFFILIATION</div>
    </aside>
  );
}
