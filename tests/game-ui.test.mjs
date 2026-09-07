import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDebugGate, installDebugMode} from '../src/debug-mode.js';
import {createHighlightFade, createSpriteHighlights} from '../src/highlight.js';
import {sceneSprites} from '../src/scene-layout.js';
import {sceneryBox} from '../src/scenery-masks.js';
import {newGame, objects, interact, choose} from '../src/engine.js';

test('Debug mode unlocks on exactly seven consecutive corner clicks and relocks after another seven',()=>{
  const gate=createDebugGate();
  for(let i=0;i<6;i++){assert.equal(gate.click(true),false);assert.equal(gate.enabled(),false);}
  gate.click(false);
  for(let i=0;i<6;i++)assert.equal(gate.click(true),false);
  assert.equal(gate.click(true),true);assert.equal(gate.enabled(),true);
  for(let i=0;i<6;i++)assert.equal(gate.click(true),false);
  assert.equal(gate.click(true),true);assert.equal(gate.enabled(),false);
  assert.equal(createDebugGate().enabled(),false,'Reload starts with debugging hidden');
});

test('Corner clicks are consumed without moving the player; other clicks and right clicks reset discovery',()=>{
  const events={},document={addEventListener(name,fn,capture){events[name]=fn;assert.equal(capture,true);}};
  const classes=new Set(),scene={contains:target=>target==='scene',getBoundingClientRect:()=>({left:100,top:60}),classList:{toggle(name,on){on?classes.add(name):classes.delete(name);}}};
  const button={},changes=[];
  const gate=installDebugMode({document,scene,button,onChange:on=>changes.push(on)});
  const click=(target='scene',x=110,detail=1)=>{const event={target,clientX:x,clientY:70,detail,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};events.click(event);return event;};
  assert.equal(button.hidden,true);
  for(let i=0;i<6;i++){const e=click();assert.ok(e.prevented&&e.stopped);}
  events.contextmenu();click();assert.equal(gate.enabled(),false);
  assert.equal(click('outside',200).stopped,undefined);
  click('scene',110,0);assert.equal(gate.enabled(),false,'Keyboard activation cannot accidentally unlock it');
  for(let i=0;i<7;i++)click();
  assert.equal(button.hidden,false);assert.ok(classes.has('debug-mode'));assert.deepEqual(changes,[true]);
});

test('Hover fades in and out, supports crossfades and stops animation with reduced motion',()=>{
  const fade=createHighlightFade(200);fade.select('bike');fade.step(40);
  assert.equal(fade.opacity('bike'),.2);fade.step(40);assert.equal(fade.opacity('bike'),.4);
  fade.select('mo');fade.step(40);assert.equal(fade.opacity('bike'),.2);assert.equal(fade.opacity('mo'),.2);
  fade.step(40);assert.equal(fade.opacity('bike'),0);assert.equal(fade.opacity('mo'),.4);
  fade.select(null);fade.step(40);assert.equal(fade.opacity('mo'),.2);
  fade.step(40);assert.equal(fade.opacity('mo'),0);
  fade.select('can');fade.step(16,true);assert.equal(fade.opacity('can'),1);
  fade.select(null);fade.step(16,true);assert.equal(fade.opacity('can'),0);
  fade.select('radio');fade.step(50);fade.clear();assert.equal(fade.opacity('radio'),0);
});

test('Highlight mask and hit testing preserve alpha holes and cache only the requested sprite frame',()=>{
  let reads=0,canvases=0;const composites=[];
  const pixels=new Uint8ClampedArray(3*3*4);
  [1,3,5,7].forEach(index=>pixels[index*4+3]=255); // cross with a transparent hole
  const image={},asset={ready:true,image};
  const highlights=createSpriteHighlights(()=>{
    canvases++;
    const context={drawImage(...args){assert.equal(args[0],image);assert.deepEqual(args.slice(1,5),[20,10,3,3]);},getImageData(){reads++;return {data:pixels};},fillRect(){assert.equal(this.globalCompositeOperation,'source-in');composites.push(this.globalCompositeOperation);}};
    return {width:0,height:0,getContext:()=>context};
  });
  const frame=[20,10,3,3],box={x:100,y:200,w:60,h:60};
  assert.equal(highlights.contains(asset,frame,box,110,210),false,'Transparent padding');
  assert.equal(highlights.contains(asset,frame,box,130,230),false,'Hole inside the image');
  assert.equal(highlights.contains(asset,frame,box,130,210),true,'Opaque object');
  assert.equal(highlights.contains(asset,frame,box,90,210),false,'Outside the drawn frame');
  const drawn=[],c={save(){},restore(){},drawImage(...args){drawn.push(args);}};
  highlights.draw(c,asset,frame,box,.5);
  assert.equal(c.globalAlpha,.06);assert.equal(c.globalCompositeOperation,'screen');
  assert.deepEqual(drawn[0].slice(1),[100,200,60,60]);assert.equal(reads,1);assert.equal(canvases,1);assert.deepEqual(composites,['source-in']);
});

