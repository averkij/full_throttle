import { SCENES, objects } from './engine.js';
import { bodies, portraits, itemFrames, FORKS_FRAME, sceneSprites } from './scene-layout.js';
import { createHighlightFade, createSpriteHighlights } from './highlight.js';
import { SCENERY_MASKS, sceneryBox, createSceneryMasks } from './scenery-masks.js';
import { createWalker, walkSprite } from './walk-cycle.js';

// Generated transparent illustrations, composited in scene coordinates.
// Source atlas files are preserved exactly as generated; no chroma-keying.
function loadAsset(name) {
  const image=new Image();
  const asset={image,ready:false,promise:null};
  asset.promise=new Promise(resolve=>{
    image.onload=()=>{asset.ready=true;resolve(true);};
    image.onerror=()=>resolve(false);
  });
  image.src=new URL('../assets/'+name,import.meta.url).href;
  return asset;
}
const backgrounds=loadAsset('scenes.png');
const yardBackground=loadAsset('scenes-yard-clean.png');
const corleyBackground=loadAsset('scenes-corley-clean.png');
const characters=loadAsset('characters-v2.png');
const props=loadAsset('vehicles-v2.png');
const items=loadAsset('items-v2.png');
const radio=loadAsset('radio.png');
const walking=loadAsset('ben-walk.png');
const forks=loadAsset('forks.png');
const cabinet=loadAsset('cabinet.png');
export const artworkReady=Promise.all([backgrounds.promise,yardBackground.promise,corleyBackground.promise,characters.promise,props.promise,items.promise,radio.promise,walking.promise,forks.promise,cabinet.promise]);

