/**
 * TLC Battle critical crowd choreography.
 *
 * Inspired by Craig Reynolds' local separation / alignment / cohesion:
 * https://www.red3d.com/cwr/steer/gdc99/
 *
 * This is authored 2D arcade choreography, NOT reciprocal velocity
 * obstacle physics, biomechanical combat or full rigid-body ragdolls.
 */
export const MAX_SQUADS = 8;
export const STRIKE_DURATION = 0.36;
export const STRIKE_JAB = 1;
export const STRIKE_SHOVE = 2;

const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x));

/** Same squad lanes for BOTH armies, even when one side greatly outnumbers the other. */
export function getSquadCount(maxArmySize:number):number {
  // Tiny matches are centered, rather than placed in the top-most lane.
  if(maxArmySize<40)return 1;
  if(maxArmySize<90)return 2;
  return clamp(Math.round(Math.sqrt(Math.max(1,maxArmySize)/50)),3,MAX_SQUADS);
}

export interface FormationSlot {
  lane:number;
  row:number;
  col:number;
  x:number;
  y:number;
  laneCenterY:number;
}

/** A readable layered battalion layout with small deterministic visual variation. */
export function formationSlot(
  index:number, count:number, maxArmySize:number, team:number,
  width:number, height:number,
):FormationSlot {
  const lanes=getSquadCount(maxArmySize);
  const perLane=Math.ceil(count/lanes);
  const lane=clamp(Math.floor(index/perLane),0,lanes-1);
  const withinLane=index-lane*perLane;
  const inThisLane=Math.min(perLane,count-lane*perLane);
  const columns=Math.max(3,Math.min(22,Math.ceil(Math.sqrt(inThisLane*1.6))));
  const rows=Math.max(1,Math.ceil(inThisLane/columns));
  const row=Math.floor(withinLane/columns);
  const col=withinLane%columns;
  const laneSpace=Math.max(1,(height-42)/lanes);
  const centerY=21+(lane+0.5)*laneSpace;
  const gapX=clamp(width*0.30/Math.max(1,columns-1),2.6,8);
  const gapY=clamp(laneSpace/Math.max(1,rows+1),2.4,11);
  const direction=team===0?1:-1;
  const originX=team===0?Math.max(24,width*0.10):Math.min(width-24,width*0.90);
  // Stable, small offsets prevent a rigid block of perfectly matching people.
  const wobble=((Math.imul(index+1,1103515245)>>>16)%17-8)/8;
  const x=clamp(originX+direction*col*gapX+wobble*0.85,24,width-24);
  const y=clamp(centerY+(row-(rows-1)/2)*gapY+wobble*0.4,24,height-24);
  return {lane,row,col,x,y,laneCenterY:centerY};
}

export function laneTargetY(lane:number,lanes:number,height:number):number {
  return clamp(21+(clamp(lane,0,lanes-1)+0.5)*(height-42)/lanes,24,height-24);
}

/** Single, smooth contact pulse. No animation at rest or after expiration. */
export function attackEnvelope(timeRemaining:number):number {
  if(!Number.isFinite(timeRemaining)||timeRemaining<=0)return 0;
  const progress=1-clamp(timeRemaining/STRIKE_DURATION,0,1);
  return Math.max(0,Math.sin(Math.PI*progress));
}

/** Reduce bracing while a jab/shove is underway. */
export function guardEnvelope(guardTime:number,attackTime:number):number {
  if(guardTime<=0||attackTime>0)return 0;
  return clamp(guardTime/0.25,0,1);
}
