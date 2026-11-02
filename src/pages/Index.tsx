import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowUpRight, Camera, ChevronDown, ChevronUp, Clock3, Crown,
  Download, Eye, EyeOff, Flame, Maximize2, Minimize2, Pause, Play,
  Radio, RotateCcw, Settings2, Share2, Shield, Sparkles, Swords,
  Target, Trophy, Volume2, VolumeX, Zap
} from "lucide-react";
import { toast } from "sonner";
import BattleSimulation from "@/components/BattleSimulationEnhanced";
import { setSoundEnabled } from "@/lib/battleAudio";
import type { BattlePhase } from "@/lib/battlePhysics";
import { BroadcastCenter, type BroadcastSnapshot } from "@/components/battle/BroadcastCenter";
import "./Index.css";

type Team = "men" | "women";
type Stats = { menAlive: number; womenAlive: number; menKills: number; womenKills: number };
type Moment = { id: number; at: number; title: string; detail: string; icon: string; team?: Team };
type Preset = { id: string; name: string; tagline: string; men: number; women: number; speed: number; icon: string };

const PRESETS: Preset[] = [
  { id: "classic", name: "THE CLASSIC", tagline: "The original 500-on-500 grudge match", men: 500, women: 500, speed: 0.5, icon: "⚔️" },
  { id: "chaos", name: "TOTAL CHAOS", tagline: "2,400 fighters. Absolutely no chill.", men: 1200, women: 1200, speed: 0.5, icon: "💥" },
  { id: "upset", name: "THE UPSET", tagline: "350 vs 800. The odds are disrespectful.", men: 350, women: 800, speed: 0.5, icon: "👀" },
  { id: "last-stand", name: "LAST STAND", tagline: "Small teams. Big main-character energy.", men: 120, women: 120, speed: 0.75, icon: "🔥" },
];

const REACTIONS = ["🔥", "💀", "👑", "😂"];
const MATCH_DURATION = 240;
const INITIAL_QUIP = "Two teams. One arena. Unlimited bad decisions.";
const fmt = (n: number) => Math.max(0, Math.floor(n)).toLocaleString();
const clock = (seconds: number) => Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");

