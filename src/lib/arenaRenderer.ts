/**
 * TLC championship field: broadcast-grade, pixel-density-independent Canvas 2D.
 * The center logo is an original scalable SVG asset, rendered below all units.
 * No gameplay wording, health bars, badges or HUD overlays are painted here.
 */
import type { ArenaSurface } from "./arenaOptions";

const SURFACES: Record<ArenaSurface, {
  base: string; light: string; dark: string; line: string;
  warm: string; cool: string; texture: "wood" | "storm" | "concrete" | "turf";
}> = {
  championship: { base:"#0b2949", light:"#174d7b",dark:"#071829",line:"#d2dfef",warm:"#eb853d",cool:"#359de1",texture:"wood" },
  thunderstorm: { base:"#101f39",light:"#20395a",dark:"#070d1b",line:"#adccf4",warm:"#dd7d45",cool:"#5da6df",texture:"storm" },
  concrete: { base:"#30343b",light:"#414851",dark:"#151a22",line:"#bec8d1",warm:"#d99965",cool:"#7aa4c2",texture:"concrete" },
  tactical: { base:"#133629",light:"#22533d",dark:"#091e17",line:"#c0d9c6",warm:"#d9a16d",cool:"#6aaacf",texture:"turf" },
};

function line(ctx:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,color:string,width:number) {
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}

function arcs(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,start:number,end:number,color:string,width=1.4) {
  ctx.beginPath();ctx.arc(x,y,r,start,end);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}

