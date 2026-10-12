(async (page)=>{
 const results={},failures=[];const check=(name,value)=>{results[name]=Boolean(value);if(!value)failures.push(name);};
 await page.setViewportSize({width:1440,height:900});await page.goto('http://127.0.0.1:8010/');
 await page.waitForFunction(()=>window.AlgyrScroll?.getInstance(document.querySelector('[data-algyr-scroll]'))?.getState().ready);
 // Public algyr.kz stylesheet inspected for this integration. Override only font/image URLs in test.
 const css=await page.request.get('https://algyr.kz/css/style.css');
 results.publicStylesheetStatus=css.status();
 if(css.ok())await page.addStyleTag({content:(await css.text()).replace(/@font-face\s*\{[^}]*\}/g,'')});
 await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.waitForTimeout(400);
 await page.evaluate(()=>{const r=document.querySelector('[data-algyr-scroll]'),s=window.AlgyrScroll.getInstance(r).getState();window.scrollTo(0,s.start+(s.end-s.start)*.4);});await page.waitForTimeout(1000);
 check('host_styles_pin_unclipped',await page.evaluate(()=>{const r=document.querySelector('[data-algyr-scroll]'),s=window.AlgyrScroll.getInstance(r).getState();return getComputedStyle(r).overflow==='visible'&&Math.abs(r.querySelector('[data-algyr-stage]').getBoundingClientRect().top-s.pinOffset)<2&&document.documentElement.scrollWidth===innerWidth;}));
 await page.screenshot({path:'output/playwright/host-styles.png'});
 await page.evaluate(()=>document.querySelector('.header').style.height='84px');await page.waitForTimeout(600);
 check('header_resize_updates_pin',await page.evaluate(()=>{const r=document.querySelector('[data-algyr-scroll]'),s=window.AlgyrScroll.getInstance(r).getState();return s.pinOffset===84&&Math.abs(r.querySelector('[data-algyr-stage]').getBoundingClientRect().top-84)<2;}));
 await page.evaluate(async()=>{const html=await (await fetch('/')).text();const doc=new DOMParser().parseFromString(html,'text/html');const clone=doc.querySelector('[data-algyr-scroll]');
  const idMap=new Map([clone,...clone.querySelectorAll('[id]')].map(e=>[e.id,'second-'+e.id]));
  for(const el of [clone,...clone.querySelectorAll('*')])for(const a of [...el.attributes]){
   let value=a.value;
   for(const [old,next] of idMap){if((a.name==='id'||a.name==='aria-labelledby')&&value===old)value=next;if(a.name==='href'&&value==='#'+old)value='#'+next;value=value.replaceAll('url(#'+old+')','url(#'+next+')');}
   if(value!==a.value)el.setAttribute(a.name,value);
  }
  document.querySelector('#learning').before(clone);window.AlgyrScroll.mount(clone);
 });
 await page.waitForTimeout(400);
 await page.evaluate(()=>document.querySelector('#second-platform').scrollIntoView());
 await page.waitForFunction(()=>window.AlgyrScroll.getInstance(document.querySelector('#second-platform')).getState().mode==='desktop');
 await page.waitForTimeout(300);
 await page.evaluate(()=>{const s=window.AlgyrScroll.getInstance(document.querySelector('#second-platform')).getState();window.scrollTo(0,s.start+(s.end-s.start)*.45);});
 await page.waitForFunction(()=>{const s=window.AlgyrScroll.getInstance(document.querySelector('#second-platform')).getState();return s.ready&&s.progress>.44;});
 check('two_independent_instances',await page.evaluate(()=>{const a=window.AlgyrScroll.getInstance(document.querySelector('#platform')).getState(),b=window.AlgyrScroll.getInstance(document.querySelector('#second-platform')).getState();return a.progress>.99&&b.progress>.44&&b.progress<.46&&a.scene!==b.scene;}));
 await page.evaluate(()=>document.querySelector('#second-platform').remove());await page.waitForTimeout(200);check('removed_instance_releases_pin',await page.locator('.pin-spacer').count()===1);
 await page.evaluate(()=>{const r=document.querySelector('#platform');window.AlgyrScroll.initAll();window.AlgyrScroll.initAll();});
 check('init_idempotent',await page.locator('.pin-spacer').count()===1);
 await page.evaluate(()=>window.AlgyrScroll.destroy(document.querySelector('#platform')));
 check('destroy_restores_native_gallery',await page.locator('.pin-spacer').count()===0&&await page.locator('.algyr-scroll-gallery').isVisible());
 await page.evaluate(()=>{window.testLenis={on(){},off(){},raf(){},resize(){},scrollTo(top){window.scrollTo(0,top)},destroy(){window.testLenisDestroyed=true}};window.AlgyrScroll.mount(document.querySelector('#platform'),{lenis:window.testLenis});});
 await page.locator('#platform').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>window.AlgyrScroll.getInstance(document.querySelector('#platform')).getState().mode==='desktop');
 check('reuse_host_lenis',await page.evaluate(()=>{const s=window.AlgyrScroll.getInstance(document.querySelector('#platform')).getState();return s.lenis&&!s.ownedLenis;}));
 await page.evaluate(()=>window.AlgyrScroll.destroy(document.querySelector('#platform')));
 check('host_lenis_not_destroyed',await page.evaluate(()=>!window.testLenisDestroyed));
 return {results,failures};
})
