import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, ChevronDown, Flame, Maximize2, Minimize2, Pause, Play, RotateCcw, Share2, Shield, Swords, Volume2, VolumeX, Zap } from "lucide-react";
import { toast } from "sonner";
import BattleSimulation from "@/components/BattleSimulationEnhanced";
import AtomicScoreboard from "@/components/battle/AtomicScoreboard";
import type { BattlePhase } from "@/lib/battlePhysics";
import { FORMATIONS, ARENA_SURFACES, type ArenaSurface } from "@/lib/arenaOptions";
import { DEFAULT_TEAMS, MEN_WEAPONS, WOMEN_WEAPONS, TOTAL_CAP, setTeamCount, type SandboxTeams, type MenWeapon, type WomenWeapon } from "@/lib/sandboxLoadouts";
import type { HeroWeapon } from "@/lib/combatModes";
import { playUiClick, playArenaCue, primeOriginalGameAudio, setSoundEnabled } from "@/lib/battleAudio";
import "./Index.css";
import "./BroadcastOverhaul.css";
import "./OneScreen.css";
import "./AtomicUpgrade.css";
import "./AtomicSweep.css";
import "./ArenaOptions.css";
import "./PremiumSandbox.css";

type Stats={menAlive:number;womenAlive:number;menKills:number;womenKills:number};
type Winner="men"|"women"|"draw"|null;
type HeroAction={id:number;weapon:HeroWeapon;x:number;y:number};
const DURATION=240;
const fmt=(n:number)=>Math.max(0,Math.floor(n)).toLocaleString();
const clock=(s:number)=>Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");
const asStat=(men:number,women:number):Stats=>({menAlive:men,womenAlive:women,menKills:0,womenKills:0});
function readSavedTeams():SandboxTeams {
  if(typeof localStorage==="undefined")return DEFAULT_TEAMS;
  try {
    const saved=JSON.parse(localStorage.getItem("tlc-premium-team-settings")||"null");
    if(!saved?.men||!saved?.women)return DEFAULT_TEAMS;
    const m=MEN_WEAPONS.some(w=>w.id===saved.men.weapon)?saved.men.weapon:DEFAULT_TEAMS.men.weapon;
    const w=WOMEN_WEAPONS.some(v=>v.id===saved.women.weapon)?saved.women.weapon:DEFAULT_TEAMS.women.weapon;
    const menForm=FORMATIONS.some(f=>f.id===saved.men.formation)?saved.men.formation:DEFAULT_TEAMS.men.formation;
    const womenForm=FORMATIONS.some(f=>f.id===saved.women.formation)?saved.women.formation:DEFAULT_TEAMS.women.formation;
    const countMen=Math.max(1,Math.min(99,Number(saved.men.count)||40));
    const countWomen=Math.max(1,Math.min(TOTAL_CAP-countMen,Number(saved.women.count)||60));
    return {
      men:{count:countMen,strength:Math.max(.7,Math.min(1.8,Number(saved.men.strength)||1)),rage:Boolean(saved.men.rage),weapon:m,formation:menForm},
      women:{count:countWomen,speed:Math.max(.7,Math.min(1.5,Number(saved.women.speed)||1)),rage:Boolean(saved.women.rage),weapon:w,formation:womenForm,furiosa:Boolean(saved.women.furiosa)},
    };
  }catch{return DEFAULT_TEAMS;}
}
function Action({children,active,onClick,disabled,title,className=""}:{children:ReactNode;active?:boolean;disabled?:boolean;title?:string;onClick:()=>void;className?:string}){
  return <button type="button" aria-pressed={active} title={title} disabled={disabled} onClick={onClick} className={"tlc-premium-action"+(active?" is-active":"")+" "+className}>{children}</button>;
}
const PremiumSandbox=()=>{
  const [teams,setTeams]=useState<SandboxTeams>(readSavedTeams);
  const [running,setRunning]=useState(false);
  const [battleKey,setBattleKey]=useState(0);
  const [phase,setPhase]=useState<BattlePhase>("stand");
  const [timeLeft,setTimeLeft]=useState(DURATION);
  const [stats,setStats]=useState<Stats>(()=>asStat(DEFAULT_TEAMS.men.count,DEFAULT_TEAMS.women.count));
  const [winner,setWinner]=useState<Winner>(null);
  const [started,setStarted]=useState(false);
  const [battleSpeed,setBattleSpeed]=useState(.5);
  const [zoom,setZoom]=useState(1.22);
  const [chaos,setChaos]=useState(1);
  const [cinematic,setCinematic]=useState(()=>typeof matchMedia==="undefined"||!matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [sound,setSound]=useState(true);
  const [arena,setArena]=useState<ArenaSurface>("championship");
  const [meteorTrigger,setMeteorTrigger]=useState(0);
  const [meteorCharges,setMeteorCharges]=useState(3);
  const [hero,setHero]=useState(false);
  const [heroPos,setHeroPos]=useState({x:.22,y:.68});
  const [heroWeapon,setHeroWeapon]=useState<HeroWeapon>("water");
  const [heroAction,setHeroAction]=useState<HeroAction>();
  const [ammo,setAmmo]=useState({nuke:2,lipstick:12,shockwave:4});
  const [fullscreen,setFullscreen]=useState(false);
  const heroId=useRef(0);
  const stage=useRef<HTMLDivElement>(null);
  const [viewportHeight,setViewportHeight]=useState<number|undefined>();

  useEffect(()=>{
    const update=()=>setViewportHeight(Math.max(500,Math.floor(window.visualViewport?.height||window.innerHeight)));
    update();window.addEventListener("resize",update);window.visualViewport?.addEventListener("resize",update);
    return ()=>{window.removeEventListener("resize",update);window.visualViewport?.removeEventListener("resize",update);};
  },[]);
  useEffect(()=>{try{localStorage.setItem("tlc-premium-team-settings",JSON.stringify(teams));}catch{}},[teams]);
  useEffect(()=>{setSoundEnabled(sound);},[sound]);
  useEffect(()=>{
    const update=()=>setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange",update);
    return ()=>document.removeEventListener("fullscreenchange",update);
  },[]);
  const reset=useCallback((next:SandboxTeams)=>{
    setRunning(false);setWinner(null);setStarted(false);setPhase("stand");setTimeLeft(DURATION);
    setStats(asStat(next.men.count,next.women.count));setBattleKey(v=>v+1);
    setMeteorCharges(3);setMeteorTrigger(0);setHeroAction(undefined);setAmmo({nuke:2,lipstick:12,shockwave:4});
  },[]);
  const updateTeams=(next:SandboxTeams,needsRestart=false)=>{
    if(needsRestart&&running){toast.info("Pause or reset the match before changing rosters and formations.");return;}
    setTeams(next);
    if(needsRestart)reset(next);
  };
  const adjustCount=(team:"men"|"women",n:number)=>updateTeams(setTeamCount(teams,team,n),true);
  const patchMen=(next:Partial<SandboxTeams["men"]>,restart=false)=>updateTeams({...teams,men:{...teams.men,...next}},restart);
  const patchWomen=(next:Partial<SandboxTeams["women"]>,restart=false)=>updateTeams({...teams,women:{...teams.women,...next}},restart);
  const handleStats=useCallback((s:Stats)=>setStats(s),[]);
  const handleTime=useCallback((n:number)=>setTimeLeft(n),[]);
  const handlePhase=useCallback((p:BattlePhase)=>setPhase(p),[]);
  const handleVictory=useCallback((w:"men"|"women"|"draw")=>{setWinner(w);setRunning(false);playArenaCue("crowd_roar");},[]);
  const noQuip=useCallback((_s:string)=>{},[]);
  const start=()=>{
    if(winner){reset(teams);return;}
    if(!running){void primeOriginalGameAudio();playUiClick();if(!started)playArenaCue("countdown");setStarted(true);}
    setRunning(v=>!v);
  };
  const fire=(weapon:HeroWeapon)=>{
    if(!hero||!running){toast.info("Deploy TLC Commander and start the battle first.");return;}
    const key=weapon==="nuke"?"nuke":weapon==="lipstick"?"lipstick":weapon==="shockwave"?"shockwave":null;
    if(key&&ammo[key]<=0){toast.info("No charges remaining.");return;}
    if(key)setAmmo(a=>({...a,[key]:a[key]-1}));
    setHeroWeapon(weapon);
    setHeroAction({id:++heroId.current,weapon,x:Math.min(.92,heroPos.x+.16),y:heroPos.y});
    playArenaCue(weapon==="rally"?"crowd_roar":"power_up");
  };
  const move=(dx:number,dy:number)=>setHeroPos(p=>({x:Math.max(.06,Math.min(.90,p.x+dx)),y:Math.max(.16,Math.min(.86,p.y+dy))}));
  const share=async()=>{
    const s="TLC BATTLECAST — Men "+fmt(stats.menAlive)+" vs Women "+fmt(stats.womenAlive)+" • "+clock(DURATION-timeLeft)+" played";
    try{if(navigator.share)await navigator.share({title:"TLC Battlecast",text:s,url:location.href});else{await navigator.clipboard.writeText(s);toast.success("Match recap copied.");}}
    catch(e){if(!(e instanceof Error&&e.name==="AbortError"))toast.error("Sharing unavailable.");}
  };
  const fullscreenToggle=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.current?.requestFullscreen();}catch{toast.error("Fullscreen not supported in this browser.");}};
  const canEdit=!running;
  const weaponButton=(value:MenWeapon|WomenWeapon,label:string,icon:string,selected:boolean,click:()=>void)=>
    <Action key={value} active={selected} onClick={click}><span className="tlc-premium-weapon-icon">{icon}</span>{label}</Action>;
  return <div className="tlc-app tlc-one-screen tlc-atomic tlc-premium-sandbox" style={viewportHeight?{"--premium-visible-height":viewportHeight+"px"} as React.CSSProperties:undefined}>
    <header className="tlc-premium-header">
      <div className="tlc-premium-brand">
        <img src={import.meta.env.BASE_URL+"branding/tlc-championship-crest.svg"} alt="TLC championship emblem"/>
        <span><b>BATTLE<span>CAST</span></b><small>TACTICAL ARCADE SANDBOX</small></span>
      </div>
      <div className="tlc-premium-live"><i className={running?"live":""}/>{winner?"FINAL":running?"LIVE BATTLE":started?"PAUSED":"READY"}</div>
      <div className="tlc-premium-header-actions">
        <button aria-label={sound?"Mute game sounds":"Enable game sounds"} title="Sound" onClick={()=>setSound(v=>!v)}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</button>
        <button aria-label="Share match" title="Share match" onClick={share}><Share2 size={17}/></button>
        <button aria-label="Fullscreen" title="Fullscreen" onClick={fullscreenToggle}>{fullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button>
      </div>
    </header>
    <div ref={stage} className="tlc-premium-stage">
      <section className="tlc-premium-arena tlc-cockpit-arena" aria-label="TLC Battlecast live arena">
        <AtomicScoreboard men={{alive:stats.menAlive,initial:teams.men.count,kills:stats.menKills}}
          women={{alive:stats.womenAlive,initial:teams.women.count,kills:stats.womenKills}}
          phase={phase} isRunning={running} winner={winner} timeRemaining={timeLeft} presetName="CUSTOM SANDBOX"/>
        <div className="tlc-cockpit-field">
          <BattleSimulation key={battleKey}
            menArmySize={teams.men.count} womenArmySize={teams.women.count}
            formationPattern={teams.men.formation} womenFormationPattern={teams.women.formation}
            arenaSurface={arena} combatModeId="brawl"
            teamLoadouts={teams} chaosIntensity={chaos} cameraScale={zoom}
            heroPosition={hero?heroPos:undefined} heroAction={heroAction} heroWeapon={heroWeapon}
            battleSpeed={battleSpeed} menRageEnabled={teams.men.rage} womenRageEnabled={teams.women.rage}
            isRunning={running} narratorEnabled={false}
            meteorTrigger={meteorTrigger} meteorCharges={meteorCharges}
            reducedMotion={!cinematic} menPower={teams.men.strength}
            onStatsUpdate={handleStats} onPhaseChange={handlePhase} onTimeUpdate={handleTime}
            onQuipChange={noQuip} onVictory={handleVictory}
          />
        </div>
        <div className="tlc-atomic-commentary-rail tlc-premium-rail" aria-label="Current battle status">
          <span className={"tlc-atomic-rail-status"+(running?" is-live":"")}>{winner?"FINAL":running?"IN COMBAT":"STANDBY"}</span>
          <div className="tlc-atomic-rail-message"><span>{teams.men.weapon.toUpperCase()} vs {teams.women.furiosa?"FURIOSA + ":""}{teams.women.weapon.toUpperCase()} · {teams.men.count+teams.women.count} / 100 FIGHTERS</span></div>
          <span className="tlc-atomic-rail-hype"><Flame size={12}/>{Math.round(chaos*100)}%</span>
        </div>
      </section>
      <div className="tlc-premium-deck">
        <section className="tlc-premium-team tlc-premium-men" aria-label="Men panel">
          <div className="tlc-premium-panel-heading"><div><small>BLUE CORNER / TEAM 01</small><h2>MEN <span>{teams.men.count}</span></h2></div><Shield size={20}/></div>
          <label className="tlc-premium-slider"><span>FIGHTERS <b>{teams.men.count}</b></span><input aria-label="Men count" type="range" min={1} max={Math.min(99,TOTAL_CAP-teams.women.count)} value={teams.men.count} disabled={!canEdit} onChange={e=>adjustCount("men",Number(e.target.value))}/></label>
          <label className="tlc-premium-slider"><span>STRENGTH <b>{teams.men.strength.toFixed(1)}×</b></span><input aria-label="Men strength" type="range" min={.7} max={1.8} step={.1} value={teams.men.strength} onChange={e=>patchMen({strength:Number(e.target.value)})}/></label>
          <div className="tlc-premium-weapons" role="group" aria-label="Men weapons">{MEN_WEAPONS.map(w=>weaponButton(w.id,w.label,w.icon,teams.men.weapon===w.id,()=>{patchMen({weapon:w.id});playUiClick();}))}</div>
          <div className="tlc-premium-team-bottom">
            <label className="tlc-premium-select-label">FORMATION <ChevronDown size={13}/><select aria-label="Men formation" value={teams.men.formation} disabled={!canEdit} onChange={e=>patchMen({formation:e.target.value as SandboxTeams["men"]["formation"]},true)}>{FORMATIONS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
            <Action active={teams.men.rage} onClick={()=>patchMen({rage:!teams.men.rage})}><Zap size={14}/> RAGE</Action>
          </div>
          <Action className="tlc-premium-deploy" active={hero} onClick={()=>{setHero(v=>!v);playUiClick();}}><Shield size={15}/>{hero?"TLC COMMANDER DEPLOYED":"DEPLOY TLC COMMANDER"}</Action>
        </section>
        <section className="tlc-premium-command" aria-label="Battle controls">
          <div className="tlc-premium-command-title"><b>COMMAND CENTER</b><small>DIRECT ARENA CONTROL</small></div>
          <div className="tlc-premium-startbar">
            <Action className="tlc-premium-start" disabled={Boolean(winner)} onClick={start}>{running?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}{running?"PAUSE":started?"RESUME":"START BATTLE"}</Action>
            <Action onClick={()=>reset(teams)}><RotateCcw size={17}/><span className="tlc-premium-reset-label">RESET</span></Action>
          </div>
          <div className="tlc-premium-control-lines">
            <div className="tlc-premium-mini-line"><span>ZOOM</span><Action onClick={()=>setZoom(v=>Math.max(.90,+(v-.1).toFixed(2)))}>−</Action><b>{Math.round(zoom*100)}%</b><Action onClick={()=>setZoom(v=>Math.min(1.8,+(v+.1).toFixed(2)))}>+</Action></div>
            <label className="tlc-premium-slider"><span>CHAOS <b>{Math.round(chaos*100)}%</b></span><input aria-label="Chaos intensity" type="range" min={.5} max={2} step={.1} value={chaos} onChange={e=>setChaos(Number(e.target.value))}/></label>
            <div className="tlc-premium-mini-line"><span>PACE</span>{[.5,1,2].map(s=><Action key={s} active={battleSpeed===s} onClick={()=>setBattleSpeed(s)}>{s}×</Action>)}</div>
          </div>
          <div className="tlc-premium-specials">
            <Action onClick={()=>{if(!running||meteorCharges<=0)return;setMeteorTrigger(n=>n+1);setMeteorCharges(n=>n-1);}} disabled={!running||meteorCharges<=0}><Flame size={15}/> METEOR {meteorCharges}</Action>
            <Action active={cinematic} onClick={()=>setCinematic(v=>!v)}><Camera size={14}/> CINEMATIC</Action>
          </div>
          <label className="tlc-premium-surface">ARENA <select aria-label="Arena surface" value={arena} onChange={e=>setArena(e.target.value as ArenaSurface)}>{ARENA_SURFACES.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          {hero&&<div className="tlc-premium-hero-controls" aria-label="TLC Commander controls">
            <div className="tlc-premium-hero-head"><b>TLC COMMANDER</b><span>TACTICAL DROP</span></div>
            <div className="tlc-premium-hero-dpad" role="group" aria-label="Move TLC Commander">
              <button aria-label="Move TLC up" onClick={()=>move(0,-.05)}>↑</button>
              <div><button aria-label="Move TLC left" onClick={()=>move(-.05,0)}>←</button><button aria-label="Move TLC down" onClick={()=>move(0,.05)}>↓</button><button aria-label="Move TLC right" onClick={()=>move(.05,0)}>→</button></div>
            </div>
            <div className="tlc-premium-hero-abilities" role="group" aria-label="TLC Commander abilities">
              <Action disabled={!running||ammo.nuke===0} onClick={()=>fire("nuke")}>NUKE {ammo.nuke}</Action>
              <Action disabled={!running} onClick={()=>fire("water")}>WATER</Action>
              <Action disabled={!running||ammo.lipstick===0} onClick={()=>fire("lipstick")}>LIPSTICK {ammo.lipstick}</Action>
              <Action disabled={!running||ammo.shockwave===0} onClick={()=>fire("shockwave")}>SHOCKWAVE {ammo.shockwave}</Action>
              <Action disabled={!running} onClick={()=>fire("rally")}>RALLY</Action>
            </div>
          </div>}
        </section>
        <section className="tlc-premium-team tlc-premium-women" aria-label="Women panel">
          <div className="tlc-premium-panel-heading"><div><small>PINK CORNER / TEAM 02</small><h2>WOMEN <span>{teams.women.count}</span></h2></div><Swords size={20}/></div>
          <label className="tlc-premium-slider"><span>FIGHTERS <b>{teams.women.count}</b></span><input aria-label="Women count" type="range" min={1} max={Math.min(99,TOTAL_CAP-teams.men.count)} value={teams.women.count} disabled={!canEdit} onChange={e=>adjustCount("women",Number(e.target.value))}/></label>
          <label className="tlc-premium-slider"><span>SPEED <b>{teams.women.speed.toFixed(1)}×</b></span><input aria-label="Women speed" type="range" min={.7} max={1.5} step={.1} value={teams.women.speed} onChange={e=>patchWomen({speed:Number(e.target.value)})}/></label>
          <div className="tlc-premium-weapons" role="group" aria-label="Women weapons">{WOMEN_WEAPONS.map(w=>weaponButton(w.id,w.label,w.icon,teams.women.weapon===w.id,()=>{patchWomen({weapon:w.id});playUiClick();}))}</div>
          <div className="tlc-premium-team-bottom">
            <label className="tlc-premium-select-label">FORMATION <ChevronDown size={13}/><select aria-label="Women formation" value={teams.women.formation} disabled={!canEdit} onChange={e=>patchWomen({formation:e.target.value as SandboxTeams["women"]["formation"]},true)}>{FORMATIONS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
            <Action active={teams.women.rage} onClick={()=>patchWomen({rage:!teams.women.rage})}><Zap size={14}/> RAGE</Action>
          </div>
          <Action className="tlc-premium-furiosa" active={teams.women.furiosa} onClick={()=>{patchWomen({furiosa:!teams.women.furiosa});playUiClick();}}><Flame size={15}/>{teams.women.furiosa?"FURIOSA ACTIVE":"ACTIVATE FURIOSA"}</Action>
        </section>
      </div>
      {winner&&<div className="tlc-premium-results" role="dialog" aria-modal="true" aria-label="Final match results"><div><small>FINAL / TLC BATTLECAST</small><h2>{winner==="draw"?"MATCH DRAW":winner==="men"?"MEN WIN":"WOMEN WIN"}</h2><p>Men {fmt(stats.menAlive)} remaining · Women {fmt(stats.womenAlive)} remaining</p><Action onClick={()=>reset(teams)}><RotateCcw size={17}/> RUN IT BACK</Action></div></div>}
    </div>
  </div>;
};
export default PremiumSandbox;
