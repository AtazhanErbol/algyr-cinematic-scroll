import { gsap as bundledGsap } from 'gsap';
import { ScrollTrigger as bundledScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { FrameSequence } from './frame-sequence';

const instances=new WeakMap(), roots=new Set(), smoothRoots=new Set();
let removalObserver,smoothing;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function acquireSmoothing(root,config,gsap,ScrollTrigger,supplied){
 if(!config.lenis)return;
 smoothRoots.add(root);if(smoothing)return;
 const candidate=supplied||window.lenis;
 const external=candidate&&['on','off','raf','resize','scrollTo'].every(k=>typeof candidate[k]==='function')?candidate:null;
 const owned=!external;
 const lenis=external||new Lenis({
  autoRaf:false,smoothWheel:true,syncTouch:false,anchors:false,lerp:clamp(Number(config.lenisLerp)||.12,.05,.25),
  virtualScroll:({event,deltaY})=>{
   const blocked=event.ctrlKey||event.metaKey||event.target?.closest?.('dialog,[role="dialog"],[data-lenis-prevent],textarea,select,[contenteditable="true"]');
   if(blocked){if(lenis.isScrolling==='smooth')lenis.reset();return false;}
   // Finish the current wheel gesture across the pin boundary. Switching to native
   // events mid-tween would either fight the browser or discard pending distance.
   return lenis.isScrolling==='smooth'||[...smoothRoots].some(r=>{
    const trigger=instances.get(r)?.trigger;if(!trigger)return false;
    // Start an incoming gesture before it crosses the pin, so native browser
    // inertia cannot overlap Lenis on the first frame inside the scene.
    return trigger.isActive||(deltaY>0&&scrollY<trigger.start&&scrollY>=trigger.start-innerHeight)
     ||(deltaY<0&&scrollY>trigger.end&&scrollY<=trigger.end+innerHeight);
   });
  },
 });
 const update=()=>ScrollTrigger.update(),tick=time=>lenis.raf(time*1000);
 lenis.on('scroll',update);if(owned)gsap.ticker.add(tick);
 smoothing={lenis,owned,gsap,tick,update};
}
function releaseSmoothing(root){
 smoothRoots.delete(root);if(smoothRoots.size||!smoothing)return;
 const {lenis,owned,gsap,tick,update}=smoothing;lenis.off('scroll',update);
 if(owned){gsap.ticker.remove(tick);lenis.destroy();}smoothing=null;
}
function scrollToY(top){if(smoothing)smoothing.lenis.scrollTo(top,{immediate:true,force:true});else window.scrollTo({top,behavior:'instant'});}

export function mount(root,dependencies={}){
 if(instances.has(root))return instances.get(root);
 let config;try{config=JSON.parse(root.dataset.algyrConfig);}catch{return null;}
 if(!config.screens?.length||!config.sequence?.count)return null;
 const gsap=dependencies.gsap||bundledGsap,ScrollTrigger=dependencies.ScrollTrigger||bundledScrollTrigger;
 gsap.registerPlugin(ScrollTrigger);
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)];
 const stage=$('[data-algyr-stage]'),visual=$('[data-algyr-visual]'),canvas=$('[data-algyr-canvas]');
 const flat=$('[data-algyr-flat]'),shots=[...flat.children],details=$('[data-algyr-details]');
 const captions=all('[data-algyr-caption]'),dots=all('[data-algyr-step]');
 const gallery=$('[data-algyr-gallery]'),slides=all('[data-algyr-slide]');
 const header=config.headerSelector?document.querySelector(config.headerSelector):null;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),events=new AbortController();
 const phases=config.phases;
 if(!phases||!(0<=phases.videoStart&&phases.videoStart<phases.videoEnd&&phases.videoEnd<phases.screensStart&&phases.screensStart<phases.screensEnd&&phases.screensEnd<=1))return null;
 let context,timeline,trigger,nearObserver,resizeObserver,preloadPromise;
 let ready=false,dead=false,failed=false,near=false,mode='',active=-2,raf=0,refreshTimer=0,pinOffset=0,steps=[];
 const driver={frame:0,hold:0};
 const compact=()=>innerWidth<=Number(config.mobileBreakpoint)||matchMedia('(pointer: coarse)').matches;
 const animated=()=>mode==='desktop'||mode==='mobile';
 const eligible=()=>!reduce.matches;
 let sequence,variant;
 function selectSequence(){
  const next=compact()&&config.mobileSequence?'mobile':'desktop';
  if(next===variant)return;
  if(sequence){clearDesktop();sequence.destroy();}
  variant=next;ready=false;failed=false;preloadPromise=null;delete root.dataset.loadError;
  const source=variant==='mobile'?config.mobileSequence:config.sequence;
  canvas.width=source.width;canvas.height=source.height;
  const current=new FrameSequence(canvas,source,()=>{
   if(dead||current!==sequence)return;
   failed=true;ready=false;root.dataset.loadError='true';selectMode();
  });
  sequence=current;
  config.screens.forEach((screen,i)=>{
   const src=variant==='mobile'?(screen.mobileSrc||screen.src):screen.src;
   shots[i].querySelector('img').src=src;slides[i].querySelector('img').src=src;slides[i].querySelector('a').href=src;
  });
 }
 const measure=()=>{
  root.style.setProperty('--algyr-scroll-width',root.getBoundingClientRect().width+'px');
  const fixed=header&&['fixed','sticky'].includes(getComputedStyle(header).position);
  pinOffset=config.pinTop==='auto'?(fixed?Math.ceil(header.getBoundingClientRect().height):0):Number(config.pinTop)||0;
  root.style.setProperty('--algyr-scroll-pin-top',pinOffset+'px');
  if(animated()){
   const heading=$('.algyr-scroll-heading');
   const css=getComputedStyle(stage),headCss=getComputedStyle(heading);
   const available=stage.getBoundingClientRect().height-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)
    -heading.getBoundingClientRect().height-parseFloat(headCss.marginBottom)
    -details.getBoundingClientRect().height-14;
   const landscape=innerHeight<520&&innerWidth>innerHeight;
   const room=landscape?stage.getBoundingClientRect().height-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)
    -heading.getBoundingClientRect().height-parseFloat(headCss.marginBottom):available;
   root.style.setProperty('--algyr-scroll-media-width',Math.max(64,room)*16/9+'px');
  }
 };
 function updateStep(index){
  if(index===active)return;active=index;
  dots.forEach((d,i)=>{if(i===index)d.setAttribute('aria-current','step');else d.removeAttribute('aria-current');});
  captions.forEach((c,i)=>c.setAttribute('aria-hidden',String(i!==index)));
 }
 const onUpdate=()=>{
  const time=timeline?.time()||0;let index=-1;
  steps.forEach((at,i)=>{if(time>=at)index=i;});updateStep(index);
  details.inert=time<phases.videoEnd;
  details.setAttribute('aria-hidden',String(time<phases.videoEnd));
  sequence.request(driver.frame);
  shots.forEach((shot,i)=>{const at=steps[i];shot.style.willChange=i>0&&Math.abs(time-at)<.03?'mask-position':'';});
 };
 function buildDesktop(){
  root.dataset.animated='true';measure();
  gallery.setAttribute('aria-hidden','true');gallery.inert=true;sequence.start();
  driver.frame=0;
  context=gsap.context(()=>{
   gsap.set(flat,{autoAlpha:0});gsap.set(details,{autoAlpha:0});
   gsap.set(captions,{autoAlpha:0,y:8});gsap.set(captions[0],{autoAlpha:1,y:0});
   const edge=clamp(Number(config.maskEdge)||.2,.15,.25);
   root.style.setProperty('--algyr-mask-start',100/(2+edge)+'%');
   root.style.setProperty('--algyr-mask-end',(1+edge)*100/(2+edge)+'%');
   shots.slice(1).forEach(shot=>gsap.set(shot,{visibility:'visible',maskSize:(2+edge)*100+'% 100%',webkitMaskSize:(2+edge)*100+'% 100%',maskPosition:'0% 0%',webkitMaskPosition:'0% 0%'}));
   timeline=gsap.timeline({defaults:{ease:'none'},onUpdate,scrollTrigger:{
    id:root.id,trigger:root,pin:stage,pinSpacing:true,start:()=>'top top+='+pinOffset,
    end:()=>'+='+Math.round((mode==='mobile'?stage.getBoundingClientRect().height+pinOffset:innerHeight)
     *clamp(Number(mode==='mobile'?config.mobileScrollScreens:config.scrollScreens)||4,2.5,4.5)),
    scrub:clamp(Number(config.scrub)||.75,.5,1),invalidateOnRefresh:true,
    onRefreshInit:measure,onRefresh:()=>{measure();smoothing?.lenis.resize();onUpdate();},
    onToggle:self=>{root.dataset.pinned=String(self.isActive);},
   }});
   trigger=timeline.scrollTrigger;api.trigger=trigger;
   timeline.fromTo(driver,{frame:0},{frame:sequence.config.count-1,duration:phases.videoEnd-phases.videoStart,immediateRender:true},phases.videoStart);
   const fade=phases.screensStart-phases.videoEnd;
   timeline.to(flat,{autoAlpha:1,duration:fade},phases.videoEnd);
   timeline.to(details,{autoAlpha:1,duration:fade},phases.videoEnd);
   steps=[phases.videoEnd+fade/2];
   const span=(phases.screensEnd-phases.screensStart)/Math.max(1,shots.length-1),duration=span*.58;
   shots.slice(1).forEach((shot,offset)=>{
    const i=offset+1,old=shots[i-1],at=phases.screensStart+offset*span+span*.18;
    timeline.to(shot,{maskPosition:'100% 0%',webkitMaskPosition:'100% 0%',duration},at)
     .fromTo(shot.querySelector('.algyr-scroll-shot-content'),{xPercent:2.5},{xPercent:0,duration,immediateRender:true},at)
     .to(old.querySelector('.algyr-scroll-shot-content'),{xPercent:-2.5,duration},at)
     .to(old.querySelector('.algyr-scroll-shot-shade'),{opacity:.10,duration},at)
     .to(captions[i-1],{autoAlpha:0,y:-8,duration:duration*.35},at)
     .to(captions[i],{autoAlpha:1,y:0,duration:duration*.35},at+duration*.5);
    steps.push(at+duration/2);
   });
   timeline.to(driver,{hold:1,duration:1-phases.screensEnd},phases.screensEnd);
   timeline.to($('[data-algyr-progress]'),{scaleX:1,duration:phases.screensEnd-phases.videoEnd},phases.videoEnd);
   onUpdate();
  },root);
  if(mode==='desktop')acquireSmoothing(root,config,gsap,ScrollTrigger,dependencies.lenis);
  queueRefresh();
 }
 function clearDesktop(){
  releaseSmoothing(root);context?.revert();context=null;timeline=null;trigger=null;api.trigger=null;
  delete root.dataset.animated;
  root.dataset.pinned='false';gallery.inert=false;gallery.removeAttribute('aria-hidden');
  details.inert=false;details.removeAttribute('aria-hidden');
  shots.forEach(s=>s.style.willChange='');active=-2;
 }
 function selectMode(){
  if(dead)return;
  selectSequence();
  const next=reduce.matches?'static':failed||!sequence.context?'gallery':ready?(compact()?'mobile':'desktop'):'loading';
  if(next===mode)return;
  clearDesktop();mode=next;root.dataset.mode=next;
  if(animated())buildDesktop();
  else {if(next!=='loading')sequence.stop();updateStep(next==='static'?slides.length-1:0);}
  measure();queueRefresh();
 }
 function queueRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(!dead){measure();ScrollTrigger.refresh();}},120);}
 async function preload(){
  if(dead||!near||!eligible()||failed||!sequence.context)return;
  if(preloadPromise)return preloadPromise;
  const loadImage=src=>new Promise((resolve,reject)=>{
   const image=new Image(),timer=setTimeout(()=>reject(new Error('Image timeout')),12000);
   image.onload=async()=>{clearTimeout(timer);try{await image.decode();}catch{}resolve();};
   image.onerror=()=>{clearTimeout(timer);reject(new Error('Image unavailable'));};image.src=src;
  });
  const current=sequence;
  const pending=Promise.all([current.start(),...config.screens.map(s=>loadImage(variant==='mobile'?(s.mobileSrc||s.src):s.src))]).then(()=>{
   if(dead||!eligible()||current!==sequence)return;
   ready=current.blobs.has(0)&&!failed;selectMode();queueRefresh();
  }).catch(()=>{if(!dead&&current===sequence&&eligible()){failed=true;root.dataset.loadError='true';selectMode();}}).finally(()=>{
   if(preloadPromise!==pending)return;
   preloadPromise=null;
   // A resize can cancel decoding while the screenshot preload is still pending.
   if(!dead&&near&&eligible()&&!ready&&!failed)queueMicrotask(preload);
  });
  preloadPromise=pending;
  return preloadPromise;
 }
 function navigate(index){
  if(animated()&&trigger){
   const next=steps[index+1]??phases.screensEnd;
   const fraction=(steps[index]+next)/2;
   scrollToY(trigger.start+(trigger.end-trigger.start)*fraction);
  }else if(mode!=='static')gallery.scrollTo({left:slides[index].offsetLeft-slides[0].offsetLeft,behavior:'instant'});
 }
 dots.forEach((d,i)=>d.addEventListener('click',()=>navigate(i),{signal:events.signal}));
 gallery.addEventListener('scroll',()=>{
  if(animated()||mode==='static'||raf)return;
  raf=requestAnimationFrame(()=>{raf=0;updateStep(clamp(Math.round(gallery.scrollLeft/(gallery.clientWidth+20)),0,slides.length-1));});
 },{passive:true,signal:events.signal});
 gallery.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||mode==='static')return;
  event.preventDefault();navigate(event.key==='Home'?0:event.key==='End'?slides.length-1:clamp(active+(event.key==='ArrowRight'?1:-1),0,slides.length-1));
 },{signal:events.signal});
 window.addEventListener('resize',()=>{selectMode();preload();queueRefresh();},{passive:true,signal:events.signal});
 reduce.addEventListener('change',()=>{selectMode();preload();},{signal:events.signal});
 all('img').forEach(img=>img.addEventListener('load',queueRefresh,{signal:events.signal}));
 const api={
  trigger:null,
  getState:()=>({mode,ready,variant,progress:timeline?.progress()||0,scene:config.screens[active]?.key||'student',
   start:trigger?.start||0,end:trigger?.end||0,pinOffset,steps,phases,currentStep:active,...sequence.state(),
   nativePlayerElements:root.querySelectorAll('video,audio').length,lenis:Boolean(smoothing),ownedLenis:Boolean(smoothing?.owned)}),
  destroy(){
   if(dead)return;dead=true;clearTimeout(refreshTimer);cancelAnimationFrame(raf);events.abort();
   nearObserver?.disconnect();resizeObserver?.disconnect();clearDesktop();sequence.destroy();
   delete root.dataset.mode;delete root.dataset.pinned;
   root.style.removeProperty('--algyr-scroll-width');instances.delete(root);roots.delete(root);
   if(!roots.size){removalObserver?.disconnect();removalObserver=null;}ScrollTrigger.refresh();
  },
 };
 instances.set(root,api);roots.add(root);measure();selectMode();
 resizeObserver=new ResizeObserver(queueRefresh);resizeObserver.observe(root);if(header)resizeObserver.observe(header);
 nearObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){near=true;nearObserver.disconnect();preload();}},{rootMargin:'800px'});
 nearObserver.observe(root);
 if(!removalObserver){removalObserver=new MutationObserver(()=>{for(const r of roots)if(!r.isConnected)instances.get(r)?.destroy();});removalObserver.observe(document.documentElement,{childList:true,subtree:true});}
 document.fonts?.ready.then(()=>{if(!dead)queueRefresh();});
 return api;
}
export function initAll(scope=document,dependencies={}){
 return [...(scope.matches?.('[data-algyr-scroll]')?[scope]:[]),...scope.querySelectorAll('[data-algyr-scroll]')].map(root=>mount(root,dependencies));
}
export function getInstance(root){return instances.get(root);}
export function destroy(root){instances.get(root)?.destroy();}