export function renderPremiumArena(
  ctx:CanvasRenderingContext2D, width:number,height:number,
  surface:ArenaSurface, logo?:HTMLImageElement|null
):void {
  const theme=SURFACES[surface];
  const margin=Math.max(6,Math.min(width,height)*0.029);
  const x=margin,y=margin,w=Math.max(1,width-2*margin),h=Math.max(1,height-2*margin);
  const cx=width/2,cy=height/2;
  const unit=Math.min(w,h);
  // Inset high-contrast broadcast frame.
  ctx.fillStyle="#050a12";ctx.fillRect(0,0,width,height);
  ctx.save();
  ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  const base=ctx.createLinearGradient(x,y,x+w,y+h);
  base.addColorStop(0,theme.light);base.addColorStop(.32,theme.base);
  base.addColorStop(.72,theme.base);base.addColorStop(1,theme.dark);
  ctx.fillStyle=base;ctx.fillRect(x,y,w,h);
  // Material finish: low-cost procedural treatments, cached as a bitmap.
  if(theme.texture==="wood"){
    for(let i=0;i<34;i++){
      const py=y+i*h/34;
      ctx.fillStyle=i%2?"#d9a56209":"#ffffff06";
      ctx.fillRect(x,py,w,h/34);
      line(ctx,x,py,x+w,py,"#f3d5b015",.8);
      for(let j=0;j<5;j++){
        const split=x+((i*3+j*11)%7)*w/7;
        line(ctx,split,py,split,py+h/34,"#d4b68b13",.7);
      }
    }
  }else if(theme.texture==="storm"){
    for(let i=0;i<25;i++){
      const px=x+i*w/25;
      line(ctx,px,y,px+w*.12,y+h,"#85c4ff0d",1.3);
    }
    for(let i=0;i<5;i++){
      const xx=x+i*w/4;
      line(ctx,xx,y+h*.04,xx+w*.055,y+h*.28,theme.cool+"2d",2);
      line(ctx,xx+w*.055,y+h*.28,xx-w*.035,y+h*.43,theme.cool+"2d",2);
    }
  }else if(theme.texture==="concrete"){
    for(let i=0;i<1600;i++){
      const px=x+(((i*1103515245+273)%32749+32749)%32749)/32749*w;
      const py=y+(((i*2654435761+91)%31297+31297)%31297)/31297*h;
      ctx.fillStyle=i%3===0?"#ffffff0c":"#0000000c";
      ctx.fillRect(px,py,1.1,1.1);
    }
    for(let i=1;i<8;i++)line(ctx,x+i*w/8,y,x+i*w/8,y+h,"#ffffff12",.9);
  }else{
    for(let i=0;i<18;i++){
      ctx.fillStyle=i%2?"#ffffff05":"#00000008";
      ctx.fillRect(x+i*w/18,y,w/18,h);
    }
  }
  // Team territory is a gentle inlaid paint treatment, not an opaque overlay.
  const left=ctx.createLinearGradient(x,0,x+w*.38,0);
  left.addColorStop(0,"#147ed069");left.addColorStop(1,"#147ed000");
  ctx.fillStyle=left;ctx.fillRect(x,y,w*.38,h);
  const right=ctx.createLinearGradient(x+w,0,x+w*.62,0);
  right.addColorStop(0,"#fa59905b");right.addColorStop(1,"#f05b9600");
  ctx.fillStyle=right;ctx.fillRect(x+w*.62,y,w*.38,h);

  // Championship floor markings / 5-a-side proportions, readable from Fold.
  const mark=theme.line+"61";
  const faint=theme.line+"25";
  line(ctx,cx,y,cx,y+h,mark,Math.max(1.3,unit*.0034));
  for(const z of [0.17,0.33,0.67,0.83]){
    const px=x+w*z;
    line(ctx,px,y+h*.10,px,y+h*.90,faint,1.2);
    line(ctx,px-4,y+h*.25,px+4,y+h*.25,mark,.9);
    line(ctx,px-4,y+h*.75,px+4,y+h*.75,mark,.9);
  }
  arcs(ctx,cx,cy,unit*.188,0,Math.PI*2,mark,2.1);
  arcs(ctx,cx,cy,unit*.232,0,Math.PI*2,faint,1.1);
  // Two counterbalanced arc keys, styled like an elite televised court.
  for(const side of [-1,1]){
    const ex=cx+side*w*.445;
    const from=side>0?Math.PI*.5:-Math.PI*.5;
    arcs(ctx,ex,cy,unit*.26,from,from+Math.PI,theme.line+"40",1.5);
    line(ctx,ex,cy-unit*.11,ex-side*w*.085,cy-unit*.11,theme.line+"4b",1.1);
    line(ctx,ex,cy+unit*.11,ex-side*w*.085,cy+unit*.11,theme.line+"4b",1.1);
  }
  // The gold/silver crest is a permanent FLOOR MARK beneath the fighters.
  const logoWidth=Math.min(w*.39,unit*.94);
  const logoHeight=logoWidth*2/3;
  ctx.save();
  ctx.globalAlpha=surface==="championship"?.42:.30;
  if(logo?.complete && logo.naturalWidth>0){
    ctx.drawImage(logo,cx-logoWidth/2,cy-logoHeight/2,logoWidth,logoHeight);
  }else{
    // Fallback before image asset decoded: a readable geometric TLC monogram.
    ctx.fillStyle="#072548bf";ctx.strokeStyle="#e0a368";
    ctx.lineWidth=3;ctx.beginPath();
    ctx.moveTo(cx,cy-logoHeight*.50);ctx.lineTo(cx+logoWidth*.42,cy-logoHeight*.15);
    ctx.lineTo(cx+logoWidth*.33,cy+logoHeight*.42);ctx.lineTo(cx,cy+logoHeight*.55);
    ctx.lineTo(cx-logoWidth*.33,cy+logoHeight*.42);ctx.lineTo(cx-logoWidth*.42,cy-logoHeight*.15);
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.font="italic 900 "+Math.max(24,logoHeight*.49)+"px Arial Black, sans-serif";
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.lineWidth=4;ctx.strokeStyle="#081b36";ctx.strokeText("TLC",cx,cy);
    ctx.fillStyle="#e3f3ff";ctx.fillText("TLC",cx,cy);
  }
  ctx.restore();

  // Corner line indicators and subdued copper-blue championship trim.
  for(let i=0;i<2;i++){
    const inset=i*3.5;
    ctx.strokeStyle=i===0?theme.warm+"a0":theme.cool+"65";
    ctx.lineWidth=i===0?2.8:1.4;
    ctx.strokeRect(x+inset,y+inset,w-inset*2,h-inset*2);
  }
  for(const side of [-1,1]){
    const ex=side<0?x:x+w;
    line(ctx,ex,cy-unit*.24,ex-side*unit*.09,cy-unit*.24,theme.warm+"87",2.5);
    line(ctx,ex,cy+unit*.24,ex-side*unit*.09,cy+unit*.24,theme.warm+"87",2.5);
  }
  const light=ctx.createRadialGradient(cx,cy,unit*.06,cx,cy,Math.max(w,h)*.75);
  light.addColorStop(0,"#ffffff09");light.addColorStop(.64,"#00000000");light.addColorStop(1,"#02081275");
  ctx.fillStyle=light;ctx.fillRect(x,y,w,h);
  ctx.restore();

  // Premium outer rail and fixture highlights stay outside the playable floor.
  ctx.strokeStyle=theme.warm+"bf";ctx.lineWidth=1.5;ctx.strokeRect(x-3,y-3,w+6,h+6);
  const top=ctx.createLinearGradient(0,0,0,margin);
  top.addColorStop(0,"#c9def01e");top.addColorStop(1,"#00000000");
  ctx.fillStyle=top;ctx.fillRect(0,0,width,margin);
  ctx.fillRect(0,height-margin,width,margin);
}
