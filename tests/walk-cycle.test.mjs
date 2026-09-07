import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {createWalker, walkSprite, WALK_FRAMES} from '../src/walk-cycle.js';
import {newGame} from '../src/engine.js';
import {CABINET_FRAMES} from '../src/scene-layout.js';

test('Walking traverses all eight frames, turns left, and returns to idle exactly at the destination',()=>{
  const actor=createWalker(16,87),seen=new Set();actor.moveTo(70);
  for(let i=0;i<125;i++)seen.add(actor.step(16).frame);
  assert.deepEqual([...seen].sort(),[0,1,2,3,4,5,6,7]);
  assert.equal(actor.pose().flip,false);
  for(let i=0;i<200;i++)actor.step(16);
  assert.equal(actor.pose().x,70);assert.equal(actor.pose().frame,null);assert.equal(actor.pose().moving,false);
  actor.moveTo(20);assert.equal(actor.pose().flip,true);assert.equal(actor.pose().frame,0);
  actor.step(50);assert.ok(actor.pose().x<70);
});

test('Cadence follows distance at different refresh rates and viewport proportions',()=>{
  const sample=(delta,stretch=1)=>{
    const actor=createWalker(16,87);actor.moveTo(85);
    for(let elapsed=0;elapsed<500-.001;elapsed+=delta)actor.step(delta,stretch);
    return actor.pose();
  };
  const slow=sample(1000/30),normal=sample(1000/60),fast=sample(1000/120),wide=sample(1000/60,2);
  for(const result of [slow,fast]){
    assert.ok(Math.abs(normal.x-result.x)<.0001);assert.equal(result.frame,normal.frame);
  }
  assert.ok(Math.abs((wide.x-16)*2-(normal.x-16))<.0001);assert.equal(wide.frame,normal.frame);
});

test('Background tab gaps are capped, invalid input cannot poison position, and walks cannot overshoot',()=>{
  const actor=createWalker(61,87);actor.moveTo(1000);
  const before=actor.pose().x;actor.step(60000);assert.ok(actor.pose().x-before<=.951);
  actor.moveTo(NaN);actor.step(NaN);actor.step(-100);assert.ok(Number.isFinite(actor.pose().x));
  for(let i=0;i<200;i++)actor.step(50);
  assert.equal(actor.pose().x,85);actor.moveTo(-1000);
  for(let i=0;i<200;i++)actor.step(50);
  assert.equal(actor.pose().x,16);
});

test('Reduced motion snaps to the destination and resets/travel clear old walking frames',()=>{
  const actor=createWalker();actor.moveTo(85);actor.step(20);actor.setReduced(true);
  assert.equal(actor.pose().x,85);assert.equal(actor.pose().frame,null);
  actor.moveTo(20);assert.equal(actor.pose().x,20);assert.equal(actor.pose().moving,false);
  actor.setReduced(false);actor.moveTo(70);actor.step(50);actor.reset(35,86);
  assert.deepEqual(actor.pose(),{x:35,y:86,flip:false,moving:false,frame:null});
});

test('Animation cells retain one scale and align measured boot baselines without body-width wobble',()=>{
  for(let i=0;i<8;i++){
    const frame=walkSprite(i),wide=walkSprite(i,145,2);
    assert.deepEqual(frame.source,[i%4*384,Math.floor(i/4)*512,384,512]);
    assert.equal(frame.h,512*145/442);assert.ok(Math.abs(frame.y+WALK_FRAMES[i].anchor[1]*145/442)<.0001);
    assert.equal(wide.w,frame.w/2);assert.equal(wide.x,frame.x/2);assert.equal(wide.h,frame.h);
  }
});

// Read-only PNG decoding makes a painted checkerboard fail asset validation.
async function readRgbaPng(path) {
  const png=await readFile(new URL('../assets/'+path,import.meta.url));
  assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  assert.equal(png[24],8);assert.equal(png[25],6,'Asset must contain real RGBA alpha');assert.equal(png[28],0);
  const chunks=[];
  for(let offset=8;offset<png.length;){const size=png.readUInt32BE(offset);if(png.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(png.subarray(offset+8,offset+8+size));offset+=size+12;}
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*4,pixels=Buffer.alloc(stride*height);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];assert.ok(filter<=4);
    for(let x=0;x<stride;x++){
      const index=y*stride+x,a=x>=4?pixels[index-4]:0,b=y?pixels[index-stride]:0,c=x>=4&&y?pixels[index-stride-4]:0;
      const prediction=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];
      pixels[index]=(raw[y*(stride+1)+1+x]+prediction)&255;
    }
  }
  return {width,height,alpha:(x,y)=>pixels[(y*width+x)*4+3]};
}

