async page => {
 const browser=page.context().browser(),engine=browser.browserType().name(),checks={},details={},requests=[],errors=[];
 const context=await browser.newContext({viewport:{width:1440,height:900}}),p=await context.newPage();
 p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8010/?v=10');
 await p.waitForFunction(()=>window.AlgyrScroll?.getInstance(document.querySelector('[data-algyr-scroll]'))?.getState().loadedFrames===120);
 const state=()=>p.evaluate(()=>window.AlgyrScroll.getInstance(document.querySelector('[data-algyr-scroll]')).getState());
 const go=async frame=>{
  const s=await state(),progress=.05+.6*frame/119;
  await p.evaluate(y=>window.scrollTo(0,y),s.start+(s.end-s.start)*progress);
  await p.waitForFunction(frame=>{const i=window.AlgyrScroll.getInstance(document.querySelector('[data-algyr-scroll]'));return i.getState().frame===frame&&!i.trigger.getTween()?.isActive();},frame);
  await p.waitForTimeout(150);
 };
 const canvas=()=>p.locator('[data-algyr-canvas]').evaluate(c=>c.toDataURL());
 for(const frame of [42,50,70,110,119]){
  await go(frame);
  const difference=await p.evaluate(async frame=>{
   const c=document.querySelector('[data-algyr-canvas]'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const img=new Image();img.src='/media/algyr/platform/frames/f_'+String(frame).padStart(3,'0')+'.webp?v=20261012-10';await img.decode();
   const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const x=copy.getContext('2d');x.drawImage(img,0,0);const b=x.getImageData(0,0,c.width,c.height).data;
   let max=0,sum=0;for(let j=0;j<a.length;j++){const d=Math.abs(a[j]-b[j]);max=Math.max(max,d);sum+=d;}return {max,mean:sum/a.length};
  },frame);
  checks['current_frame_'+frame]=difference.mean<.1&&difference.max<=3;details['frame_'+frame]=difference;
  if([42,50,119].includes(frame))await p.screenshot({path:'output/playwright/'+engine+'-media-v9-'+frame+'.png'});
 }
 await go(50);const forward=await canvas();await p.waitForTimeout(600);
 checks.stopped_frame_frozen=forward===await canvas();
 await go(110);await go(50);checks.reverse_identical=forward===await canvas();
 checks.fresh_frame_urls=requests.filter(u=>u.includes('/frames/')).every(u=>u.includes('v=20261012-10'));
 checks.no_native_video=await p.locator('video,audio').count()===0&&!requests.some(u=>u.includes('.mp4'));
 checks.no_horizontal_scroll=await p.evaluate(()=>document.documentElement.scrollWidth===document.documentElement.clientWidth);
 details.state=await state();await context.close();
 const mobileContext=await browser.newContext({viewport:{width:engine==='webkit'?390:412,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),mobile=await mobileContext.newPage(),mobileRequests=[];
 mobile.on('request',r=>mobileRequests.push(r.url()));
 await mobile.goto('http://127.0.0.1:8010/?v=10');await mobile.waitForLoadState('networkidle');
 checks.mobile_light_frames=mobileRequests.some(u=>u.includes('/frames-mobile/'))&&mobileRequests.every(u=>!u.includes('/frames/')&&!u.includes('.mp4'));
 checks.mobile_pin_no_player=await mobile.locator('.pin-spacer').count()===1&&await mobile.locator('video,audio').count()===0;
 checks.mobile_no_overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth===document.documentElement.clientWidth);
 await mobileContext.close();checks.no_js_errors=errors.length===0;
 return {engine,revision:'20261012-10',checks,failures:Object.keys(checks).filter(k=>!checks[k]),details,errors};
}
