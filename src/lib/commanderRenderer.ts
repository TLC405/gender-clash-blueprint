/**
 * Playable TLC Commander — a true full-body procedural character, not an avatar
 * photo pasted into the arena. Uses the same articulated body/perspective space
 * as the 2D human fighter fallback, plus a distinct championship costume.
 *
 * This is an original stylized athlete design; exact facial likeness requires
 * visual reference and isn't fabricated.
 */
import type { HeroWeapon } from "./combatModes";
const curve=(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,fill:CanvasGradient|string)=>{
 ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
};
const grad=(ctx:CanvasRenderingContext2D,y0:number,y1:number,top:string,bottom:string)=>{
 const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,top);g.addColorStop(1,bottom);return g;
};
function limb(ctx:CanvasRenderingContext2D,x:number,y:number,x2:number,y2:number,width:number,color:string,shine:string){
 ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle="#050c17";ctx.lineWidth=width+3;ctx.stroke();
 ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
 ctx.beginPath();ctx.moveTo(x-1,y-.5);ctx.lineTo(x2-1,y2-.5);ctx.strokeStyle=shine;ctx.lineWidth=Math.max(.8,width*.25);ctx.stroke();
}
export function renderTlcCommander(
 ctx:CanvasRenderingContext2D,x:number,y:number,seconds:number,
 weapon:HeroWeapon="water",scale=1.25,reduced=false
):void{
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 const stride=reduced?0:Math.sin(seconds*6.8)*1.7;
 const bob=reduced?0:Math.sin(seconds*5.1)*.75;
 const punch=reduced?0:Math.max(0,Math.sin(seconds*4.3));
 const skin="#ac7956",skinLight="#d7a480";
 const boots="#111f31",fabric="#24486d",fabricTop="#3d83b8",metal="#eec184";
 // Feet on the SAME world surface as other fighters.
 curve(ctx,0,1,16,4,"rgba(2,8,18,.48)");
 // Broad lower body, athletic boots, textured armor leggings.
 limb(ctx,-5,-16,-6-stride,-8,7,boots,"#46607b");
 limb(ctx,-6-stride,-8,-7-stride*1.4,0,5.8,boots,"#415a78");
 limb(ctx,5,-16,6+stride,-8,7,boots,"#46607b");
 limb(ctx,6+stride,-8,7+stride*1.4,0,5.8,boots,"#415a78");
 curve(ctx,-7-stride*1.4,0,4.5,2.2,"#061526");
 curve(ctx,7+stride*1.4,0,4.5,2.2,"#061526");
 ctx.fillStyle=grad(ctx,-37,-13,fabricTop,"#0b2444");
 ctx.strokeStyle="#071221";ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(-11,-37+bob);ctx.quadraticCurveTo(0,-41+bob,11,-37+bob);
 ctx.lineTo(9,-17+bob);ctx.quadraticCurveTo(0,-13+bob,-9,-17+bob);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(-9,-29+bob);ctx.lineTo(9,-29+bob);ctx.strokeStyle="#e8b96b66";ctx.lineWidth=1.2;ctx.stroke();
 // Large functional upper arms and shoulder armor (not stick cylinders).
 limb(ctx,-11,-35+bob,-16,-25+bob,8,skin,skinLight);
 limb(ctx,-16,-25+bob,-13,-18+bob,6.3,skin,skinLight);
 limb(ctx,11,-35+bob,17+punch*3,-25+bob,8,skin,skinLight);
 limb(ctx,17+punch*3,-25+bob,18+punch*7,-19+bob,6.3,skin,skinLight);
 curve(ctx,-12,-35+bob,6.2,5.2,fabricTop);
 curve(ctx,12,-35+bob,6.2,5.2,fabricTop);
 ctx.fillStyle=metal;ctx.beginPath();ctx.moveTo(-11,-35+bob);ctx.lineTo(-8,-32+bob);ctx.lineTo(-4,-37+bob);ctx.closePath();ctx.fill();
 // Neck and facial geometry: jaw, cheek, nose, brows, and short-cropped hair.
 curve(ctx,0,-40+bob,3.5,4,skin);
 ctx.fillStyle=grad(ctx,-56+bob,-40+bob,skinLight,skin);
 ctx.beginPath();ctx.moveTo(-6,-51+bob);ctx.quadraticCurveTo(-7,-59+bob,0,-59+bob);
 ctx.quadraticCurveTo(8,-58+bob,7,-49+bob);ctx.lineTo(5,-43+bob);ctx.lineTo(0,-40+bob);
 ctx.lineTo(-5,-44+bob);ctx.closePath();ctx.fill();
 ctx.strokeStyle="#1c242c";ctx.lineWidth=1.2;ctx.stroke();
 // Hair reads as a sculpted solid volume rather than a paper photo.
 ctx.fillStyle="#111c2c";ctx.beginPath();ctx.moveTo(-6.5,-51+bob);
 ctx.quadraticCurveTo(-9,-60+bob,0,-61+bob);ctx.quadraticCurveTo(10,-60+bob,7.3,-51+bob);
 ctx.quadraticCurveTo(1,-54+bob,-6.5,-51+bob);ctx.fill();
 ctx.fillStyle="#15263a";curve(ctx,-2,-57+bob,4,1.2,"#243951");
 ctx.strokeStyle="#2b2321";ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(-4.8,-48+bob);ctx.lineTo(-2.3,-48+bob);ctx.moveTo(2.1,-48+bob);ctx.lineTo(4.5,-48+bob);ctx.stroke();
 curve(ctx,-2.6,-47.5+bob,.8,.8,"#eaf0f7");curve(ctx,2.8,-47.5+bob,.8,.8,"#eaf0f7");
 ctx.strokeStyle="#744c3b";ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(0,-47+bob);ctx.lineTo(-.6,-44.6+bob);ctx.stroke();
 ctx.strokeStyle="#3d2a28";ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,-44+bob,2,0,Math.PI);ctx.stroke();
 // Emblem integrated into garment: no UI over the combat field.
 ctx.fillStyle="#071c32";ctx.strokeStyle=metal;ctx.lineWidth=1.4;
 ctx.beginPath();ctx.moveTo(0,-36+bob);ctx.lineTo(7,-32+bob);ctx.lineTo(5,-24+bob);ctx.lineTo(0,-22+bob);ctx.lineTo(-5,-24+bob);ctx.lineTo(-7,-32+bob);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle="#f6ce88";ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(-4,-31+bob);ctx.lineTo(4,-31+bob);ctx.moveTo(0,-31+bob);ctx.lineTo(0,-25+bob);ctx.stroke();
 // Weapon readable as a physical object held in hand.
 const wy=-20+bob;
 if(weapon==="nuke"||weapon==="shockwave"){
   curve(ctx,23+punch*6,wy,5,5,weapon==="nuke"?"#f2a95c":"#71e4ff");
   ctx.strokeStyle="#ffffff88";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(23+punch*6,wy,9,0,Math.PI*2);ctx.stroke();
 }else{
   const color=weapon==="water"?"#6edaff":weapon==="lipstick"?"#ef629d":"#e9b276";
   limb(ctx,18+punch*7,wy,30+punch*8,wy-2,4,color,"#ffffffc7");
   ctx.fillStyle="#14283b";ctx.fillRect(21+punch*7,wy,5,5);
 }
 ctx.restore();
}
