import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,travel,interact,choose,validateSave,objects,hint,objective,quests} from '../src/engine.js';
import {bunnyProgress,BUNNY_RELEASE_LINES} from '../src/bunny-quest.js';
import {sceneSprites} from '../src/scene-layout.js';
import {createBunnyEffects} from '../src/bunny-effects.js';
const ready=()=>{const s=newGame();s.flags.keysFound=s.flags.workshopUnlocked=s.flags.repaired=s.flags.filmFound=s.flags.tapeFound=true;s.inventory=['film','tape','wrench'];return s;};
test('The factory detour cannot be bypassed through the map; early exploration is safe',()=>{
  const s=ready();travel(s,'corley');assert.equal(s.scene,'proving');
  interact(s,'serviceGate','use');assert.equal(s.scene,'proving');
  const before=[...s.inventory];interact(s,'minefield','kick');interact(s,'kiosk','use','wrench');assert.deepEqual(s.inventory,before);
  interact(s,'bunnyBox','use');assert.ok(!s.flags.bunniesTaken);
  travel(s,'garage');travel(s,'corley');assert.equal(s.scene,'proving');
});
test('Car puzzle, collection and all four crossings persist without losing progress or duplicating items',()=>{
  let s=ready();travel(s,'corley');const reload=()=>{s=validateSave(JSON.parse(JSON.stringify(s)));};
  choose(s,'car_forward');assert.ok(!s.flags.kioskKeyFound);reload();
  choose(s,'car_reverse');reload();choose(s,'car_reverse');assert.equal(s.inventory.filter(id=>id==='kioskKey').length,1);
  interact(s,'kiosk','use','kioskKey');reload();assert.ok(objects(s).some(o=>o.id==='bunnyBox'));
  interact(s,'bunnyBox','use');reload();assert.ok(!objects(s).some(o=>o.id==='bunnyBox'));assert.ok(!sceneSprites(s).some(o=>o.id==='bunnyBox'));
  interact(s,'bunnyBox','use');assert.equal(s.inventory.filter(id=>id==='bunnies').length,1);
  for(let i=1;i<=4;i++){
    const r=interact(s,'minefield','use','bunnies');assert.equal(r.text,BUNNY_RELEASE_LINES[i-1]);reload();assert.equal(bunnyProgress(s),i);
    assert.equal(s.inventory.includes('bunnies'),i<4);assert.equal(!!s.flags.minefieldCleared,i===4);
    travel(s,'garage');travel(s,'proving');reload();assert.equal(bunnyProgress(s),i);
  }
  interact(s,'serviceGate','use');assert.equal(s.scene,'corley');assert.ok(quests(s).find(([text])=>text.includes('зайцев'))[1]);
  travel(s,'garage');travel(s,'corley');assert.equal(s.scene,'corley');
});
test('Legacy saves already at or beyond the factory keep access; earlier saves receive the chapter',()=>{
  for(const past of [false,true]){
    const s=ready();delete s.flags.bunnyChapter;
    if(past){s.scene='corley';s.visited.push('corley');}
    const restored=validateSave(s);assert.equal(restored.flags.bunnyChapter,true);assert.equal(!!restored.flags.minefieldCleared,past);
    travel(restored,'garage');travel(restored,'corley');assert.equal(restored.scene,past?'corley':'proving');
  }
});
test('Corrupt crossing stages are rejected and hints cover every new gate',()=>{
  const s=ready();travel(s,'proving');assert.match(objective(s),/зайцев/);assert.match(hint(s,2),/назад/);
  choose(s,'car_reverse');assert.match(hint(s,2),/ключ/);interact(s,'kiosk','use','kioskKey');assert.match(hint(s,2),/коробку/);
  interact(s,'bunnyBox','use');assert.match(hint(s,2),/участок/);
  const bad=structuredClone(s);bad.flags.bunny2=true;assert.throws(()=>validateSave(bad),/полигон/);
  const cleared=structuredClone(s);cleared.flags.minefieldCleared=true;assert.throws(()=>validateSave(cleared),/полигон/);
  const empty=structuredClone(s);empty.inventory=empty.inventory.filter(id=>id!=='bunnies');assert.throws(()=>validateSave(empty),/коробка/);
  const bypass=ready();bypass.scene='corley';assert.throws(()=>validateSave(bypass),/служебный путь/);
});
test('Crossing visuals reveal the next crater only after the hop, while reduced motion resolves immediately',()=>{
  const s=ready();s.flags.bunny1=true;
  const effect=createBunnyEffects(),c={save(){},restore(){},translate(){},scale(){},drawImage(){},beginPath(){},ellipse(){},fill(){}};
  effect.start({effect:'bunny',bunnyStep:1},100,false);
  assert.equal(effect.busy(900),true);assert.equal(effect.draw(c,s,{ready:false},900,false,1).stage,0);
  assert.equal(effect.busy(3100),false);assert.equal(effect.draw(c,s,{ready:false},3100,false,1).stage,1);
  effect.start({effect:'bunny',bunnyStep:1},4000,true);
  assert.equal(effect.busy(4000),false);assert.equal(effect.draw(c,s,{ready:false},4000,true,1).stage,1);
  effect.start({effect:'bunny',bunnyStep:1},5000,false);effect.clear();assert.equal(effect.busy(5001),false);
});
