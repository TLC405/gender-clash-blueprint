/**
 * TLC Battlecast real-browser smoke test, not a unit test.
 * Launches actual production output on Android/Fold-sized viewports.
 * A failing client-side JS exception fails the release.
 */
import { chromium } from "playwright";

const app=process.env.SMOKE_URL||"http://127.0.0.1:4173/";
const browser=await chromium.launch({
  headless:true,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader"],
});
let failed=false;
const scenarios=[
 {name:"Fold closed Android", width:390,height:840,isMobile:true,deviceScaleFactor:2},
 {name:"Fold safe mode", width:390,height:840,isMobile:true,deviceScaleFactor:1,safe:true},
 {name:"Fold open tablet",width:840,height:790,isMobile:true,deviceScaleFactor:2},
 {name:"Desktop",width:1280,height:800,isMobile:false,deviceScaleFactor:1},
];
for(const scenario of scenarios){
  const ctx=await browser.newContext({
    viewport:{width:scenario.width,height:scenario.height},
    deviceScaleFactor:scenario.deviceScaleFactor,
    isMobile:scenario.isMobile,
    hasTouch:scenario.isMobile,
    reducedMotion:"reduce",
  });
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  try{
    const response=await page.goto(scenario.safe?app+"?safe=1":app,{waitUntil:"domcontentloaded",timeout:25000});
    if(response?.status()!==200)throw new Error("HTTP "+response?.status());
    await page.locator(".tlc-cockpit-arena").waitFor({state:"visible",timeout:15000});
    await page.waitForTimeout(1300);
    const canvases=await page.locator(".tlc-cockpit-field canvas").count();
    if(canvases<2)throw new Error("Missing arena canvases");
    const initial=await page.locator(".tlc-cockpit-field").boundingBox();
    if(!initial||initial.width<100||initial.height<100)throw new Error("Field has unusable dimensions");
    await page.locator(".tlc-cockpit-shortcuts button").first().click();
    await page.locator(".tlc-formation-card").first().waitFor({state:"visible",timeout:5000});
    if(await page.locator(".tlc-formation-card").count()!==8)throw new Error("Formation cards missing");
    await page.locator(".tlc-formation-card").nth(1).click();
    await page.locator(".tlc-arena-surface").nth(1).click();
    await page.locator(".tlc-cockpit-panel-head button").click();
    await page.locator(".tlc-cockpit-play").click();
    await page.waitForTimeout(1600);
    if(scenario.safe){const noGpu=await page.evaluate(()=>{const e=document.querySelector(".tlc-cockpit-field canvas:nth-child(2)");return !e||getComputedStyle(e).display==="none"});if(!noGpu)throw new Error("Safe mode failed to disable WebGL");}
    if(errors.length)throw new Error("Browser JS errors: "+errors.join(" | "));
    console.log("PASS",scenario.name,{canvases,field:initial.width+"x"+initial.height});
  }catch(error){
    failed=true;
    console.error("FAIL",scenario.name,String(error),errors);
    await page.screenshot({path:"/tmp/tlc-smoke-"+scenario.name.replace(/ /g,"-")+".png"}).catch(()=>{});
  }finally{await ctx.close();}
}
// End-to-end cache recovery: must work with no React and no loaded game JS.
{
  const ctx=await browser.newContext({viewport:{width:390,height:840},isMobile:true,hasTouch:true});
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  try{
    await page.goto(new URL("recover.html",app).href,{waitUntil:"domcontentloaded",timeout:25000});
    await page.locator("#repair").waitFor({state:"visible"});
    await page.evaluate(async()=>{const cache=await caches.open("tlc-battle-shell-v2");await cache.put("/old-shell",new Response("obsolete"));});
    await page.locator("#repair").click();
    await page.waitForURL(/\\?safe=1&repair=/,{timeout:12000});
    await page.locator(".tlc-cockpit-arena").waitFor({state:"visible",timeout:18000});
    const remaining=await page.evaluate(async()=> (await caches.keys()).filter(k=>k.startsWith("tlc-battle-")));
    if(remaining.length) throw new Error("Old app caches survived recovery: "+remaining.join(","));
    if(errors.length) throw new Error(errors.join(" | "));
    console.log("PASS zero-dependency recovery clears stale cache and opens safe game");
  }catch(error){
    failed=true;console.error("FAIL recovery page",String(error),errors);
    await page.screenshot({path:"/tmp/tlc-recover-failed.png"}).catch(()=>{});
  }finally{await ctx.close();}
}
await browser.close();
if(failed)process.exit(1);
