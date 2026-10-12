async page=>{
 const browser=page.context().browser(),engine=browser.browserType().name(),checks={},errors=[],detail={};
 const check=(name,value)=>checks[name]=Boolean(value);
 const context=await browser.newContext({viewport:{width:1440,height:900}}),p=await context.newPage();
 const ready=async()=>{await p.waitForFunction(()=>window.AlgyrScroll?.getInstance(document.querySelector('[data-algyr-scroll]'))?.getState().ready);await p.waitForTimeout(400);};
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8080/standalone/nested/page.html');await ready();
 check('nested_page_ru',await p.locator('[data-algyr-caption="0"] h3').textContent()==='Мои курсы');
 check('no_php_or_cdn',await p.evaluate(()=>[...document.scripts].every(s=>s.src.startsWith(location.origin))&&[...document.querySelectorAll('link[rel="stylesheet"]')].every(s=>s.href.startsWith(location.origin))));
 check('all_images_load',await p.locator('[data-algyr-flat] img').evaluateAll(async images=>{await Promise.all(images.map(i=>i.decode()));return images.every(i=>i.naturalWidth===1280);}));
 await p.evaluate(()=>{
  const holder=document.createElement('div');holder.dataset.algyrEmbed='';holder.dataset.lang='en';holder.dataset.pinTop='0';holder.dataset.scrub='.6';holder.dataset.scrollScreens='3';holder.id='second-holder';
  document.querySelector('#learning').before(holder);
 });
 await p.waitForFunction(()=>document.querySelector('#second-holder [data-algyr-scroll]'));
 await p.locator('#second-holder').scrollIntoViewIfNeeded();
 await p.waitForFunction(()=>window.AlgyrScroll.getInstance(document.querySelector('#second-holder [data-algyr-scroll]'))?.getState().ready);await p.waitForTimeout(400);
 check('dynamic_second_instance_en',await p.locator('#second-holder [data-algyr-caption="0"] h3').textContent()==='My courses');
 check('unique_ids',await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length;}));
 check('options_applied',await p.locator('#second-holder [data-algyr-scroll]').evaluate(r=>{const c=JSON.parse(r.dataset.algyrConfig),s=window.AlgyrScroll.getInstance(r).getState();return c.scrub===.6&&s.pinOffset===0&&Math.abs(s.end-s.start-innerHeight*3)<1;}));
 check('two_pins',await p.locator('.pin-spacer').count()===2);
 await p.evaluate(()=>{window.AlgyrEmbed.init();window.AlgyrEmbed.init();const s=document.createElement('script');s.src='../algyr-block/embed.js?v=10';document.body.append(s);});await p.waitForTimeout(300);
 check('duplicate_loader_safe',await p.locator('.pin-spacer').count()===2&&await p.locator('[data-algyr-scroll]').count()===2);
 await p.locator('#second-holder').evaluate(e=>e.remove());await p.waitForTimeout(300);
 check('removal_cleans_pin',await p.locator('.pin-spacer').count()===1);
 await p.goto('http://127.0.0.1:8080/standalone/full-html-example.html');await ready();
 check('full_html_snippet_works',await p.locator('.pin-spacer').count()===1&&await p.locator('[data-algyr-embed]').count()===0);
 check('root_asset_path_works',await p.evaluate(()=>window.AlgyrScroll.getInstance(document.querySelector('[data-algyr-scroll]')).getState().frameFailures===0));
 await context.close();
 for(const mode of ['reduced','no-js','blocked-template']){
  const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:mode==='reduced'?'reduce':'no-preference',javaScriptEnabled:mode!=='no-js'});
  const q=await c.newPage(),requests=[];q.on('request',r=>requests.push(r.url()));
  if(mode==='blocked-template')await q.route('**/templates/kk.html*',r=>r.abort());
  await q.goto('http://127.0.0.1:8080/standalone/'+(mode==='no-js'?'full-html-example.html':''));await q.waitForTimeout(1000);
  check(mode+'_no_pin',await q.locator('.pin-spacer').count()===0);
  check(mode+'_no_frame_requests',!requests.some(u=>/\/frames(?:-mobile)?\//.test(u)));
  if(mode==='reduced')check('mobile_reduced_last_only',await q.locator('[data-algyr-slide="5"]').isVisible()&&!await q.locator('[data-algyr-slide="0"]').isVisible());
  if(mode==='no-js')check('full_html_no_js_gallery',await q.locator('[data-algyr-gallery]').isVisible()&&await q.locator('[data-algyr-gallery] img').count()===6);
  if(mode==='blocked-template')check('loader_failure_still_shows_image',await q.locator('[data-algyr-error] img').evaluate(i=>i.complete&&i.naturalWidth===1280));
  await c.close();
 }
 if(engine==='chromium'){
  const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}),q=await c.newPage();
  await q.goto('http://127.0.0.1:8080/standalone/');
  await q.waitForFunction(()=>window.AlgyrScroll?.getInstance(document.querySelector('[data-algyr-scroll]'))?.getState().loadedFrames===120);await q.waitForTimeout(400);
  await q.evaluate(()=>{const s=window.AlgyrScroll.getInstance(document.querySelector('[data-algyr-scroll]')).getState();window.scrollTo(0,s.start+(s.end-s.start)*.3);});await q.waitForTimeout(1000);
  const get=()=>q.evaluate(()=>({y:scrollY,...window.AlgyrScroll.getInstance(document.querySelector('[data-algyr-scroll]')).getState()}));
  const start=await get(),cdp=await c.newCDPSession(q);
  for(const direction of [1,-1]){
   const y=direction>0?650:350;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y}]});
   for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:y-i*20*direction}]});await q.waitForTimeout(35);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await q.waitForTimeout(1400);
   detail[direction>0?'touchDown':'touchUp']=await get();
  }
  check('native_touch_moves_forward',detail.touchDown.y>start.y+150&&detail.touchDown.frame>start.frame);
  check('native_touch_moves_back',detail.touchUp.y<detail.touchDown.y-150&&detail.touchUp.frame<detail.touchDown.frame);
  check('native_touch_no_lenis',!detail.touchDown.lenis&&!detail.touchUp.lenis);
  await q.setViewportSize({width:844,height:390});await q.waitForTimeout(700);
  check('orientation_still_single_pin',await q.locator('.pin-spacer').count()===1&&(await get()).mode==='mobile');
  await q.evaluate(()=>{const s=window.AlgyrScroll.getInstance(document.querySelector('[data-algyr-scroll]')).getState();window.scrollTo(0,s.start+(s.end-s.start)*.85);});await q.waitForTimeout(1000);
  check('landscape_caption_fits',await q.locator('[data-algyr-caption="3"]').evaluate(e=>{const r=e.getBoundingClientRect(),m=e.closest('[data-algyr-details]').getBoundingClientRect();return r.bottom<=m.bottom&&r.right<=innerWidth&&r.left>=0;}));
  await q.screenshot({path:'output/playwright/mobile-landscape-screens.png'});
  await c.close();
 }
 check('no_exceptions',errors.length===0);
 return {engine,passed:Object.values(checks).filter(Boolean).length,checks,failures:Object.keys(checks).filter(k=>!checks[k]),errors,detail};
}
