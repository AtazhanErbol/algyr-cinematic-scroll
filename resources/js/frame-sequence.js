// Compressed frames are prefetched; only a small working set is decoded.
// The canvas is repainted on a frame change, never by an idle animation loop.
export class FrameSequence {
    constructor(canvas, config, onError) {
        this.canvas=canvas; this.context=canvas.getContext('2d',{alpha:false});
        this.config=config; this.onError=onError;
        this.blobs=new Map(); this.images=new Map(); this.pending=new Map(); this.decoding=new Map();
        this.queue=[]; this.active=false; this.generation=0; this.wanted=0; this.drawn=-1;
        this.bytes=0; this.failures=0; this.maxDecoded=10;
    }
    url(index) { return this.config.template.replace('{index}',String(index).padStart(this.config.digits||3,'0')); }
    async start() {
        if(this.active)return;
        this.active=true; this.generation++; this.controller=new AbortController();
        const generation=this.generation;
        try {
            await this.load(0); await this.decode(0);
            if(!this.active||generation!==this.generation)return;
            this.paint(0);
            const count=this.config.count;
            this.queue=[count-1,...Array.from({length:Math.ceil(count/10)},(_,i)=>i*10),...Array.from({length:count},(_,i)=>i)];
            this.request(this.wanted);
        } catch(error) { if(this.active&&generation===this.generation)this.onError(error); }
    }
    async load(index) {
        if(this.blobs.has(index))return this.blobs.get(index);
        if(this.pending.has(index))return this.pending.get(index);
        const generation=this.generation,controller=this.controller;
        const promise=(async()=>{
            const request=new AbortController(),abort=()=>request.abort();
            controller.signal.addEventListener('abort',abort,{once:true});
            const timer=setTimeout(abort,12000);
            try {
                const response=await fetch(this.url(index),{signal:request.signal,cache:'force-cache'});
                if(!response.ok)throw new Error('Frame '+index+' unavailable');
                const blob=await response.blob();
                if(generation!==this.generation||!this.active)throw new DOMException('Stopped','AbortError');
                this.blobs.set(index,blob);this.bytes+=blob.size;return blob;
            } finally { clearTimeout(timer);controller.signal.removeEventListener('abort',abort); }
        })();
        this.pending.set(index,promise);
        try { return await promise; }
        finally { if(this.pending.get(index)===promise)this.pending.delete(index); }
    }
    async decode(index) {
        if(this.images.has(index))return this.images.get(index).image;
        if(this.decoding.has(index))return this.decoding.get(index);
        const generation=this.generation;
        const promise=(async()=>{
            const blob=await this.load(index);let image,dispose;
            if(typeof createImageBitmap==='function'){
                image=await createImageBitmap(blob);dispose=()=>image.close();
            } else {
                const url=URL.createObjectURL(blob);image=new Image();image.src=url;
                try { await image.decode(); } catch(error){URL.revokeObjectURL(url);throw error;}
                dispose=()=>URL.revokeObjectURL(url);
            }
            if(!this.active||generation!==this.generation){dispose();return null;}
            this.images.set(index,{image,dispose});this.trim();return image;
        })();
        this.decoding.set(index,promise);
        try{return await promise;}finally{if(this.decoding.get(index)===promise)this.decoding.delete(index);}
    }
    trim() {
        while(this.images.size>this.maxDecoded){
            const index=[...this.images.keys()].find(i=>i!==this.drawn&&i!==this.wanted);
            if(index===undefined)break;
            this.images.get(index).dispose();this.images.delete(index);
        }
    }
    paint(index) {
        const entry=this.images.get(index);
        if(!entry||index===this.drawn)return;
        this.context.drawImage(entry.image,0,0,this.canvas.width,this.canvas.height);
        this.drawn=index;
        this.images.delete(index);this.images.set(index,entry);
        this.canvas.dataset.ready='true';
    }
    request(index) {
        if(!this.active)return;
        this.wanted=Math.max(0,Math.min(this.config.count-1,Math.round(index)));
        this.drawNearest();
        if(!this.blobs.has(this.wanted))this.queue.unshift(this.wanted);
        this.pump();
    }
    drawNearest() {
        if(!this.active)return;
        const nearest=items=>[...items].sort((a,b)=>Math.abs(a-this.wanted)-Math.abs(b-this.wanted))[0];
        const decoded=nearest(this.images.keys());
        if(decoded!==undefined)this.paint(decoded);
        const available=nearest(this.blobs.keys());
        if(available!==undefined&&!this.images.has(available))this.decode(available).then(()=>{
            if(this.active){const closest=nearest(this.images.keys());if(closest!==undefined)this.paint(closest);}
        }).catch(()=>{});
        if(this.blobs.has(this.wanted))for(const neighbor of [this.wanted-1,this.wanted+1]){
            if(this.blobs.has(neighbor))this.decode(neighbor).catch(()=>{});
        }
    }
    pump() {
        while(this.active&&this.pending.size<4&&this.queue.length){
            const index=this.queue.shift();
            if(index>=this.config.count||this.blobs.has(index)||this.pending.has(index))continue;
            const generation=this.generation;
            this.load(index).then(()=>{if(index===this.wanted)this.drawNearest();})
                .catch(error=>{if(error.name!=='AbortError')this.failures++;})
                .finally(()=>{if(this.active&&generation===this.generation)this.pump();});
        }
    }
    stop() {
        this.active=false;this.generation++;this.controller?.abort();this.queue=[];
        this.pending.clear();this.decoding.clear();
        for(const item of this.images.values())item.dispose();
        this.images.clear();this.drawn=-1;delete this.canvas.dataset.ready;
    }
    destroy() { this.stop();this.blobs.clear(); }
    state() { return {frame:this.drawn,desiredFrame:this.wanted,loadedFrames:this.blobs.size,decodedFrames:this.images.size,sequenceBytes:this.bytes,frameFailures:this.failures}; }
}
