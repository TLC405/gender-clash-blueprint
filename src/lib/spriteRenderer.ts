/**
 * TLC Battle — Canvas 2D human stick-figure fallback.
 * The primary renderer uses actual Three.js 3D rigs. This path uses shaded
 * articulated silhouettes if WebGL is unavailable or context creation fails.
 * No health bars, HP indicators or unit-circle sprites are rendered.
 */
import { TEAM_MEN, FLAG_ALIVE, FLAG_LEADER, type BattleSoA } from './battleSoA';
import type { CombatMode } from './combatModes';
import { DEFAULT_TEAMS,type SandboxTeams } from './sandboxLoadouts';
import { attackEnvelope, guardEnvelope, STRIKE_JAB, STRIKE_SHOVE } from './combatChoreography';
import { getStickFigureVariant, getStickMotion, STICK_FIGHTER_PALETTES } from './stickFigureVariants';

export function initSprites(): void {}

export function renderUnits(
  ctx: CanvasRenderingContext2D,
  soa: BattleSoA,
  _discoMode = false,
  _globalFrame = 0,
  _lighterBlend = false,
  currentPhase = 'melee',
  combatMode: CombatMode = 'brawl',
  arenaRage = false,
  teams:SandboxTeams = DEFAULT_TEAMS
): void {
  const now = performance.now() / 1000;
  const still = currentPhase === 'stand' || currentPhase === 'victory';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;
    const x = soa.posX[i], y = soa.posY[i];
    const men = soa.teamID[i] === TEAM_MEN;
    const style = getStickFigureVariant(i, soa.teamID[i]);
    const motion = getStickMotion(style, now, still ? 0 : Math.hypot(soa.velX[i], soa.velY[i]), soa.stagger[i], still);
    const furiosa = teams.women.furiosa && !men;
    const scale = style.height * (furiosa ? 2.25 : men ? 1.78 : 1.62);
    const stride = motion.stride * 2.4 * scale;
    const strike = still ? 0 : attackEnvelope(soa.attackTimer[i]);
    const jab = soa.attackKind[i] === STRIKE_JAB ? strike : 0;
    const shove = soa.attackKind[i] === STRIKE_SHOVE ? strike : 0;
    const guard = still ? 0 : guardEnvelope(soa.guardTimer[i], soa.attackTimer[i]);
    const front = men ? 1 : -1;
    const lean = (motion.lean + front * (jab*0.8 + shove*1.2)) * scale;
    const hip = 2 * style.hips * scale;
    const shoulder = 3 * style.shoulders * scale * (furiosa ? 1.3 : men ? 1.18 : 1);
    const shades = men ? STICK_FIGHTER_PALETTES.men : STICK_FIGHTER_PALETTES.women;
    const color = furiosa ? '#e05a85' : arenaRage ? (men ? '#5cb4ff' : '#f77dad') : (soa.stateFlags[i] & FLAG_LEADER) !== 0 ? '#f7cc71' : '#' + shades[style.shade].toString(16).padStart(6,'0');
    const skin = '#' + STICK_FIGHTER_PALETTES.skin[(style.shade + i) % STICK_FIGHTER_PALETTES.skin.length].toString(16).padStart(6,'0');

    ctx.fillStyle = 'rgba(4,11,22,.26)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1.1 * scale, 4.7 * scale, 1.7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    // Outlined cylinders create volume even in the Canvas fallback.
    const line = (ax:number,ay:number,bx:number,by:number,w:number) => {
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.strokeStyle='rgba(1,6,17,.65)'; ctx.lineWidth=w+1.7;
      ctx.stroke();
      ctx.strokeStyle=color; ctx.lineWidth=w; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax-0.25, ay-0.25); ctx.lineTo(bx-0.25, by-0.25);
      ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=Math.max(0.35,w*0.26);ctx.stroke();
    };
    const pelvisX=lean*.3, pelvisY=-8*scale;
    const neckX=lean, neckY=-15*scale*(1-motion.recoil*.16);
    const hipL=pelvisX-hip, hipR=pelvisX+hip;
    const kneeL=-hip*.8-stride*.5, kneeR=hip*.8+stride*.5;
    const footL=-hip-stride, footR=hip+stride;
    line(hipL,pelvisY,kneeL,-4.3*scale,1.9*scale);
    line(kneeL,-4.3*scale,footL,0,1.45*scale);
    line(hipR,pelvisY,kneeR,-4.3*scale,1.9*scale);
    line(kneeR,-4.3*scale,footR,0,1.45*scale);
    // Sculpted torso/hip silhouette with real shoulder taper and clothing sheen.
    const jersey=ctx.createLinearGradient(-shoulder,neckY,shoulder,pelvisY);
    jersey.addColorStop(0,men?'#85c9ff':furiosa?'#ffa2bd':'#ffd1e5');
    jersey.addColorStop(.3,color);jersey.addColorStop(1,men?'#103258':'#7a2c5a');
    ctx.fillStyle=jersey;ctx.strokeStyle='#0a1322';ctx.lineWidth=1.3*scale;
    ctx.beginPath();
    ctx.moveTo(neckX-shoulder,neckY+1.4*scale);
    ctx.quadraticCurveTo(neckX,neckY-1.3*scale,neckX+shoulder,neckY+1.4*scale);
    ctx.lineTo(pelvisX+hip*1.4,pelvisY);
    ctx.quadraticCurveTo(pelvisX,pelvisY+2*scale,pelvisX-hip*1.4,pelvisY);
    ctx.closePath();ctx.fill();ctx.stroke();
    // Broad chest and subtle abdominal seam.
    ctx.beginPath();ctx.moveTo(neckX-shoulder*.5,neckY+5.5*scale);
    ctx.lineTo(neckX+shoulder*.5,neckY+5.5*scale);
    ctx.strokeStyle='rgba(244,246,250,.27)';ctx.lineWidth=.8*scale;ctx.stroke();
    // Belt and visible hands remain integrated with the body.
    line(pelvisX-hip*.95,pelvisY,pelvisX+hip*.95,pelvisY,1.6*scale);
    const elbowLY=neckY+(4-guard*2.2-shove*2)*scale;
    const elbowRY=neckY+(4-guard*2.2-jab*2.3-shove*2)*scale;
    const elbowLX=neckX-shoulder-1.6*scale-stride*.4+front*shove*3.2*scale;
    const elbowRX=neckX+shoulder+1.6*scale-stride*.4+front*(jab*3.5+shove*3.2)*scale;
    line(neckX-shoulder,neckY,elbowLX,elbowLY,1.5*scale);
    line(elbowLX,elbowLY,
      elbowLX-1.1*scale+front*(shove*5.1+guard*.6)*scale,
      elbowLY+(3-guard*5-shove*3)*scale,1.1*scale);
    line(neckX+shoulder,neckY,elbowRX,elbowRY,1.5*scale);
    line(elbowRX,elbowRY,
      elbowRX+1.1*scale+front*(jab*6.3+shove*5.1+guard*.6)*scale,
      elbowRY+(3-guard*5-jab*4.1-shove*3)*scale,1.1*scale);
    ctx.beginPath();
    ctx.arc(neckX+.4*scale,neckY-3.6*scale,2.55*scale,0,Math.PI*2);
    ctx.fillStyle=skin;ctx.fill();
    ctx.strokeStyle='rgba(12,19,28,.8)';ctx.lineWidth=.8*scale;ctx.stroke();
    ctx.beginPath();
    ctx.arc(neckX-.2*scale,neckY-4.4*scale,0.5*scale,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,.6)';ctx.fill();
    // Eyebrows, nose, cheek structure, human jaw, and ears.
    ctx.strokeStyle='#3e292a';ctx.lineWidth=.8*scale;ctx.beginPath();
    ctx.moveTo(neckX-1.8*scale,neckY-5.3*scale);ctx.lineTo(neckX-.4*scale,neckY-5.4*scale);
    ctx.moveTo(neckX+.9*scale,neckY-5.3*scale);ctx.lineTo(neckX+2.2*scale,neckY-5.2*scale);ctx.stroke();
    ctx.fillStyle=skin;ctx.beginPath();ctx.arc(neckX-2.4*scale,neckY-3.4*scale,.68*scale,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(neckX+2.5*scale,neckY-3.4*scale,.68*scale,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#815039';ctx.beginPath();ctx.moveTo(neckX+.6*scale,neckY-3.7*scale);ctx.lineTo(neckX+.1*scale,neckY-2.8*scale);ctx.stroke();
    if(!furiosa){
      ctx.fillStyle=men?'#17243a':'#ffcf6d';ctx.strokeStyle=men?'#111d2e':'#ad7a37';
      ctx.lineWidth=.6*scale;
      ctx.beginPath();ctx.ellipse(neckX+.2*scale,neckY-5.4*scale,2.9*scale,1.45*scale,0,Math.PI,2*Math.PI);
      ctx.fill();ctx.stroke();
      if(!men){
        // Faceted blonde side hair/ponytail for unmistakable team identity.
        ctx.beginPath();ctx.moveTo(neckX+2.5*scale,neckY-5.5*scale);
        ctx.quadraticCurveTo(neckX+5.3*scale,neckY-3.7*scale,neckX+4.1*scale,neckY+.2*scale);
        ctx.lineTo(neckX+2.5*scale,neckY-1.7*scale);ctx.closePath();ctx.fill();ctx.stroke();
      }
    }
    // Handheld cartoon equipment and transformed Furiosa muscle definition.
    if(furiosa){
      ctx.strokeStyle='#ffd2df';ctx.lineWidth=2.1*scale;
      ctx.beginPath();ctx.arc(neckX-shoulder-2*scale,neckY+4*scale,2*scale,0,Math.PI*1.6);ctx.stroke();
      ctx.beginPath();ctx.arc(neckX+shoulder+2*scale,neckY+4*scale,2*scale,0,Math.PI*1.6);ctx.stroke();
      // Bald head: no hair mesh or accessory.
    }
    const equip=men?teams.men.weapon:teams.women.weapon;
    const sword=men?(equip==='swords'||equip==='guns+swords'):false;
    const blaster=men?(equip==='guns'||equip==='guns+swords'):(equip==='lipstick'||equip==='lipstick+makeup');
    const makeup=!men&&(equip==='makeup'||equip==='lipstick+makeup');
    const wx=neckX+shoulder+8*scale,wy=neckY+5*scale;
    if(sword){
      ctx.strokeStyle='#9cc9e8';ctx.lineWidth=1.2*scale;
      ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(wx+9*scale,wy-13*scale);ctx.stroke();
      ctx.strokeStyle='#f0f8ff';ctx.lineWidth=.4*scale;ctx.stroke();
      ctx.strokeStyle='#eab675';ctx.lineWidth=2*scale;ctx.beginPath();ctx.moveTo(wx-2*scale,wy-1*scale);ctx.lineTo(wx+3*scale,wy-5*scale);ctx.stroke();
    }
    if(blaster){
      ctx.strokeStyle=men?'#7de4ff':'#ff5aa3';
      ctx.lineWidth=3.8*scale;ctx.beginPath();ctx.moveTo(wx-2*scale,wy);ctx.lineTo(wx+8*scale,wy);ctx.stroke();
      ctx.fillStyle='#142d43';ctx.fillRect(wx+2*scale,wy,2.5*scale,3.6*scale);
      ctx.fillStyle=men?'#a4efff':'#ffe3f1';ctx.fillRect(wx+5.5*scale,wy-.8*scale,2.4*scale,1.6*scale);
    }
    if(makeup){
      ctx.fillStyle='#ffc17e';ctx.beginPath();ctx.arc(wx+5*scale,wy-1*scale,3*scale,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ef65aa';ctx.beginPath();ctx.arc(wx+5*scale,wy-1*scale,1.5*scale,0,Math.PI*2);ctx.fill();
    }
    if(arenaRage || (men?teams.men.rage:teams.women.rage)){
      ctx.strokeStyle=men?'rgba(255,214,93,.8)':'rgba(255,112,135,.8)';
      ctx.lineWidth=.7;ctx.beginPath();ctx.arc(0,-9*scale,11*scale,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

export function renderUnitsOffscreen(
  mainCtx: CanvasRenderingContext2D, soa: BattleSoA,
  offscreenCanvas: OffscreenCanvas, discoMode = false, globalFrame = 0
): void {
  const ctx = offscreenCanvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
  ctx.save();
  ctx.scale(0.5, 0.5);
  renderUnits(ctx as unknown as CanvasRenderingContext2D, soa, discoMode, globalFrame, false);
  ctx.restore();
  mainCtx.drawImage(
    offscreenCanvas, 0, 0, offscreenCanvas.width, offscreenCanvas.height,
    0, 0, offscreenCanvas.width * 2, offscreenCanvas.height * 2
  );
}
