async page=>{
 const browser=page.context().browser(),engine=browser.browserType().name();
 const ctx=await browser.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage(),checks={},detail={};
 await p.goto('http://127.0.0.1:8010/');
 await p.waitForFunction(()=>window.AlgyrScroll?.getInstance(document.querySelector('[data-algyr-scroll]'))?.getState().loadedFrames===120);
 const get=()=>p.evaluate(()=>window.AlgyrScroll.getInstance(document.querySelector('[data-algyr-scroll]')).getState());
 const geometry=[];
 for(const f of [.59,.64,.65,.68,.72,.8,.94]){
  const s=await get();await p.evaluate(({s,f})=>window.scrollTo(0,s.start+(s.end-s.start)*f),{s,f});await p.waitForTimeout(950);
  geometry.push(await p.locator('[data-algyr-media]').boundingBox());
 }
 detail.geometry=geometry;
 const first=geometry[0];
 checks.no_handoff_move_or_shrink=geometry.every(r=>['x','y','width','height'].every(k=>Math.abs(r[k]-first[k])<.03));
 checks.caption_below_image=await p.evaluate(()=>{const a=document.querySelector('[data-algyr-details]').getBoundingClientRect(),b=document.querySelector('[data-algyr-media]').getBoundingClientRect();return a.top>=b.bottom+10&&Math.abs(a.left-b.left)<1&&Math.abs(a.width-b.width)<1;});
 await p.screenshot({path:'output/playwright/'+engine+'-stable-handoff.png'});
 // Give the native scroll enough content after the demo to expose wheel events
 // that are lost while a Lenis tween is still running beyond the pin boundary.
 await p.evaluate(()=>{const tail=document.createElement('div');tail.style.height='1800px';document.body.append(tail);window.dispatchEvent(new Event('resize'));});
 await p.waitForTimeout(500);await p.mouse.move(1000,600);
 for(const direction of [1,-1]){
  const s=await get(),start=s.end-160*direction;
  await p.evaluate(y=>window.scrollTo(0,y),start);await p.waitForTimeout(500);
  await p.evaluate(()=>{window.scrollTrace=[];window.traceActive=true;const sample=()=>{if(!window.traceActive)return;window.scrollTrace.push(scrollY);requestAnimationFrame(sample);};sample();});
  for(let i=0;i<12;i++){await p.mouse.wheel(0,100*direction);await p.waitForTimeout(55);}
  await p.waitForTimeout(1100);
  const result=await p.evaluate(()=>{window.traceActive=false;return {y:scrollY,trace:window.scrollTrace};});
  const label=direction===1?'exit_down':'enter_up',expected=start+1200*direction;
  detail[label]={expected,actual:result.y};
  checks[label+'_all_wheel_distance']=Math.abs(result.y-expected)<=3;
  checks[label+'_no_reverse_jump']=result.trace.slice(1).every((v,i)=>(v-result.trace[i])*direction>=-1);
  await p.waitForTimeout(500);
  checks[label+'_settles']=await p.evaluate(()=>scrollY)===result.y;
 }
 // At an unpinned position, the section must follow native page movement.
 const s=await get();await p.evaluate(y=>window.scrollTo(0,y),s.end+300);await p.waitForTimeout(1000);
 const before=await p.locator('[data-algyr-stage]').boundingBox();
 await p.mouse.wheel(0,200);await p.waitForTimeout(400);
 const after=await p.locator('[data-algyr-stage]').boundingBox();
 checks.after_block_native_scroll=Math.abs((before.y-after.y)-200)<2;
 checks.no_horizontal_scroll=await p.evaluate(()=>document.documentElement.scrollWidth===document.documentElement.clientWidth);
 checks.single_pin=await p.locator('.pin-spacer').count()===1;
 await ctx.close();
 return {engine,checks,failures:Object.keys(checks).filter(k=>!checks[k]),detail};
}
