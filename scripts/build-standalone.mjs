// Run after npm run build, export-standalone.php, and export-preview.mjs.
import {mkdir,copyFile,cp,readFile,writeFile} from 'node:fs/promises';
const directory=new URL('../standalone/',import.meta.url),block=new URL('algyr-block/',directory);
await mkdir(block,{recursive:true});
await cp(new URL('../public/vendor/algyr-scroll/',import.meta.url),block,{recursive:true});
await cp(new URL('../public/media/algyr/platform/',import.meta.url),new URL('media/platform/',block),{recursive:true});
await cp(new URL('../public/media/algyr/brand/',import.meta.url),new URL('media/brand/',block),{recursive:true});
await copyFile(new URL('../resources/js/algyr-embed.js',import.meta.url),new URL('embed.js',block));
await cp(new URL('../docs/licenses/',import.meta.url),new URL('licenses/',block),{recursive:true});
await copyFile(new URL('../docs/THIRD-PARTY-NOTICES.md',import.meta.url),new URL('THIRD-PARTY-NOTICES.md',block));
await copyFile(new URL('../docs/HTML-INTEGRATION.md',import.meta.url),new URL('README.md',directory));
for(const name of ['VALIDATION.md','standalone-chromium.json','standalone-webkit.json','html-integration-chromium.json','html-integration-webkit.json','scroll-current-chromium.json','scroll-current-webkit.json','host-current-chromium.json']){
 await copyFile(new URL('../docs/'+name,import.meta.url),new URL(name,directory));
}
await copyFile(new URL('../resources/css/demo.css',import.meta.url),new URL('demo.css',directory));
let preview=await readFile(new URL('../preview/index.html',import.meta.url),'utf8');
preview=preview.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*rel="(?:stylesheet|modulepreload|preload)"[^>]*>/g,'');
preview=preview.replace('</head>','<link rel="stylesheet" href="./demo.css">\n</head>');
preview=preview.replaceAll('/public/media/algyr/brand/','./algyr-block/media/brand/');
preview=preview.replace(/<section id="platform"[\s\S]*?<\/section>/,'<div data-algyr-embed data-lang="kk"></div>\n<script defer src="./algyr-block/embed.js?v=9"></script>');
await writeFile(new URL('index.html',directory),preview);
await mkdir(new URL('nested/',directory),{recursive:true});
await writeFile(new URL('nested/page.html',directory),preview.replaceAll('./algyr-block/','../algyr-block/').replace('./demo.css','../demo.css').replace('data-lang="kk"','data-lang="ru"'));
for(const locale of ['kk','ru','en']){
 const template=await readFile(new URL('templates/'+locale+'.html',block),'utf8');
 // Also provide real HTML for CMS editors/server includes and no-JavaScript fallback.
 const full=template.replaceAll('algyr-template','platform').replaceAll('media/','/algyr-block/media/').replaceAll('media\\/','\\/algyr-block\\/media\\/');
 const snippet='<link rel="stylesheet" href="/algyr-block/algyr-scroll.css?v=9">\n'+full+'\n<script defer src="/algyr-block/algyr-scroll.js?v=9"></script>\n';
 await writeFile(new URL('snippet.'+locale+'.html',directory),snippet);
 if(locale==='kk')await writeFile(new URL('full-html-example.html',directory),'<!doctype html><html lang="kk"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ALGYR HTML</title><body style="margin:0">'+snippet+'</body></html>');
}
await writeFile(new URL('paste-this.html',directory),'<div data-algyr-embed data-lang="kk"></div>\n<script defer src="/algyr-block/embed.js?v=9"></script>\n');
console.log('standalone/: ready to upload; no PHP, npm or CDN required.');
