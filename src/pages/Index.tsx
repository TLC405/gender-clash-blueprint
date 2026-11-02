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
import "./BroadcastOverhaul.css";
import "./OneScreen.css";

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
  const [activePanel, setActivePanel] = useState<"modes" | "powers" | "stats" | "settings" | "share" | null>(null);
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
    <div className="tlc-app tlc-one-screen">
      <header className="tlc-cockpit-header">
        <div className="tlc-cockpit-brand">
          <span className="tlc-cockpit-monogram">TLC</span>
          <div className="tlc-cockpit-brandcopy"><strong>BATTLE<span>CAST</span></strong><small>MEN VS WOMEN · ATOMIC LEAGUE</small></div>
        </div>
        <div className="tlc-cockpit-header-center">
          <span className={isLive ? "tlc-onair live" : "tlc-onair"}><i /> {winner ? "FINAL" : isLive ? "SIM LIVE" : startedRef.current ? "PAUSED" : "PRE-MATCH"}</span>
          <span className="tlc-broadcast-disclaimer">LOCAL SIMULATION</span>
        </div>
        <div className="tlc-cockpit-header-actions">
          <button type="button" title="Toggle broadcast-only camera" aria-label="Toggle spectator camera" aria-pressed={spectatorMode} className={spectatorMode ? "active" : ""} onClick={() => setSpectatorMode(v => !v)}>{spectatorMode ? <Eye size={17} /> : <EyeOff size={17} />}</button>
          <button type="button" title="Fullscreen game" aria-label="Toggle fullscreen" onClick={toggleFullscreen}>{fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
        </div>
      </header>

      <div className="tlc-cockpit-shell" ref={stageRef}>
        <main className={spectatorMode ? "tlc-cockpit-main spectator" : "tlc-cockpit-main"}>
          <section className="tlc-cockpit-arena" aria-label="Live battle arena">
            <div className="tlc-cockpit-score" aria-label="Live matchup score">
              <div className="tlc-score-unit men">
                <span className="tlc-score-team-icon">♂</span>
                <div className="tlc-score-detail"><span>BLUE CORNER</span><strong>MEN</strong><small>{fmt(stats.menKills)} KOs · {Math.round(menStrength * 100)}% survive</small></div>
                <b>{fmt(stats.menAlive)}</b>
              </div>
              <div className="tlc-cockpit-clock"><span>{winner ? "FINAL" : isLive ? "LIVE" : phase === "stand" ? "READY" : "PAUSED"}</span><strong>{clock(timeRemaining)}</strong><small>{selectedPreset.name}</small></div>
              <div className="tlc-score-unit women">
                <b>{fmt(stats.womenAlive)}</b>
                <div className="tlc-score-detail"><span>PINK CORNER</span><strong>WOMEN</strong><small>{fmt(stats.womenKills)} KOs · {Math.round(womenStrength * 100)}% survive</small></div>
                <span className="tlc-score-team-icon">♀</span>
              </div>
            </div>
            <div className="tlc-cockpit-field">
              <BattleSimulation
                key={battleKey}
                menArmySize={menArmySize} womenArmySize={womenArmySize}
                battleSpeed={battleSpeed} menRageEnabled={menRage} womenRageEnabled={womenRage}
                isRunning={isRunning} narratorEnabled={narratorEnabled}
                meteorTrigger={meteorTrigger} meteorCharges={meteorCharges} onMeteorUsed={useMeteorCharge} reducedMotion={reducedMotion}
                onStatsUpdate={handleStats} onPhaseChange={handlePhase}
                onTimeUpdate={handleTime} onQuipChange={handleQuip} onVictory={handleVictory}
              />
              <div className="tlc-cockpit-field-top"><span><Radio size={12} /> CAM 01 / ARENA</span><span>{phaseLabel}</span></div>
              {spotlight && <div key={spotlight.id} className={"tlc-cockpit-spotlight " + (spotlight.team || "")} aria-live="polite"><span>{spotlight.icon}</span><div><strong>{spotlight.title}</strong><small>{spotlight.detail}</small></div></div>}
              {!isRunning && !winner && <div className="tlc-cockpit-idle">
                <div className="tlc-cockpit-idle-inner"><span>✦ TLC MAIN EVENT</span><h1>{startedRef.current ? "MATCH PAUSED" : "LET THEM BATTLE."}</h1><p>{startedRef.current ? "Resume where you left off." : "Two teams. One arena. You control the chaos."}</p><button onClick={handleStart}><Play size={16} fill="currentColor" /> {startedRef.current ? "RESUME MATCH" : "START MATCH"}</button></div>
              </div>}
              <div className="tlc-cockpit-lower-third">
                <div className="tlc-cockpit-ticker"><span>GAME FEED</span><strong aria-live="polite">{quip}</strong></div>
                <div className="tlc-cockpit-hype"><Flame size={12} /> {hype}%</div>
              </div>
            </div>
            <div className="tlc-cockpit-momentum">
              <span>MEN <b>{momentum}%</b></span>
              <div className="tlc-cockpit-momentum-track" role="meter" aria-label="Relative survival advantage for team men" aria-valuemin={0} aria-valuemax={100} aria-valuenow={momentum}><div style={{ width: momentum + "%" }} /></div>
              <span>WOMEN <b>{100 - momentum}%</b></span>
            </div>
          </section>
          {!spectatorMode && <div className="tlc-cockpit-right">
            <BroadcastCenter stats={stats} menStart={menArmySize} womenStart={womenArmySize} moments={moments} history={history} timeRemaining={timeRemaining} matchDuration={MATCH_DURATION} phase={phase} isRunning={isRunning} winner={winner} battleSpeed={battleSpeed} hype={hype} />
          </div>}
        </main>

        <footer className="tlc-cockpit-dock" aria-label="Battle controls">
          <div className="tlc-cockpit-primary">
            <button className={isRunning ? "tlc-cockpit-play pause" : "tlc-cockpit-play"} onClick={handleStart} disabled={Boolean(winner)}>
              {isRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              <span>{isRunning ? "PAUSE" : startedRef.current ? "RESUME" : "START"}</span>
            </button>
            <button className="tlc-cockpit-reset" onClick={() => resetBattle(menArmySize, womenArmySize)} title="Reset match"><RotateCcw size={17} /><span>RESET</span></button>
            <div className="tlc-cockpit-speed" role="group" aria-label="Match playback pace">
              <span>PACE</span>
              {[0.25, 0.5, 1].map(speed => <button key={speed} className={battleSpeed === speed ? "selected" : ""} aria-pressed={battleSpeed === speed} onClick={() => setBattleSpeed(speed)}>{speed}×</button>)}
            </div>
          </div>
          <div className="tlc-cockpit-shortcuts">
            <button className={activePanel === "modes" ? "active" : ""} aria-pressed={activePanel === "modes"} onClick={() => setActivePanel(p => p === "modes" ? null : "modes")}><Swords size={18}/><span>MODES</span></button>
            <button className={activePanel === "powers" ? "active" : ""} aria-pressed={activePanel === "powers"} onClick={() => setActivePanel(p => p === "powers" ? null : "powers")}><Zap size={18}/><span>POWERS</span><i>{meteorCharges}</i></button>
            <button className={activePanel === "stats" ? "active" : ""} aria-pressed={activePanel === "stats"} onClick={() => setActivePanel(p => p === "stats" ? null : "stats")}><Activity size={18}/><span>STATS</span></button>
            <button className={activePanel === "share" ? "active" : ""} aria-pressed={activePanel === "share"} onClick={() => setActivePanel(p => p === "share" ? null : "share")}><Share2 size={18}/><span>SHARE</span></button>
            <button className={activePanel === "settings" ? "active" : ""} aria-pressed={activePanel === "settings"} onClick={() => setActivePanel(p => p === "settings" ? null : "settings")}><Settings2 size={18}/><span>MORE</span></button>
          </div>
        </footer>

        {activePanel && <div className="tlc-cockpit-panel" role="dialog" aria-modal="false" aria-label={activePanel + " controls"}>
          <div className="tlc-cockpit-panel-head"><div><span>TLC / CONTROL ROOM</span><strong>{activePanel === "modes" ? "CHOOSE A MATCH" : activePanel === "powers" ? "BATTLE POWER-UPS" : activePanel === "stats" ? "MATCH CENTER" : activePanel === "share" ? "SHARE THE MATCH" : "GAME SETTINGS"}</strong></div><button aria-label="Close panel" onClick={() => setActivePanel(null)}>✕</button></div>
          <div className="tlc-cockpit-panel-body">
            {activePanel === "modes" && <div className="tlc-cockpit-mode-list">{PRESETS.map(p => <button key={p.id} className={presetId === p.id ? "selected" : ""} onClick={() => { if(isRunning){toast.info("Pause the match before switching modes.");return;} applyPreset(p);setActivePanel(null); }}><span className="tlc-cockpit-mode-emoji">{p.icon}</span><span><strong>{p.name}</strong><small>{p.men.toLocaleString()} vs {p.women.toLocaleString()} · {p.tagline}</small></span><span className="tlc-cockpit-mode-select">{presetId === p.id ? "ACTIVE" : "SELECT"}</span></button>)}</div>}
            {activePanel === "powers" && <div className="tlc-cockpit-power-grid">
              <button className={menRage ? "active men" : "men"} onClick={() => { setMenRage(v => !v);recordMoment(menRage ? "BRO MODE OFF" : "BRO MODE ON",menRage ? "Men return to normal speed." : "Team Men gets a combat boost.","⚡","men"); }}><Flame size={19}/><strong>{menRage ? "BRO MODE ON" : "BRO MODE"}</strong><small>Boost Team Men</small></button>
              <button className={womenRage ? "active women" : "women"} onClick={() => { setWomenRage(v => !v);recordMoment(womenRage ? "QUEEN MODE OFF" : "QUEEN MODE ON",womenRage ? "Women return to normal speed." : "Team Women gets a combat boost.","👑","women"); }}><Crown size={19}/><strong>{womenRage ? "QUEEN MODE ON" : "QUEEN MODE"}</strong><small>Boost Team Women</small></button>
              <button className="tlc-cockpit-meteor" disabled={!isLive || meteorCharges <= 0} onClick={dropMeteor}><Target size={18}/><strong>METEOR DROP</strong><small>{meteorCharges} charges · Or tap the arena</small></button>
              <div className="tlc-cockpit-reactions"><span>YOUR REACTIONS</span><div>{REACTIONS.map(emoji => <button key={emoji} aria-label={"React " + emoji} onClick={() => react(emoji)}>{emoji}<small>{reactionCounts[emoji] || ""}</small></button>)}</div></div>
            </div>}
            {activePanel === "stats" && <BroadcastCenter stats={stats} menStart={menArmySize} womenStart={womenArmySize} moments={moments} history={history} timeRemaining={timeRemaining} matchDuration={MATCH_DURATION} phase={phase} isRunning={isRunning} winner={winner} battleSpeed={battleSpeed} hype={hype} />}
            {activePanel === "settings" && <div className="tlc-cockpit-settings">
              <label><span><Volume2 size={18}/> SOUND EFFECTS</span><input type="checkbox" checked={soundEnabled} onChange={e => setAudioEnabled(e.target.checked)}/></label>
              <label><span><Radio size={18}/> VOICE COMMENTARY</span><input type="checkbox" checked={narratorEnabled} onChange={e => setNarratorEnabled(e.target.checked)}/></label>
              <label><span><Shield size={18}/> REDUCED FLASH & SHAKE</span><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)}/></label>
              <div className="tlc-cockpit-settings-row"><span>PLAYBACK PACE</span><div>{[0.25,0.5,0.75,1,1.5].map(speed => <button className={battleSpeed===speed?"active":""} key={speed} onClick={() => setBattleSpeed(speed)}>{speed}×</button>)}</div></div>
              <button className="tlc-cockpit-settings-action" onClick={() => setSpectatorMode(v=>!v)}>{spectatorMode ? <Eye size={17}/> : <EyeOff size={17}/>} {spectatorMode?"SHOW MATCH CENTER":"SPECTATOR CAMERA"}</button>
              <button className="tlc-cockpit-settings-action" onClick={toggleFullscreen}>{fullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>} {fullscreen?"EXIT FULLSCREEN":"ENTER FULLSCREEN"}</button>
              <small>All matches run locally. No account, real online audience, or multiplayer connection is implied.</small>
            </div>}
            {activePanel === "share" && <div className="tlc-cockpit-share">
              <button onClick={savePoster}><Camera size={19}/><span><strong>SAVE STORY POSTER</strong><small>9:16 image with the current match score</small></span></button>
              <button onClick={shareRecap}><Share2 size={19}/><span><strong>SHARE RECAP</strong><small>Use your phone's share sheet or copy the summary</small></span></button>
              <button onClick={exportLog}><Download size={19}/><span><strong>EXPORT MATCH LOG</strong><small>Download factual play-by-play as JSON</small></span></button>
            </div>}
          </div>
        </div>}
      </div>

      {winner && <div className="tlc-cockpit-victory-backdrop" role="dialog" aria-modal="true" aria-label="Battle results">
        <div className="tlc-cockpit-victory-card">
          <span>✦ TLC BATTLECAST / FINAL</span>
          <div className="tlc-cockpit-victory-symbol">{winner === "men" ? "♂" : "♀"}</div>
          <h2>TEAM {winner.toUpperCase()} <em>WINS.</em></h2>
          <p>{selectedPreset.name} · {clock(elapsed)} played</p>
          <div className="tlc-cockpit-victory-stats"><div><small>MEN KOs</small><strong>{fmt(stats.menKills)}</strong></div><div><small>WOMEN KOs</small><strong>{fmt(stats.womenKills)}</strong></div></div>
          <button className="tlc-cockpit-victory-replay" onClick={() => {setActivePanel(null);resetBattle(menArmySize,womenArmySize);startedRef.current=true;setIsRunning(true);}}><RotateCcw size={17}/> RUN IT BACK</button>
          <div className="tlc-cockpit-victory-actions"><button onClick={savePoster}><Camera size={15}/> POSTER</button><button onClick={shareRecap}><Share2 size={15}/> SHARE</button><button onClick={() => resetBattle(menArmySize,womenArmySize)}>BACK TO ARENA</button></div>
        </div>
      </div>}
    </div>
  );
};

export default Index;