function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function illustration(c,asset,frame,x,feet,height,stretch=1,flip=false) {
  if(!asset.ready||!frame)return;
  const [sx,sy,sw,sh]=frame,width=height*sw/sh/stretch;
  c.save();c.translate(x,feet);if(flip)c.scale(-1,1);
  c.drawImage(asset.image,sx,sy,sw,sh,-width/2,-height,width,height);c.restore();
}
export function drawItem(canvas,id) {
  const asset=id==='forks'?forks:items,frame=id==='forks'?FORKS_FRAME:itemFrames[id];
  const draw=()=>{
    const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
    if(!asset.ready||!frame)return;
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    const [x,y,w,h]=frame;
    const scale=Math.min(canvas.width/w,canvas.height/h);
    c.drawImage(asset.image,x,y,w,h,(canvas.width-w*scale)/2,(canvas.height-h*scale)/2,w*scale,h*scale);
  };
  draw();if(!asset.ready)asset.promise.then(draw);
}
export function drawPortrait(canvas,speaker='BEN') {
  const draw=()=>{
    const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
    rect(c,0,0,canvas.width,canvas.height,'#191510');
    if(speaker==='TERMINAL') {
      c.fillStyle='#a7bf87';c.font='bold 42px monospace';c.textAlign='center';c.fillText('>_',canvas.width/2,canvas.height*.58);return;
    }
    if(!characters.ready)return;
    const frame=portraits[speaker]||portraits.BEN;
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    c.drawImage(characters.image,...frame,0,0,canvas.width,canvas.height);
  };
  canvas.dataset.speaker=speaker;draw();
  if(!characters.ready)characters.promise.then(()=>{if(canvas.dataset.speaker===speaker)draw();});
}
export function icon(name) {
  const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;canvas.className='icon';canvas.setAttribute('aria-hidden','true');
  const c=canvas.getContext('2d');c.scale(2,2);c.strokeStyle='#dec399';c.fillStyle='#dec399';c.lineWidth=2;c.lineCap='square';c.lineJoin='miter';
  const path=(pts)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
  const circle=(x,y,r)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();};
  if(name==='eye'){path([[2,12],[6,7],[12,5],[18,7],[22,12],[18,17],[12,19],[6,17],[2,12]]);circle(12,12,3);}
  if(name==='hand'){path([[7,13],[7,7],[10,6],[10,12],[10,3],[13,3],[13,12],[13,5],[16,5],[16,13],[16,8],[19,8],[19,17],[15,21],[9,21],[4,15],[4,12],[7,13]]);}
  if(name==='talk'){path([[3,4],[21,4],[21,16],[11,16],[6,21],[6,16],[3,16],[3,4]]);path([[7,8],[17,8]]);path([[7,12],[14,12]]);}
  if(name==='boot'){path([[8,3],[17,3],[16,14],[21,17],[21,21],[3,21],[3,16],[8,14],[8,3]]);path([[3,18],[21,18]]);path([[10,7],[15,7]]);path([[10,10],[15,10]]);}
  if(name==='journal'){path([[6,3],[20,3],[20,21],[6,21],[6,3]]);path([[3,7],[8,7]]);path([[3,12],[8,12]]);path([[3,17],[8,17]]);path([[11,8],[16,8]]);path([[11,12],[16,12]]);}
  if(name==='menu'){path([[4,6],[20,6]]);path([[4,12],[20,12]]);path([[4,18],[20,18]]);}
  if(name==='pause'){c.fillRect(6,4,4,16);c.fillRect(14,4,4,16);}
  if(name==='play'){c.beginPath();c.moveTo(7,4);c.lineTo(20,12);c.lineTo(7,20);c.closePath();c.fill();}
  if(name==='sound'||name==='muted'){path([[3,9],[7,9],[12,5],[12,19],[7,15],[3,15],[3,9]]);if(name==='sound'){path([[16,8],[18,12],[16,16]]);path([[19,5],[22,12],[19,19]]);}else{path([[16,9],[22,15]]);path([[22,9],[16,15]]);}}
  if(name==='map'){path([[3,5],[9,3],[15,6],[21,3],[21,19],[15,22],[9,19],[3,21],[3,5]]);path([[9,3],[9,19]]);path([[15,6],[15,22]]);}
  if(name==='compass'){circle(12,12,9);path([[15,8],[13,14],[8,17],[10,11],[15,8]]);}
  if(name==='bulb'){c.beginPath();c.arc(12,9,6,Math.PI*.15,Math.PI*.85,true);c.stroke();path([[7,13],[9,17],[15,17],[17,13]]);path([[9,20],[15,20]]);path([[11,23],[13,23]]);}
  if(name==='arrow'){path([[3,12],[20,12]]);path([[15,7],[20,12],[15,17]]);}
  if(name==='expand'){path([[9,3],[3,3],[3,9]]);path([[15,3],[21,3],[21,9]]);path([[3,15],[3,21],[9,21]]);path([[21,15],[21,21],[15,21]]);}
  if(name==='collapse'){path([[3,9],[9,9],[9,3]]);path([[21,9],[15,9],[15,3]]);path([[3,15],[9,15],[9,21]]);path([[21,15],[15,15],[15,21]]);}
  return canvas;
}