test('Every shipped walking frame is a detailed isolated cutout, and radio also has actual transparency',async()=>{
  const png=await readRgbaPng('ben-walk.png');assert.equal(png.width,1536);assert.equal(png.height,1024);
  for(let i=0;i<8;i++){
    const [x,y,w,h]=WALK_FRAMES[i].source;let clear=0,body=0;
    for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){
      const alpha=png.alpha(x+dx,y+dy);if(alpha<16)clear++;if(alpha>200)body++;
    }
    assert.ok(clear>w*h*.55,`Frame ${i} has a transparent background`);
    assert.ok(body>20000,`Frame ${i} has a complete opaque body`);
    for(const [dx,dy] of [[0,0],[w-1,0],[0,h-1],[w-1,h-1]])assert.ok(png.alpha(x+dx,y+dy)<16);
  }
  const radio=await readRgbaPng('radio.png');assert.ok(radio.alpha(0,0)<16);assert.ok(radio.alpha(768,700)>200);
  const forks=await readRgbaPng('forks.png');assert.equal(forks.width,1024);assert.equal(forks.height,1536);
  assert.ok(forks.alpha(0,0)<16);assert.ok(forks.alpha(512,768)<16,'The gap between the fork legs is transparent');
});

test('All three cabinet state images are complete RGBA cutouts with transparent padding',async()=>{
  const png=await readRgbaPng('cabinet.png');assert.equal(png.width,1881);assert.equal(png.height,836);
  for(const [stage,{source:[x,y,w,h]}] of Object.entries(CABINET_FRAMES)){
    assert.ok(x>=0&&y>=0&&x+w<=png.width&&y+h<=png.height,stage);
    let clear=0,body=0;
    for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){
      const alpha=png.alpha(x+dx,y+dy);if(alpha<16)clear++;if(alpha>200)body++;
    }
    assert.ok(clear>w*h*.15,stage+' has transparent space around the silhouette');
    assert.ok(body>200000,stage+' contains a complete cabinet');
    for(const [dx,dy] of [[0,0],[w-1,0],[0,h-1],[w-1,h-1]])assert.ok(png.alpha(x+dx,y+dy)<16,stage);
  }
});

test('Scene renderer draws the actual walking sheet only in motion, mirrors leftward steps and resets on travel',async()=>{
  const names=['Image','matchMedia','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'];
  const previous=Object.fromEntries(names.map(name=>[name,globalThis[name]]));
  let nextFrame,renderer;
  const calls=[];
  try{
    globalThis.Image=class {set src(value){this.url=value;queueMicrotask(()=>this.onload());}};
    globalThis.matchMedia=()=>({matches:false});
    globalThis.ResizeObserver=class {observe(){}disconnect(){}};
    globalThis.requestAnimationFrame=callback=>{nextFrame=callback;return 1;};globalThis.cancelAnimationFrame=()=>{};
    const art=await import('../src/art.js');await art.artworkReady;
    const c=new Proxy({drawImage(image,...args){calls.push({asset:image.url,args});},scale(x,y){calls.push({scale:[x,y]});}},{get(target,key){return key in target?target[key]:()=>{};}});
    const canvas={width:1536,height:1024,getContext:()=>c,getBoundingClientRect:()=>({width:1200,height:600})};
    const state=newGame();renderer=art.createRenderer(canvas,()=>state);
    nextFrame(0);assert.equal(calls.some(call=>call.asset?.endsWith('ben-walk.png')),false);
    renderer.walkTo(20);calls.length=0;nextFrame(100);nextFrame(200);
    assert.ok(calls.some(call=>call.asset?.endsWith('ben-walk.png')));assert.ok(calls.some(call=>call.scale?.[0]===-1));
    renderer.setReduced(true);calls.length=0;nextFrame(300);
    assert.equal(calls.some(call=>call.asset?.endsWith('ben-walk.png')),false);
    renderer.setReduced(false);renderer.walkTo(80);state.scene='garage';calls.length=0;nextFrame(400);
    assert.equal(calls.some(call=>call.asset?.endsWith('ben-walk.png')),false);assert.ok(calls.some(call=>call.asset?.endsWith('radio.png')));
    state.scene='yard';calls.length=0;nextFrame(500);
    assert.ok(calls.some(call=>call.asset?.endsWith('scenes-yard-clean.png')));
    assert.ok(calls.some(call=>call.asset?.endsWith('forks.png')));
    state.flags.forksTaken=true;calls.length=0;nextFrame(600);
    assert.ok(calls.some(call=>call.asset?.endsWith('scenes-yard-clean.png')));
    assert.equal(calls.some(call=>call.asset?.endsWith('forks.png')),false);
    calls.length=0;art.drawItem(canvas,'forks');
    assert.ok(calls.some(call=>call.asset?.endsWith('forks.png')),'Inventory uses the same new sprite');
    state.scene='corley';
    for(const stage of ['closed','open','powered']){
      state.flags.cabinetOpen=stage!=='closed';state.flags.powerOn=stage==='powered';
      calls.length=0;nextFrame(700);
      assert.ok(calls.some(call=>call.asset?.endsWith('scenes-corley-clean.png')));
      const cabinet=calls.filter(call=>call.asset?.endsWith('cabinet.png'));
      assert.equal(cabinet.length,1,'Only one cabinet is drawn');
      assert.deepEqual(cabinet[0].args.slice(0,4),CABINET_FRAMES[stage].source);
      const bounds=renderer.objectBounds('cabinet');
      assert.ok(Math.abs(bounds.x*7.68-cabinet[0].args[4])<.001,'Interaction area tracks the active frame');
      assert.ok(Math.abs(bounds.w*7.68-cabinet[0].args[6])<.001);
    }
  }finally{
    renderer?.stop();for(const name of names){if(previous[name]===undefined)delete globalThis[name];else globalThis[name]=previous[name];}
  }
});
