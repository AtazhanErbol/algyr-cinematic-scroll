/* A framework-free loader: upload algyr-block/ and paste the two-line snippet. */
(() => {
 const ownScript=document.currentScript;
 if(window.AlgyrEmbed){window.AlgyrEmbed.init();return;}
 const base=new URL('./',ownScript.src),revision='20261012-9';
 const pending=new WeakSet(),templates=new Map();let assets,serial=0;
 const url=value=>new URL(value,base).href.replaceAll('%7Bindex%7D','{index}');
 const loadAssets=()=>assets??=new Promise((resolve,reject)=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href=url('algyr-scroll.css?v='+revision);
  const styleReady=new Promise((done,fail)=>{css.onload=done;css.onerror=fail;});document.head.append(css);
  const scriptReady=new Promise((done,fail)=>{
   if(window.AlgyrScroll){done();return;}
   const script=document.createElement('script');script.src=url('algyr-scroll.js?v='+revision);script.onload=done;script.onerror=fail;document.head.append(script);
  });
  Promise.all([styleReady,scriptReady]).then(resolve,reject);
 });
 async function mount(holder){
  if(pending.has(holder)||holder.dataset.algyrMounted==='true')return;
  pending.add(holder);holder.setAttribute('aria-busy','true');
  try{
   const requested=(holder.dataset.lang||document.documentElement.lang||'kk').toLowerCase().split('-')[0];
   const locale=requested==='kz'?'kk':['kk','ru','en'].includes(requested)?requested:'kk';
   if(!templates.has(locale))templates.set(locale,fetch(url('templates/'+locale+'.html?v='+revision)).then(r=>{
    if(!r.ok)throw new Error('ALGYR template unavailable');return r.text();
   }));
   const [markup]=await Promise.all([templates.get(locale),loadAssets()]);
   if(!holder.isConnected)return;
   const fragment=document.createElement('template');fragment.innerHTML=markup.trim();
   const root=fragment.content.querySelector('[data-algyr-scroll]');
   const oldId=root.id;
   const id=(!document.getElementById('platform')&&serial===0)?'platform':'algyr-platform-'+(++serial);
   serial++;
   for(const el of [root,...root.querySelectorAll('*')]){
    if(el.id)el.id=el.id.replace(oldId,id);
    for(const attr of ['aria-labelledby','href']){
     const value=el.getAttribute(attr);if(value?.includes(oldId))el.setAttribute(attr,value.replace(oldId,id));
    }
    for(const attr of ['src','href']){
     const value=el.getAttribute(attr);if(value?.startsWith('media/'))el.setAttribute(attr,url(value));
    }
   }
   const config=JSON.parse(root.dataset.algyrConfig);
   for(const key of ['sequence','mobileSequence'])if(config[key])config[key].template=url(config[key].template);
   config.screens.forEach(screen=>{screen.src=url(screen.src);if(screen.mobileSrc)screen.mobileSrc=url(screen.mobileSrc);});
   const options={scrollScreens:'scrollScreens',mobileScrollScreens:'mobileScrollScreens',scrub:'scrub',maskEdge:'maskEdge'};
   for(const [attribute,key] of Object.entries(options)){
    const value=holder.dataset[attribute];if(value!==undefined&&Number.isFinite(Number(value)))config[key]=Number(value);
   }
   if(holder.dataset.headerSelector!==undefined)config.headerSelector=holder.dataset.headerSelector;
   if(holder.dataset.pinTop!==undefined)config.pinTop=holder.dataset.pinTop==='auto'?'auto':Number(holder.dataset.pinTop)||0;
   if(holder.dataset.lenis!==undefined)config.lenis=holder.dataset.lenis!=='false';
   root.dataset.algyrConfig=JSON.stringify(config);root.lang=locale;
   root.style.setProperty('--algyr-scroll-brand-bg','url("'+url('media/brand/platform-bg.png')+'")');
   holder.replaceChildren(fragment.content);holder.dataset.algyrMounted='true';
   window.AlgyrScroll.initAll(holder,window.algyrScrollDependencies);
   holder.dispatchEvent(new CustomEvent('algyr:ready',{bubbles:true}));
  }catch(error){
   // Always leave usable content if the script/template cannot be loaded.
   const image=document.createElement('img');image.src=url('media/platform/shot-1.webp');image.alt='ALGYR — курстар / курсы';
   image.width=1280;image.height=720;image.style.cssText='display:block;width:100%;height:auto';holder.replaceChildren(image);
   holder.dataset.algyrError='true';console.warn('ALGYR block could not load its local files.',error);
  }finally{holder.removeAttribute('aria-busy');pending.delete(holder);}
 }
 function init(scope=document){
  if(scope.matches?.('[data-algyr-embed]'))mount(scope);
  scope.querySelectorAll?.('[data-algyr-embed]').forEach(mount);
 }
 window.AlgyrEmbed=Object.freeze({init});
 const start=()=>{
  init();
  new MutationObserver(records=>{
   for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)init(node);
  }).observe(document.documentElement,{childList:true,subtree:true});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 document.addEventListener('algyr:init',()=>init());
})();