export function createRenderer(canvas,getState) {
  const c=canvas.getContext('2d',{alpha:false});
  c.setTransform(canvas.width/768,0,0,canvas.height/512,0,0);
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  let sceneId=null,actorState=null,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,raf,lastTime=null,stretch=1;
  const walker=createWalker(61,87,reduced);
  const fade=createHighlightFade();
  const highlights=createSpriteHighlights(()=>document.createElement('canvas'));
  const sceneryMasks=createSceneryMasks(()=>document.createElement('canvas'));
  const assets={characters,props,items,radio,forks,cabinet};
  function syncActor(s){
    if(sceneId!==s.scene||actorState!==s){sceneId=s.scene;actorState=s;fade.clear();walker.reset(...SCENES[s.scene].spawn);lastTime=null;}
  }
  const resize=()=>{const bounds=canvas.getBoundingClientRect();stretch=bounds.height?bounds.width/bounds.height/1.5:1;};
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const particles=Array.from({length:27},(_,i)=>({x:(i*139.73)%768,y:130+(i*87.9)%370,s:i%3===0?2:1}));
  function draw(time) {
    const s=getState(),scene=SCENES[s.scene];
    syncActor(s);
    const background=s.scene==='yard'?yardBackground:s.scene==='corley'?corleyBackground:backgrounds;
    if(background.ready)c.drawImage(background.image,scene.x*768,scene.y*512,768,512,0,0,768,512);
    else rect(c,0,0,768,512,'#26302a');
    const delta=lastTime===null?16:time-lastTime;
    const actor=walker.step(delta,stretch);fade.step(delta,reduced);
    lastTime=time;
    for(const id of Object.keys(SCENERY_MASKS[s.scene]||{})){
      const opacity=fade.opacity(id);if(!opacity)continue;
      const {asset,frame,box}=sceneryMasks.get(s.scene,id);
      // Large painted surfaces need less brightening than isolated sprites.
      highlights.draw(c,asset,frame,box,opacity*.5);
    }
    for(const sprite of sceneSprites(s,stretch)){
      const asset=assets[sprite.asset],box=sprite.box;
      if(sprite.shadow)oval(c,...sprite.shadow,'#0c171ab0');
      if(asset.ready)c.drawImage(asset.image,...sprite.frame,box.x,box.y,box.w,box.h);
      highlights.draw(c,asset,sprite.frame,box,fade.opacity(sprite.id));
    }
    const actorX=actor.x*7.68,actorFeet=actor.y*5.12;
    oval(c,actorX,actorFeet,28/stretch,4,'#091416b0');
    if(actor.moving&&walking.ready){
      const frame=walkSprite(actor.frame,145,stretch);
      c.save();c.translate(actorX,actorFeet);if(actor.flip)c.scale(-1,1);
      c.imageSmoothingEnabled=false;
      c.drawImage(walking.image,...frame.source,frame.x,frame.y,frame.w,frame.h);
      c.restore();
    }else illustration(c,characters,bodies.BEN,actorX,actorFeet,145,stretch,actor.flip);
    if(!reduced)for(const p of particles)rect(c,(p.x+time*.004)%768,p.y+Math.sin(time*.0002+p.x)*5,p.s,1,'#e6c39935');
    raf=requestAnimationFrame(draw);
  }
  raf=requestAnimationFrame(draw);
  return {
    setHighlight(id){syncActor(getState());fade.select(id);},
    objectBounds(id){
      const s=getState(),sprite=sceneSprites(s,stretch).find(item=>item.id===id);
      if(sprite){const b=sprite.box;return {x:b.x/7.68,y:b.y/5.12,w:b.w/7.68,h:b.h/5.12};}
      const b=sceneryBox(s.scene,id);
      return b?{x:b.x/7.68,y:b.y/5.12,w:b.w/7.68,h:b.h/5.12}:null;
    },
    pickObject(x,y){
      const s=getState(),valid=new Set(objects(s).map(item=>item.id));
      for(const sprite of sceneSprites(s,stretch).reverse()){
        if(valid.has(sprite.id)&&highlights.contains(assets[sprite.asset],sprite.frame,sprite.box,x,y))return sprite.id;
      }
      const candidates=Object.keys(SCENERY_MASKS[s.scene]||{}).filter(id=>valid.has(id));
      candidates.sort((a,b)=>{const aa=sceneryBox(s.scene,a),bb=sceneryBox(s.scene,b);return aa.w*aa.h-bb.w*bb.h;});
      for(const id of candidates){
        const box=sceneryBox(s.scene,id);
        if(x<box.x||y<box.y||x>=box.x+box.w||y>=box.y+box.h)continue;
        const mask=sceneryMasks.get(s.scene,id);
        if(highlights.contains(mask.asset,mask.frame,box,x,y))return id;
      }
      return null;
    },
    walkTo(x){syncActor(getState());walker.moveTo(x);},
    setReduced(value){reduced=value;walker.setReduced(value);},
    stop(){cancelAnimationFrame(raf);observer.disconnect();}
  };
}
