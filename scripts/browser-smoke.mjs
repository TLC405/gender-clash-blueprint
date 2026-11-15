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
    const response=await page.goto(app,{waitUntil:"domcontentloaded",timeout:25000});
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
    if(errors.length)throw new Error("Browser JS errors: "+errors.join(" | "));
    console.log("PASS",scenario.name,{canvases,field:initial.width+"x"+initial.height});
  }catch(error){
    failed=true;
    console.error("FAIL",scenario.name,String(error),errors);
    await page.screenshot({path:"/tmp/tlc-smoke-"+scenario.name.replace(/ /g,"-")+".png"}).catch(()=>{});
  }finally{await ctx.close();}
}
await browser.close();
if(failed)process.exit(1);
