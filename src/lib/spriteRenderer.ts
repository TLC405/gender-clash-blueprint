/**
 * TLC Battle — Canvas 2D human stick-figure fallback.
 * The primary renderer uses actual Three.js 3D rigs. This path uses shaded
 * articulated silhouettes if WebGL is unavailable or context creation fails.
 * No health bars, HP indicators or unit-circle sprites are rendered.
 */
import { TEAM_MEN, FLAG_ALIVE, FLAG_LEADER, type BattleSoA } from './battleSoA';
import type { CombatMode } from './combatModes';
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
  arenaRage = false
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
    const furiosa = combatMode === 'furiosa' && !men;
    const scale = style.height * (furiosa ? 1.42 : men ? 1.03 : 0.98);
    const stride = motion.stride * 2.4 * scale;
    const strike = still ? 0 : attackEnvelope(soa.attackTimer[i]);
    const jab = soa.attackKind[i] === STRIKE_JAB ? strike : 0;
    const shove = soa.attackKind[i] === STRIKE_SHOVE ? strike : 0;
    const guard = still ? 0 : guardEnvelope(soa.guardTimer[i], soa.attackTimer[i]);
    const front = men ? 1 : -1;
    const lean = (motion.lean + front * (jab*0.8 + shove*1.2)) * scale;
    const hip = 2 * style.hips * scale;
    const shoulder = 3 * style.shoulders * scale;
    const shades = men ? STICK_FIGHTER_PALETTES.men : STICK_FIGHTER_PALETTES.women;
    const color = furiosa ? '#ee799b' : arenaRage ? (men ? '#ffe273' : '#ff9e47') : (soa.stateFlags[i] & FLAG_LEADER) !== 0 ? '#f7cc71' : '#' + shades[style.shade].toString(16).padStart(6,'0');
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
    line(pelvisX,pelvisY,neckX,neckY,(furiosa?3.6:2.1)*scale);
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
    // Handheld cartoon equipment and transformed Furiosa muscle definition.
    if(furiosa){
      ctx.strokeStyle='#ffd2df';ctx.lineWidth=2.1*scale;
      ctx.beginPath();ctx.arc(neckX-shoulder-2*scale,neckY+4*scale,2*scale,0,Math.PI*1.6);ctx.stroke();
      ctx.beginPath();ctx.arc(neckX+shoulder+2*scale,neckY+4*scale,2*scale,0,Math.PI*1.6);ctx.stroke();
      // Bald head: no hair mesh or accessory.
    }
    if(combatMode==='swords'||combatMode==='mayhem'){
      ctx.strokeStyle=men?'#9fe8ff':'#ffd0e2';ctx.lineWidth=1.6*scale;
      ctx.beginPath();ctx.moveTo(neckX+shoulder+4*scale,neckY+6*scale);ctx.lineTo(neckX+shoulder+13*scale,neckY-10*scale);ctx.stroke();
    } else if((combatMode==='blasters'&&men)||(combatMode==='beauty'&&!men)||(combatMode==='water')){
      ctx.lineWidth=3*scale;ctx.strokeStyle=combatMode==='water'?'#5df0ff':men?'#9db7ff':'#ff4a99';
      ctx.beginPath();ctx.moveTo(neckX+shoulder+4*scale,neckY+5*scale);ctx.lineTo(neckX+shoulder+12*scale,neckY+5*scale);ctx.stroke();
    }
    if(arenaRage){
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