const Index = () => {
  const [presetId, setPresetId] = useState("classic");
  const [menArmySize, setMenArmySize] = useState(500);
  const [womenArmySize, setWomenArmySize] = useState(500);
  const [battleSpeed, setBattleSpeed] = useState(0.5);
  const [menRage, setMenRage] = useState(false);
  const [womenRage, setWomenRage] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [battleKey, setBattleKey] = useState(0);
  const [phase, setPhase] = useState<BattlePhase>("stand");
  const [timeRemaining, setTimeRemaining] = useState(MATCH_DURATION);
  const [stats, setStats] = useState<Stats>({ menAlive: 500, womenAlive: 500, menKills: 0, womenKills: 0 });
  const [winner, setWinner] = useState<Team | null>(null);
  const [narratorEnabled, setNarratorEnabled] = useState(false);
  const [soundEnabled, setAudioEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [spectatorMode, setSpectatorMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [meteorTrigger, setMeteorTrigger] = useState(0);
  const [meteorCharges, setMeteorCharges] = useState(3);
  const [hype, setHype] = useState(9);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [quip, setQuip] = useState(INITIAL_QUIP);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [history, setHistory] = useState<BroadcastSnapshot[]>([{ time: 0, men: 100, women: 100 }]);
  const [spotlight, setSpotlight] = useState<Moment | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const prevStatsRef = useRef<Stats | null>(null);
  const lastLeaderRef = useRef<Team | null>(null);
  const milestoneRef = useRef(new Set<number>());
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const timeRef = useRef(MATCH_DURATION);
  const lastHistoryAtRef = useRef(0);
  const momentIdRef = useRef(0);

  const selectedPreset = useMemo(() => PRESETS.find(p => p.id === presetId) || PRESETS[0], [presetId]);
  const menStrength = menArmySize ? stats.menAlive / menArmySize : 0;
  const womenStrength = womenArmySize ? stats.womenAlive / womenArmySize : 0;
  const momentum = menStrength + womenStrength > 0 ? Math.round((menStrength / (menStrength + womenStrength)) * 100) : 50;
  const elapsed = Math.max(0, MATCH_DURATION - timeRemaining);
  const isLive = isRunning && !winner;
  const phaseLabel = phase === "stand" ? "THE STANDOFF" : phase === "melee" ? "ALL-OUT MAYHEM" : phase === "sudden_death" ? "FINAL SHOWDOWN" : "MATCH COMPLETE";

  useEffect(() => { setSoundEnabled(soundEnabled); }, [soundEnabled]);
  useEffect(() => {
    if (!spotlight) return;
    const id = window.setTimeout(() => setSpotlight(null), 3400);
    return () => window.clearTimeout(id);
  }, [spotlight]);
  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => setHype(h => Math.max(8, h - 1)), 1200);
    return () => window.clearInterval(id);
  }, [isRunning]);
  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const recordMoment = useCallback((title: string, detail: string, icon = "⚡", team?: Team) => {
    const next: Moment = { id: ++momentIdRef.current, at: MATCH_DURATION - timeRef.current, title, detail, icon, team };
    setMoments(items => [next, ...items].slice(0, 12));
    setSpotlight(next);
    setQuip(detail);
  }, []);

  const handleStats = useCallback((next: Stats) => {
    setStats(next);
    const at = Math.max(0, MATCH_DURATION - timeRef.current);
    if (at - lastHistoryAtRef.current >= 3) {
      lastHistoryAtRef.current = at;
      setHistory(items => [...items.slice(-79), { time: at, men: 100 * next.menAlive / menArmySize, women: 100 * next.womenAlive / womenArmySize }]);
    }
    const previous = prevStatsRef.current;
    prevStatsRef.current = next;
    if (!startedRef.current || finishedRef.current || !previous) return;

    const newKills = Math.max(0, (next.menKills + next.womenKills) - (previous.menKills + previous.womenKills));
    if (newKills) setHype(h => Math.min(100, h + Math.min(10, Math.ceil(newKills / 3))));
    const total = menArmySize + womenArmySize;
    const eliminated = total - next.menAlive - next.womenAlive;
    for (const threshold of [0.15, 0.35, 0.6, 0.8]) {
      if (eliminated / total >= threshold && !milestoneRef.current.has(threshold)) {
        milestoneRef.current.add(threshold);
        const headline = threshold >= 0.8 ? "ABSOLUTE CARNAGE" : threshold >= 0.6 ? "THE ARENA IS MELTING" : threshold >= 0.35 ? "THIS GOT PERSONAL" : "FIRST BLOOD. BIG FEELINGS.";
        recordMoment(headline, fmt(eliminated) + " fighters down. The group chat is about to be unbearable.", threshold >= 0.6 ? "💥" : "⚡");
      }
    }

    const menRatio = next.menAlive / menArmySize;
    const womenRatio = next.womenAlive / womenArmySize;
    const lead: Team | null = Math.abs(menRatio - womenRatio) < 0.025 ? null : menRatio > womenRatio ? "men" : "women";
    if (lead && lastLeaderRef.current && lead !== lastLeaderRef.current) {
      recordMoment("THE PLOT TWIST!", (lead === "men" ? "The boys" : "The girls") + " just stole the momentum. Somebody check the receipts.", "🔄", lead);
      setHype(h => Math.min(100, h + 18));
    }
    if (lead) lastLeaderRef.current = lead;
    if (previous.menAlive / menArmySize > 0.2 && menRatio <= 0.2) recordMoment("BRO CODE: EMERGENCY", "Team Men is down to the final 20%. Time for the comeback montage.", "🛡️", "men");
    if (previous.womenAlive / womenArmySize > 0.2 && womenRatio <= 0.2) recordMoment("QUEENS NEVER QUIT", "Team Women is down to the final 20%. The finale just got spicy.", "👑", "women");
  }, [menArmySize, womenArmySize, recordMoment]);

  const resetBattle = useCallback((men: number, women: number) => {
    setIsRunning(false);
    setWinner(null);
    setPhase("stand");
    setTimeRemaining(MATCH_DURATION);
    timeRef.current = MATCH_DURATION;
    setStats({ menAlive: men, womenAlive: women, menKills: 0, womenKills: 0 });
    prevStatsRef.current = null;
    lastLeaderRef.current = null;
    milestoneRef.current.clear();
    startedRef.current = false;
    finishedRef.current = false;
    setMoments([]);
    setHistory([{ time: 0, men: 100, women: 100 }]);
    lastHistoryAtRef.current = 0;
    setSpotlight(null);
    setQuip(INITIAL_QUIP);
    setHype(9);
    setReactionCounts({});
    setMeteorCharges(3);
    setMeteorTrigger(0);
    setMenRage(false);
    setWomenRage(false);
    setBattleKey(k => k + 1);
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    if (isRunning) { toast.info("Pause or finish the match before changing arenas."); return; }
    setPresetId(preset.id);
    setMenArmySize(preset.men);
    setWomenArmySize(preset.women);
    setBattleSpeed(preset.speed);
    setPresetsOpen(false);
    resetBattle(preset.men, preset.women);
    toast.success(preset.name + " is ready.");
  }, [isRunning, resetBattle]);

  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get("preset");
    const found = PRESETS.find(p => p.id === preset);
    if (found && found.id !== "classic") applyPreset(found);
    // Read the optional deep-link only on initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    if (winner) return;
    if (!isRunning) {
      startedRef.current = true;
      if (phase === "stand") recordMoment("LET THE CHAOS BEGIN", "The arena is officially open. May the best group chat win.", "🎬");
    }
    setIsRunning(r => !r);
  };

  const handleVictory = useCallback((side: Team) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setWinner(side);
    setIsRunning(false);
    recordMoment(side === "men" ? "THE BROS TAKE THE CROWN" : "THE QUEENS OWN THE ARENA", "That was ridiculous. And yes, we are absolutely running it back.", "🏆", side);
    setHype(100);
  }, [recordMoment]);

  const handlePhase = useCallback((next: BattlePhase) => {
    setPhase(next);
    if (next === "melee" && startedRef.current) recordMoment("CONTACT! CONTACT!", "Nobody read the terms and conditions. It's officially chaos.", "💥");
    if (next === "sudden_death" && startedRef.current) recordMoment("FINAL 30 SECONDS", "Plot armor has left the building. This is the main event.", "⏱️");
  }, [recordMoment]);

  const handleTime = useCallback((t: number) => { timeRef.current = t; setTimeRemaining(t); }, []);
  const handleQuip = useCallback((text: string) => { if (text) setQuip(text); }, []);

  const useMeteorCharge = useCallback(() => {
    setMeteorCharges(n => Math.max(0, n - 1));
    setHype(h => Math.min(100, h + 14));
    recordMoment("METEOR IN THE GROUP CHAT", "Somebody pressed the dramatic button. Everybody act surprised.", "☄️");
  }, [recordMoment]);

  const dropMeteor = () => {
    if (!isLive || meteorCharges <= 0) return;
    useMeteorCharge();
    setMeteorTrigger(n => n + 1);
  };

  const react = (emoji: string) => {
    setReactionCounts(counts => ({ ...counts, [emoji]: (counts[emoji] || 0) + 1 }));
    setHype(h => Math.min(100, h + 6));
  };

  const shareText = () => "MEN vs WOMEN — TLC BATTLE ⚔️\n" +
    selectedPreset.name + " • " + clock(elapsed) + " elapsed\n" +
    "MEN " + fmt(stats.menAlive) + " (" + fmt(stats.menKills) + " KOs) vs WOMEN " + fmt(stats.womenAlive) + " (" + fmt(stats.womenKills) + " KOs)\n" +
    (winner ? "🏆 Winner: Team " + winner.toUpperCase() : "🔥 The battle is still on!") + "\n#TLCBattle #MenVsWomen";

  const shareRecap = async () => {
    const text = shareText();
    try {
      if (navigator.share) { await navigator.share({ title: "TLC Battle", text }); return; }
      await navigator.clipboard.writeText(text);
      toast.success("Battle recap copied.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("Sharing unavailable on this device.");
    }
  };

  const savePoster = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1920;
    const c = canvas.getContext("2d");
    if (!c) return;
    const bg = c.createLinearGradient(0, 0, 1080, 1920);
    bg.addColorStop(0, "#0c1224"); bg.addColorStop(0.5, "#090a13"); bg.addColorStop(1, "#240e20");
    c.fillStyle = bg; c.fillRect(0, 0, 1080, 1920);
    c.fillStyle = "rgba(65,168,255,.13)"; c.fillRect(0, 0, 540, 1920);
    c.fillStyle = "rgba(255,76,166,.13)"; c.fillRect(540, 0, 540, 1920);
    for (let i = 0; i < 16; i++) {
      c.strokeStyle = "rgba(255,255,255,.045)";
      c.beginPath(); c.moveTo(0, 130 + i * 108); c.lineTo(1080, 130 + i * 108); c.stroke();
    }
    c.textAlign = "center";
    c.fillStyle = "#e8b96d"; c.font = "bold 42px Arial"; c.fillText("TLC  /  THE BATTLE CLUB", 540, 230);
    c.fillStyle = "#ffffff"; c.font = "900 134px Impact, Arial Black, sans-serif"; c.fillText("MEN", 540, 510);
    c.fillStyle = "#e8b96d"; c.font = "900 86px Impact, Arial Black, sans-serif"; c.fillText("VS", 540, 625);
    c.fillStyle = "#ffffff"; c.font = "900 134px Impact, Arial Black, sans-serif"; c.fillText("WOMEN", 540, 755);
    c.fillStyle = "#ffffff"; c.font = "bold 36px Arial"; c.fillText(selectedPreset.name, 540, 905);
    c.fillStyle = "#54adff"; c.font = "900 138px Impact, Arial Black, sans-serif"; c.fillText(fmt(stats.menAlive), 270, 1145);
    c.fillStyle = "#ff63b2"; c.fillText(fmt(stats.womenAlive), 810, 1145);
    c.font = "bold 35px Arial"; c.fillStyle = "#8cc8ff"; c.fillText("MEN LEFT", 270, 1215);
    c.fillStyle = "#ffb1d8"; c.fillText("WOMEN LEFT", 810, 1215);
    c.fillStyle = "#ffffff"; c.font = "bold 42px Arial";
    c.fillText(winner ? "🏆 TEAM " + winner.toUpperCase() + " WINS" : "THE BATTLE IS ON", 540, 1430);
    c.fillStyle = "#e8b96d"; c.font = "bold 36px Arial"; c.fillText(clock(elapsed) + "  •  " + fmt(stats.menKills + stats.womenKills) + " TOTAL KOs", 540, 1515);
    c.fillStyle = "#d7d6e4"; c.font = "bold 40px Arial"; c.fillText("WHO'S TAKING THE W?", 540, 1680);
    c.fillStyle = "#e8b96d"; c.font = "bold 33px Arial"; c.fillText("#TLCBattle  #MenVsWomen", 540, 1770);
    canvas.toBlob(blob => {
      if (!blob) { toast.error("Couldn't generate the poster."); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "tlc-battle-" + presetId + ".png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("9:16 battle poster saved.");
    }, "image/png");
  };

  const exportLog = () => {
    const payload = { version: 1, game: "TLC Battle", preset: selectedPreset,
      teams: { men: menArmySize, women: womenArmySize }, durationSeconds: elapsed,
      winner, finalStats: stats, moments: [...moments].reverse() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "tlc-battle-match-log.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Match event log exported.");
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch { toast.error("Fullscreen isn't available here."); }
  };

  return (
    <div className="tlc-app">
      <header className="tlc-topbar">
        <div className="tlc-brand">
          <div className="tlc-brand-symbol"><span>T</span><span>✦</span></div>
          <div><div className="tlc-brand-title">TLC <strong>BATTLE</strong></div><div className="tlc-brand-subtitle">THE BATTLE CLUB <span>•</span> EST. 2026</div></div>
        </div>
        <nav className="tlc-nav" aria-label="Main navigation">
          <span className="tlc-nav-active">THE ARENA</span>
          <Link to="/horde">MODES</Link>
          <Link to="/leaderboards">LEADERBOARD</Link>
          <Link to="/settings">SETTINGS</Link>
        </nav>
        <div className="tlc-top-actions">
          <span className="tlc-status-dot" aria-hidden="true" />
          <span className="tlc-top-label">LOCAL SIMULATION</span>
          <span className="tlc-edition">SEASON 01 <span>/</span> ATOMIC EDITION</span>
        </div>
      </header>

      <main className="tlc-main">
        <div className="tlc-broadcast-brandbar"><div><span className="tlc-broadcast-sign">TLC <b>SPORTS</b></span><span className="tlc-broadcast-onair"><i/> BATTLECAST NETWORK</span></div><div className="tlc-broadcast-trailing">INTERACTIVE MATCH COVERAGE <span>•</span> ORIGINAL TLC GAMING</div></div>
        <div className="tlc-intro">
          <div><div className="tlc-eyebrow"><span className="tlc-gold-line" /> THE WORLD'S MOST UNNECESSARY RIVALRY</div>
            <h1>MEN <span>VS</span> WOMEN<span className="tlc-title-period">.</span></h1>
            <p>Two sides. Zero chill. One ridiculously cinematic showdown.</p></div>
          <div className="tlc-intro-right"><span>01 / THE MAIN EVENT</span><strong>{selectedPreset.name}</strong><small>{selectedPreset.tagline}</small></div>
        </div>

        <div className="tlc-broadcast-layout"><div className="tlc-broadcast-main">
        <section className="tlc-stage" ref={stageRef} aria-label="TLC Battle arena">
          <div className="tlc-match-meta-bar"><span><i/> TLC MATCHDAY <b>01</b></span><strong>{selectedPreset.name}</strong><span>{isLive ? "SIM LIVE" : winner ? "FINAL" : "STUDIO READY"} <span className="tlc-match-meta-divider">/</span> FOUR-MINUTE MATCH</span></div>
          <div className="tlc-scoreboard">
            <div className="tlc-score-side tlc-score-men">
              <div className="tlc-team-avatar">♂</div>
              <div className="tlc-score-content"><div className="tlc-score-kicker">THE BRO BRIGADE</div><div className="tlc-score-name">TEAM MEN</div><div className="tlc-score-meta"><span>{fmt(stats.menKills)} KOs</span><span>{Math.round(menStrength * 100)}% standing</span></div></div>
              <div className="tlc-score-number">{fmt(stats.menAlive)}</div>
            </div>
            <div className="tlc-score-center"><div className={"tlc-phase-indicator " + (isLive ? "tlc-phase-live" : "")}><Radio size={12} /> {isLive ? "SIM LIVE" : winner ? "FINAL" : "READY"}</div><div className="tlc-clock">{clock(timeRemaining)}</div><div className="tlc-phase-label">{phaseLabel}</div></div>
            <div className="tlc-score-side tlc-score-women">
              <div className="tlc-score-number">{fmt(stats.womenAlive)}</div>
              <div className="tlc-score-content"><div className="tlc-score-kicker">THE QUEEN COLLECTIVE</div><div className="tlc-score-name">TEAM WOMEN</div><div className="tlc-score-meta"><span>{fmt(stats.womenKills)} KOs</span><span>{Math.round(womenStrength * 100)}% standing</span></div></div>
              <div className="tlc-team-avatar">♀</div>
            </div>
          </div>

          <div className="tlc-arena-viewport">
            <div className="tlc-broadcast-arena-heading"><span>▶ TLC ARENA CAM</span><span>THE MAIN EVENT</span><span>SIM FEED</span></div>
            <BattleSimulation
              key={battleKey}
              menArmySize={menArmySize} womenArmySize={womenArmySize}
              battleSpeed={battleSpeed} menRageEnabled={menRage} womenRageEnabled={womenRage}
              isRunning={isRunning} narratorEnabled={narratorEnabled}
              meteorTrigger={meteorTrigger} meteorCharges={meteorCharges} onMeteorUsed={useMeteorCharge} reducedMotion={reducedMotion}
              onStatsUpdate={handleStats} onPhaseChange={handlePhase}
              onTimeUpdate={handleTime} onQuipChange={handleQuip} onVictory={handleVictory}
            />
            <div className="tlc-arena-grain" aria-hidden="true" />
            <div className="tlc-corner tlc-corner-tl" /><div className="tlc-corner tlc-corner-tr" />
            <div className="tlc-corner tlc-corner-bl" /><div className="tlc-corner tlc-corner-br" />
            <div className="tlc-arena-watermark"><span>TLC</span> BATTLE NETWORK <span>///</span> ARENA 001</div>
            <div className="tlc-camera-tag"><span className="tlc-red-dot" /> CAM 01 <span>•</span> TOP-DOWN</div>
            {spotlight && <div key={spotlight.id} className={"tlc-spotlight " + (spotlight.team || "")} aria-live="polite"><div className="tlc-spotlight-icon">{spotlight.icon}</div><div><strong>{spotlight.title}</strong><span>{spotlight.detail}</span></div></div>}
            {!isRunning && !winner && <div className="tlc-ready-banner"><span className="tlc-ready-star">✦</span><strong>{startedRef.current ? "THE ARENA IS PAUSED" : "LET THE CHAOS BEGIN"}</strong><span>{startedRef.current ? "Hit resume. The drama is waiting." : "Pick a mode. Press start. Watch the world unravel."}</span><button onClick={handleStart}><Play size={16} fill="currentColor" /> {startedRef.current ? "RESUME BATTLE" : "START THE BATTLE"}</button></div>}
            <div className="tlc-arena-bottom"><div className="tlc-broadcast-scorebug"><span>MEN <b>{fmt(stats.menAlive)}</b></span><span>WOMEN <b>{fmt(stats.womenAlive)}</b></span><strong>{clock(timeRemaining)}</strong></div><div className="tlc-hype"><span>LOCAL HYPE</span><div className="tlc-hype-track"><div style={{ width: hype + "%" }} /></div><strong>{hype}%</strong></div></div>
          </div>

          <div className="tlc-momentum">
            <div className="tlc-momentum-heading"><span><i className="tlc-dot-blue" /> MEN'S MOMENTUM</span><strong>THE TUG OF WAR</strong><span>WOMEN'S MOMENTUM <i className="tlc-dot-pink" /></span></div>
            <div className="tlc-momentum-track" role="meter" aria-label="Men's momentum" aria-valuemin={0} aria-valuemax={100} aria-valuenow={momentum}>
              <div className="tlc-momentum-blue" style={{ width: momentum + "%" }} /><div className="tlc-momentum-pink" style={{ width: (100 - momentum) + "%" }} /><div className="tlc-momentum-mid" />
            </div>
            <div className="tlc-momentum-figures"><span>{momentum}%</span><span>{100 - momentum}%</span></div>
          </div>
        </section>

        <div className="tlc-ticker"><span className="tlc-ticker-tag"><Activity size={14} /> TLC BREAKING PLAY</span><span className="tlc-ticker-text" aria-live="polite">{quip}</span><span className="tlc-ticker-right">LIVE FROM THE SIMULATION <Sparkles size={13} /></span></div>
        </div>
        <BroadcastCenter stats={stats} menStart={menArmySize} womenStart={womenArmySize} moments={moments} history={history} timeRemaining={timeRemaining} matchDuration={MATCH_DURATION} phase={phase} isRunning={isRunning} winner={winner} battleSpeed={battleSpeed} hype={hype} />
        </div>

        <section className="tlc-command" aria-label="Battle command center">
          <div className="tlc-command-head"><div><div className="tlc-eyebrow">TLC MATCHDAY OPERATIONS</div><h2>BROADCAST <em>CONTROL ROOM.</em></h2><p className="tlc-pace-note">Default is 0.5× for a more watchable battle. Change pacing without restarting.</p></div><div className="tlc-command-head-actions">
            <button className={"tlc-utility " + (spectatorMode ? "active" : "")} onClick={() => setSpectatorMode(v => !v)}>{spectatorMode ? <Eye size={16} /> : <EyeOff size={16} />}{spectatorMode ? "EXIT SPECTATOR" : "SPECTATOR VIEW"}</button>
            <button className="tlc-icon-button" aria-label="Toggle fullscreen" onClick={toggleFullscreen}>{fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
          </div></div>

          {!spectatorMode && <>
            <div className="tlc-command-toolbar">
              <div className="tlc-primary-controls"><button className={"tlc-launch " + (isRunning ? "tlc-pause" : "")} onClick={handleStart} disabled={Boolean(winner)}>{isRunning ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}{isRunning ? "PAUSE BATTLE" : startedRef.current ? "RESUME BATTLE" : "START BATTLE"}</button>
                <button className="tlc-reset" onClick={() => resetBattle(menArmySize, womenArmySize)}><RotateCcw size={17} /> RESET</button>
                <div className="tlc-speed-control"><span><Zap size={14} /> MATCH PACE</span><div>{[0.25, 0.5, 0.75, 1, 1.5].map(speed => <button key={speed} className={battleSpeed === speed ? "selected" : ""} aria-label={"Set battle pacing to " + speed + " times speed"} aria-pressed={battleSpeed === speed} title={speed === 0.25 ? "Cinematic slow motion" : speed === 0.5 ? "Broadcast default" : speed === 0.75 ? "Relaxed" : speed === 1 ? "Normal" : "Fast highlights"} onClick={() => setBattleSpeed(speed)}>{speed}×</button>)}</div></div>
              </div>
              <div className="tlc-mode-picker"><button className="tlc-mode-toggle" onClick={() => setPresetsOpen(v => !v)} aria-expanded={presetsOpen}><span className="tlc-mode-icon">{selectedPreset.icon}</span><span><small>BATTLE PRESET</small><strong>{selectedPreset.name}</strong></span>{presetsOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button></div>
            </div>
            {presetsOpen && <div className="tlc-preset-grid">{PRESETS.map(p => <button key={p.id} className={"tlc-preset " + (p.id === presetId ? "selected" : "")} onClick={() => applyPreset(p)}><span>{p.icon}</span><strong>{p.name}</strong><small>{p.men.toLocaleString()} vs {p.women.toLocaleString()}</small><p>{p.tagline}</p></button>)}</div>}

            <div className="tlc-battle-cards">
              <div className="tlc-faction-card men"><div className="tlc-faction-top"><div className="tlc-faction-mark">♂</div><div><small>THE BLUE CORNER</small><h3>THE BRO BRIGADE</h3><p>"We have a plan." Narrator: they did not.</p></div></div><div className="tlc-faction-stats"><div><small>FIGHTERS</small><strong>{fmt(stats.menAlive)}<span> / {fmt(menArmySize)}</span></strong></div><div><small>KNOCKOUTS</small><strong>{fmt(stats.menKills)}</strong></div></div><button className={"tlc-faction-boost " + (menRage ? "boosted" : "")} onClick={() => { setMenRage(v => !v); recordMoment(menRage ? "BRO MODE OFF" : "BRO MODE ACTIVATED", menRage ? "The boys are back to regular chaos." : "The boys found the energy drink stash.", "⚡", "men"); }}><Flame size={16} /> {menRage ? "BRO MODE ACTIVE" : "ACTIVATE BRO MODE"} <ArrowUpRight size={15} /></button></div>

              <div className="tlc-moment-card"><div className="tlc-moment-head"><div><span className="tlc-moment-dot" /> MOMENT TRACKER</div><small>{moments.length} EVENTS</small></div><div className="tlc-moment-feed">{moments.length ? moments.slice(0, 4).map(item => <div className="tlc-moment-row" key={item.id}><span className="tlc-moment-emoji">{item.icon}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{clock(item.at)}</time></div>) : <div className="tlc-moment-empty"><Swords size={26} /><strong>THE CALM BEFORE THE CHAOS</strong><span>Big moments will appear here as the battle unfolds.</span></div>}</div><div className="tlc-moment-bottom"><span><Clock3 size={13} /> {clock(elapsed)} elapsed</span><span>{fmt(stats.menKills + stats.womenKills)} total KOs</span></div></div>

              <div className="tlc-faction-card women"><div className="tlc-faction-top"><div className="tlc-faction-mark">♀</div><div><small>THE PINK CORNER</small><h3>THE QUEEN COLLECTIVE</h3><p>"We're fine." Narrator: the arena disagreed.</p></div></div><div className="tlc-faction-stats"><div><small>FIGHTERS</small><strong>{fmt(stats.womenAlive)}<span> / {fmt(womenArmySize)}</span></strong></div><div><small>KNOCKOUTS</small><strong>{fmt(stats.womenKills)}</strong></div></div><button className={"tlc-faction-boost " + (womenRage ? "boosted" : "")} onClick={() => { setWomenRage(v => !v); recordMoment(womenRage ? "QUEEN MODE OFF" : "QUEEN MODE ACTIVATED", womenRage ? "The queens are back to regular chaos." : "The queens just unlocked the final boss soundtrack.", "👑", "women"); }}><Crown size={16} /> {womenRage ? "QUEEN MODE ACTIVE" : "ACTIVATE QUEEN MODE"} <ArrowUpRight size={15} /></button></div>
            </div>

            <div className="tlc-interaction-bar">
              <div className="tlc-reactions"><span>YOUR REACTION</span>{REACTIONS.map(emoji => <button key={emoji} onClick={() => react(emoji)} aria-label={"React " + emoji}>{emoji}<small>{reactionCounts[emoji] || ""}</small></button>)}</div>
              <div className="tlc-interaction-actions"><button className="tlc-meteor" onClick={dropMeteor} disabled={!isLive || meteorCharges === 0}><Target size={17} /> METEOR DROP <span>{meteorCharges} LEFT</span></button><button className="tlc-utility" onClick={() => setSettingsOpen(v => !v)}><Settings2 size={16} /> EFFECTS {settingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></div>
            </div>
            {settingsOpen && <div className="tlc-settings-strip"><label><input type="checkbox" checked={soundEnabled} onChange={e => setAudioEnabled(e.target.checked)} /><span>{soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />} SOUND EFFECTS</span></label><label><input type="checkbox" checked={narratorEnabled} onChange={e => setNarratorEnabled(e.target.checked)} /><span><Radio size={16} /> VOICE COMMENTARY</span></label><label><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} /><span><Shield size={16} /> REDUCE FLASH & SHAKE</span></label><span>Local preferences • No account required</span></div>}
          </>}

          <div className="tlc-export-bar"><div className="tlc-export-caption"><span className="tlc-gold-spark">✦</span><span>MADE FOR THE GROUP CHAT</span><small>Screenshot it. Share it. Start an argument.</small></div><div className="tlc-export-actions"><button onClick={savePoster}><Camera size={16} /> SAVE 9:16 POSTER</button><button onClick={shareRecap}><Share2 size={16} /> SHARE RECAP</button><button onClick={exportLog}><Download size={16} /> MATCH LOG</button></div></div>
        </section>

        <footer className="tlc-footer"><div>TLC <span>✦</span> BATTLE CLUB</div><p>Built for entertainment. No real humans were harmed in the making of this ridiculous rivalry.</p><span>THE ATOMIC EDITION © 2026</span></footer>
      </main>

      {winner && <div className="tlc-victory-backdrop" role="dialog" aria-modal="true" aria-label="Battle results"><div className={"tlc-victory-panel " + winner}><div className="tlc-victory-confetti">✦ ✧ ✦</div><div className="tlc-victory-eyebrow"><Trophy size={16} /> THE FINAL VERDICT</div><div className="tlc-victory-icon">{winner === "men" ? "♂" : "♀"}</div><h2>TEAM {winner.toUpperCase()} <span>WINS.</span></h2><p>{winner === "men" ? "The bros somehow pulled it off. Nobody is letting anyone forget this." : "The queens came, saw, and absolutely understood the assignment."}</p><div className="tlc-victory-results"><div><small>MEN KOs</small><strong>{fmt(stats.menKills)}</strong></div><div><small>MATCH TIME</small><strong>{clock(elapsed)}</strong></div><div><small>WOMEN KOs</small><strong>{fmt(stats.womenKills)}</strong></div></div><div className="tlc-victory-actions"><button onClick={() => { resetBattle(menArmySize, womenArmySize); startedRef.current = true; setIsRunning(true); }}><RotateCcw size={18} /> RUN IT BACK</button><button onClick={savePoster}><Camera size={17} /> SAVE THE RECEIPTS</button><button onClick={shareRecap}><Share2 size={17} /> SHARE</button></div><button className="tlc-victory-dismiss" onClick={() => resetBattle(menArmySize, womenArmySize)}>BACK TO THE ARENA</button></div></div>}
    </div>
  );
};

export default Index;
