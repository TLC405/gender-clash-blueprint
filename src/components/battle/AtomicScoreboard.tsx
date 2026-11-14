import { Activity, Clock3 } from "lucide-react";
import type { BattlePhase } from "@/lib/battlePhysics";

/**
 * TLC Atomic scoreboard.
 * Every figure comes from the currently running local simulation.
 * Visual design is a first-party component, not an ESPN asset.
 */
export type TeamScoreData = {
  alive: number;
  initial: number;
  kills: number;
};

interface AtomicScoreboardProps {
  men: TeamScoreData;
  women: TeamScoreData;
  phase: BattlePhase;
  isRunning: boolean;
  winner: "men" | "women" | "draw" | null;
  timeRemaining: number;
  presetName: string;
}

const number = (value: number) => Math.max(0, Math.floor(value)).toLocaleString();
const percentage = (current: number, initial: number) =>
  initial > 0 ? Math.max(0, Math.min(100, (current / initial) * 100)) : 0;
const time = (seconds: number) =>
  Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");

function TeamScore({
  side,
  data,
  leading,
  won,
}: {
  side: "men" | "women";
  data: TeamScoreData;
  leading: boolean;
  won: boolean;
}) {
  const surviving = percentage(data.alive, data.initial);
  const name = side === "men" ? "MEN" : "WOMEN";
  return (
    <div className={`tlc-atom-team ${side} ${leading ? "leading" : ""} ${won ? "winner" : ""}`}>
      <div className="tlc-atom-team-head">
        <span className="tlc-atom-emblem" aria-hidden="true">{side === "men" ? "♂" : "♀"}</span>
        <div className="tlc-atom-team-id">
          <span className="tlc-atom-team-kicker">{side === "men" ? "BLUE CORNER" : "PINK CORNER"}</span>
          <strong>{name}</strong>
          <span className="tlc-atom-team-meta">{number(data.kills)} KOs <i /> {surviving.toFixed(0)}% REMAIN</span>
        </div>
      </div>
      <div className="tlc-atom-team-score">
        <strong aria-label={`${name}: ${number(data.alive)} fighters standing`}>{number(data.alive)}</strong>
        <small>STANDING</small>
      </div>
      <div className="tlc-atom-team-survival" aria-label={`${name} survival: ${surviving.toFixed(0)} percent`}>
        <span style={{ width: surviving + "%" }} />
      </div>
    </div>
  );
}

export default function AtomicScoreboard({
  men,
  women,
  phase,
  isRunning,
  winner,
  timeRemaining,
  presetName,
}: AtomicScoreboardProps) {
  const menPct = percentage(men.alive, men.initial);
  const womenPct = percentage(women.alive, women.initial);
  const status = winner ? "FINAL" : isRunning ? "SIM LIVE" : phase === "stand" && timeRemaining >= 239 ? "READY" : "PAUSED";
  const phaseText = phase === "stand" ? "STANDOFF" : phase === "melee" ? "BATTLE" : phase === "sudden_death" ? "OVERTIME" : "RESULT";
  return (
    <div className="tlc-atomic-scoreboard" aria-label="TLC Battlecast live simulation scoreboard">
      <div className="tlc-atom-scorebar" aria-hidden="true"><span>ATOMIC / MATCH CENTER</span><span><Activity size={11} /> LOCAL SIMULATION</span></div>
      <div className="tlc-atom-score-inner">
        <TeamScore side="men" data={men} leading={menPct > womenPct} won={winner === "men"} />
        <div className="tlc-atom-score-center">
          <div className={`tlc-atom-score-status ${isRunning ? "active" : ""}`}><i /> {status}</div>
          <strong className="tlc-atom-match-clock"><Clock3 aria-hidden="true" size={14} /><span>{time(timeRemaining)}</span></strong>
          <div className="tlc-atom-phase">{phaseText}</div>
          <div className="tlc-atom-preset" title={presetName}>{presetName}</div>
        </div>
        <TeamScore side="women" data={women} leading={womenPct > menPct} won={winner === "women"} />
      </div>
      <div className="tlc-atom-score-footer"><span>SIMULATION <b>01</b></span><span>MEN <i>VS</i> WOMEN</span><span>SEASON <b>01</b></span></div>
    </div>
  );
}
