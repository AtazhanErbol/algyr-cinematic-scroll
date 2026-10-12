async (page) => {
 const browser=page.context().browser(),engine=browser.browserType().name();
 const checks={},details={},errors=[],failures=[];
 const check=(name,value)=>{checks[name]=Boolean(value);if(!value)failures.push(name);};
 const get=p=>p.evaluate(()=>window.AlgyrScroll.getInstance(document.querySelector('[data-algyr-scroll]')).getState());
 const ready=async p=>{await p.waitForFunction(()=>window.AlgyrScroll?.getInstance(document.querySelector('[data-algyr-scroll]'))?.getState().ready);await p.waitForTimeout(400);};
 const go=async(p,f)=>{
  const s=await get(p);
  await p.evaluate(({s,f})=>window.scrollTo({top:s.start+(s.end-s.start)*f,behavior:'instant'}),{s,f});
  await p.waitForFunction(f=>Math.abs(window.AlgyrScroll.getInstance(document.querySelector('[data-algyr-scroll]')).getState().progress-f)<.0006,f);
  await p.waitForFunction(()=>{const t=window.AlgyrScroll.getInstance(document.querySelector('[data-algyr-scroll]')).trigger;return !t.getTween()?.isActive()&&Math.abs(t.animation.progress()-t.progress)<.000001;});
  await p.waitForTimeout(120);
 };
 const canvas=p=>p.locator('[data-algyr-canvas]').evaluate(c=>c.toDataURL());
 const profiles=engine==='webkit'
 ? [{name:'safari-desktop',w:1440,h:900},{name:'iphone',w:390,h:844,touch:true},{name:'iphone-small',w:375,h:667,touch:true},{name:'iphone-landscape',w:844,h:390,touch:true}]
 : [{name:'desktop',w:1440,h:900},{name:'desktop-large',w:1920,h:1080},{name:'laptop',w:1366,h:768},{name:'tablet',w:768,h:1024},{name:'android',w:412,h:915,touch:true},{name:'mobile-small',w:320,h:568,touch:true},{name:'android-landscape',w:915,h:412,touch:true},{name:'tablet-touch',w:1024,h:768,touch:true}];
 for(const profile of profiles) {
  const ctx=await browser.newContext({viewport:{width:profile.w,height:profile.h},deviceScaleFactor:profile.touch?2:1,isMobile:!!profile.touch,hasTouch:!!profile.touch});
  const p=await ctx.newPage(),requests=[];
  p.on('pageerror',e=>errors.push(profile.name+': '+e.message));
  p.on('request',r=>requests.push(r.url()));
  await p.goto('http://127.0.0.1:8080/standalone/');
  await p.waitForFunction(()=>window.AlgyrScroll?.getInstance(document.querySelector('[data-algyr-scroll]')));
  await p.evaluate(()=>document.fonts.ready);
  {
   await ready(p);await go(p,.30);
   const s=await get(p);
   const rects=await p.evaluate(()=>{
    const r=document.querySelector('[data-algyr-scroll]'),stage=r.querySelector('[data-algyr-stage]').getBoundingClientRect(),m=r.querySelector('[data-algyr-media]').getBoundingClientRect(),actions=r.querySelector('.algyr-scroll-actions').getBoundingClientRect();
    return {top:stage.top,bottom:stage.bottom,actionsBottom:actions.bottom,ratio:m.width/m.height,horizontal:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   details[profile.name]={...s,...rects};
   check(profile.name+'_pin_distance',Math.abs(s.end-s.start-profile.h*(profile.touch?3.5:4))<1);
   check(profile.name+'_header_clear',Math.abs(rects.top-s.pinOffset)<1);
   check(profile.name+'_stage_fits',rects.bottom<=profile.h+1&&rects.actionsBottom<=profile.h+1);
   check(profile.name+'_frame_scrub',s.frame===50&&s.desiredFrame===50);
   check(profile.name+'_no_overflow',rects.horizontal<=0);
   check(profile.name+'_equal_ratio',Math.abs(rects.ratio-16/9)<.005);
   check(profile.name+'_captions_hidden_during_camera',await p.locator('[data-algyr-details]').evaluate(e=>e.inert&&getComputedStyle(e).opacity==='0'));
   check(profile.name+'_scroll_owner',profile.touch?!s.lenis:s.lenis&&s.ownedLenis);
   check(profile.name+'_no_native_player',s.nativePlayerElements===0&&!requests.some(url=>url.includes('.mp4')));
   check(profile.name+'_single_pin',await p.locator('.pin-spacer').count()===1);
   await p.screenshot({path:'output/playwright/'+profile.name+'-video-verified.png'});
   if(['desktop','safari-desktop','iphone','android','mobile-small'].includes(profile.name)){
    await p.waitForFunction(()=>window.AlgyrScroll.getInstance(document.querySelector('[data-algyr-scroll]')).getState().loadedFrames===120);
    const loaded=await get(p);
    const priority=requests.filter(u=>u.includes('/frames/')||u.includes('/frames-mobile/')).slice(0,6).map(u=>new URL(u).pathname.split('/').pop());
    details[profile.name].priority=priority;
    check(profile.name+'_progressive_prefetch',priority[0]==='f_000.webp'&&priority.slice(1,5).includes('f_119.webp')&&priority.slice(1,5).includes('f_010.webp'));
    check(profile.name+'_frame_budget',loaded.sequenceBytes<=(profile.touch?3000000:6000000)&&loaded.loadedFrames===120&&loaded.decodedFrames<=(profile.touch?6:10)&&loaded.frameFailures===0);
    await go(p,.30);const forward=await canvas(p);
    await p.waitForTimeout(600);check(profile.name+'_idle_canvas_frozen',forward===await canvas(p));
    await go(p,.55);check(profile.name+'_forward_video_changes',forward!==await canvas(p));
    await go(p,.30);check(profile.name+'_reverse_exact_video_frame',forward===await canvas(p));
    await go(p,.01);check(profile.name+'_opening_dead_zone',(await get(p)).frame===0);
    await go(p,.65);
    const endDiff=await p.evaluate(async()=>{
     const c=document.querySelector('[data-algyr-canvas]'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
     const img=document.querySelector('[data-algyr-flat] img'),b=document.createElement('canvas');b.width=c.width;b.height=c.height;
     const x=b.getContext('2d');await img.decode();x.drawImage(img,0,0,b.width,b.height);const pixels=x.getImageData(0,0,b.width,b.height).data;
     let max=0,sum=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-pixels[i]);max=Math.max(max,d);sum+=d;}return {max,mean:sum/a.length};
    });
    details[profile.name].crossfadePixelDifference=endDiff;
    check(profile.name+'_exact_endframe_handoff',endDiff.max<=3&&endDiff.mean<.1&&(await get(p)).frame===119);
    await go(p,.724);
    check(profile.name+'_courses_first',(await get(p)).scene==='courses');
    check(profile.name+'_captions_now_visible',await p.locator('[data-algyr-details]').evaluate(e=>!e.inert&&Number(getComputedStyle(e).opacity)===1));
    const size=await p.locator('[data-algyr-media]').boundingBox();
    await go(p,.739);
    const mask=await p.locator('[data-algyr-shot="1"]').evaluate(el=>({mask:getComputedStyle(el).maskImage,position:getComputedStyle(el).maskPosition,prefixed:getComputedStyle(el).webkitMaskImage}));
    check(profile.name+'_soft_mask',mask.mask.includes('linear-gradient')&&mask.position!=='0% 0%'&&mask.position!=='100% 0%'&&mask.prefixed.includes('linear-gradient'));
    const moving=await p.locator('[data-algyr-media]').screenshot();
    await p.waitForTimeout(500);check(profile.name+'_idle_mask_frozen',moving.equals(await p.locator('[data-algyr-media]').screenshot()));
    await go(p,.99);check(profile.name+'_last_profile',(await get(p)).scene==='profile');
    const finalSize=await p.locator('[data-algyr-media]').boundingBox();
    check(profile.name+'_no_screenshot_zoom',Math.abs(size.width-finalSize.width)<.01&&Math.abs(size.height-finalSize.height)<.01);
    check(profile.name+'_ending_dead_zone',(await get(p)).frame===119);
    await go(p,.739);
    const reversed=await p.locator('[data-algyr-media]').screenshot();
    const diff=await p.evaluate(async({a,b})=>{
     const read=async src=>{const img=new Image();img.src='data:image/png;base64,'+src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,c.width,c.height).data;};
     const aa=await read(a),bb=await read(b);let max=0,sum=0;if(aa.length!==bb.length)return {max:255,mean:255};
     for(let i=0;i<aa.length;i++){const d=Math.abs(aa[i]-bb[i]);max=Math.max(max,d);sum+=d;}return {max,mean:sum/aa.length};
    },{a:moving.toString('base64'),b:reversed.toString('base64')});
    details[profile.name].reverseMaskDifference=diff;
    check(profile.name+'_reverse_mask_pixels',diff.max<=5&&diff.mean<.05);
    await go(p,.8);await p.screenshot({path:'output/playwright/'+profile.name+'-screens-verified.png'});
    await p.locator('[data-algyr-step="2"]').click();await p.waitForTimeout(1200);
    check(profile.name+'_step_navigation',(await get(p)).scene==='lesson');
    await p.locator('[data-algyr-skip]').click();
    check(profile.name+'_skip_exits',await p.evaluate(()=>document.activeElement?.id==='platform-after'&&document.querySelector('#platform-after').getBoundingClientRect().top<innerHeight));
    await go(p,.45);
    await p.setViewportSize({width:390,height:844});await ready(p);await p.waitForTimeout(400);
    check(profile.name+'_resize_mobile_one_pin',(await get(p)).mode==='mobile'&&await p.locator('.pin-spacer').count()===1&&(await get(p)).variant==='mobile');
    await p.setViewportSize({width:1440,height:900});await ready(p);await p.waitForTimeout(300);
    check(profile.name+'_resize_restores_one_pin',await p.locator('.pin-spacer').count()===1);
    await go(p,.30);
    await p.addStyleTag({content:'[data-algyr-scroll]{width:calc(100% - .4px)!important}'});
    await p.evaluate(()=>window.dispatchEvent(new Event('resize')));await p.waitForTimeout(400);
    check(profile.name+'_fractional_width',await p.evaluate(()=>{const r=document.querySelector('[data-algyr-scroll]');return document.documentElement.scrollWidth<=document.documentElement.clientWidth&&r.querySelector('.pin-spacer').getBoundingClientRect().width<=r.getBoundingClientRect().width+.02;}));
    await p.locator('[data-algyr-static]').click();
    check(profile.name+'_manual_static',(await get(p)).mode==='static'&&await p.locator('.pin-spacer').count()===0);
    await p.locator('[data-algyr-static]').click();await ready(p);
    check(profile.name+'_manual_animation_restore',await p.locator('.pin-spacer').count()===1);
    check(profile.name+'_no_cta',await p.locator('[data-algyr-cta]').count()===0);
   }
  }
  await ctx.close();
 }
 for(const type of ['reduced','no-js','failed-first-frame','failed-screenshot','rapid-resize']){
  const ctx=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:type==='reduced'?'reduce':'no-preference',javaScriptEnabled:type!=='no-js'});
  const p=await ctx.newPage(),requests=[];
  p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>errors.push(type+': '+e.message));
  if(type==='failed-first-frame')await p.route('**/frames/f_000.webp*',r=>r.abort());
  if(type==='failed-screenshot')await p.route('**/platform/shot-2.webp*',r=>r.abort());
  if(type==='rapid-resize')await p.route('**/frames/f_000.webp*',async r=>{await new Promise(resolve=>setTimeout(resolve,500));await r.continue().catch(()=>{});});
  await p.goto(type==='no-js'?'http://127.0.0.1:8080/standalone/full-html-example.html':'http://127.0.0.1:8080/standalone/');
  if(type==='rapid-resize'){
   await p.waitForFunction(()=>window.AlgyrScroll?.getInstance(document.querySelector('[data-algyr-scroll]')));
   await p.setViewportSize({width:390,height:844});await p.waitForTimeout(50);
   await p.setViewportSize({width:1440,height:900});await ready(p);
   check(type+'_recovers',await p.locator('.pin-spacer').count()===1&&(await get(p)).frameFailures===0);
  }else{
   await p.waitForTimeout(800);
   check(type+'_no_pin',await p.locator('.pin-spacer').count()===0);
   check(type+'_usable_gallery',await p.locator('.algyr-scroll-gallery').isVisible());
   if(type==='reduced'){
    check(type+'_last_only',await p.locator('[data-algyr-slide="5"]').isVisible()&&!(await p.locator('[data-algyr-slide="0"]').isVisible()));
    check(type+'_no_lenis',!(await get(p)).lenis);
    check(type+'_no_heavy_frames',!requests.some(url=>url.includes('/frames/')||url.includes('/frames-mobile/')));
   }
  }
  await ctx.close();
 }
 const other=await browser.newContext(),p=await other.newPage(),requests=[];
 p.on('request',r=>requests.push(r.url()));await p.goto('http://127.0.0.1:8010/up');
 check('unrelated_page_unchanged',!requests.some(url=>url.includes('algyr-scroll')||url.includes('/frames/'))&&await p.locator('[data-algyr-scroll]').count()===0);
 await other.close();
 check('no_browser_exceptions',errors.length===0);
 return {engine,passed:Object.values(checks).filter(Boolean).length,checks,failures,errors,details};
}