test('Every actionable object has a matching sprite or a scenery silhouette across quest states',()=>{
  const state=newGame();
  for(const progressed of [false,true]){
    Object.assign(state.flags,{workshopUnlocked:progressed,repaired:progressed,dogFed:progressed,forksTaken:progressed,canTaken:progressed});
    for(const scene of ['kickstand','garage','yard','corley']){
      state.scene=scene;
      for(const object of objects(state)){
        const sprite=sceneSprites(state).find(sprite=>sprite.id===object.id),box=sceneryBox(scene,object.id);
        assert.ok(sprite||box,scene+': '+object.id);
        if(box)assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=768&&box.y+box.h<=512);
      }
      for(const stretch of [.6,1,1.4,2.4])for(const sprite of sceneSprites(state,stretch)){
        assert.ok(Math.abs(sprite.box.w*stretch/sprite.box.h-sprite.frame[2]/sprite.frame[3])<.001);
      }
    }
  }
});

test('Fullscreen is inside the scene, debugging starts hidden, and removed UI leaves no dangling element references',async()=>{
  const [html,game,css]=await Promise.all(['index.html','src/game.js','style.css'].map(file=>readFile(new URL('../'+file,import.meta.url),'utf8')));
  assert.match(html,/<div class="scene-tools">[\s\S]*?id="fullscreen-button"/);
  assert.match(html,/<button id="hotspot-button" hidden/);
  assert.doesNotMatch(html,/class="edition"|chapter-heading|chapter-progress|location-coordinate|<footer/);
  assert.doesNotMatch(html,/inventory-count|<span>1 — 4<\/span>/);
  assert.doesNotMatch(game,/inventory-count/);
  assert.equal((html.match(/id="fullscreen-button"/g)||[]).length,1);
  const ids=new Set([...html.matchAll(/id="([\w-]+)"/g),...game.matchAll(/id="([\w-]+)"/g)].map(match=>match[1]));
  const referenced=[...game.matchAll(/\$\('([\w-]+)'\)/g)].map(match=>match[1]);
  assert.deepEqual([...new Set(referenced.filter(id=>!ids.has(id)))],[]);
  assert.match(css,/font-family:"Golos Text"/);assert.match(css,/\.dialogue-content>p\{font-size:19px/);
  assert.match(css,/\.hotspot-label\{[^}]*transition:opacity \.2s ease/);
  assert.match(css,/\.verbs\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\);gap:10px/);
  assert.match(css,/\.verb\{display:flex;flex-direction:column/);
  assert.match(css,/\.actions-section\{grid-column:1\/3;grid-row:1\}/);
  assert.match(css,/\.hotspot:hover,\.hotspot:focus-visible,\.hotspot\[aria-expanded="true"\]\{border:0;background:none;outline:none\}/);
  assert.match(game,/if\(debugMode.enabled\(\)\)commands\[' '\]=toggleHotspots/);
});

test('Corley guard replies with and without choices share a fixed-height dialogue panel with internal scrolling',async()=>{
  const state=newGame();state.scene='corley';state.flags.workshopUnlocked=true;state.flags.repaired=true;
  const opening=interact(state,'guard','talk'),reply=choose(state,'power'),bye=choose(state,'bye');
  assert.equal(opening.choices.length,3);assert.equal(reply.choices?.length||0,0);assert.equal(bye.choices?.length||0,0);
  const [css,game]=await Promise.all(['style.css','src/game.js'].map(file=>readFile(new URL('../'+file,import.meta.url),'utf8')));
  const panelRules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(match=>match[1].trim().endsWith('.conversation'));
  assert.ok(panelRules.length>=4);
  for(const rule of panelRules)assert.match(rule[2],/(?:^|;)height:(?:\d+px|clamp\()/,rule[1]);
  assert.match(css,/\.conversation\{[^}]*flex-shrink:0;overflow:hidden/);
  assert.match(css,/\.dialogue-content\{[^}]*height:100%;overflow-y:auto;[^}]*scrollbar-gutter:stable/);
  assert.match(game,/\$\('dialogue-text'\)\.parentElement\.scrollTop=0/);
});
