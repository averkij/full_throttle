import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame,interact,choose,travel,submitCode,validateSave,saveGame,loadGame,SAVE_KEY,objects,accessible,hint,quests,milestones,objective } from '../src/engine.js';
import {sceneSprites,CABINET_FRAMES} from '../src/scene-layout.js';
import {SCENERY_MASKS} from '../src/scenery-masks.js';

import {VOICE_SAMPLES} from '../src/voice-samples.js';
import {normalizeSpeech} from '../src/voice-player.js';
import {restoredNarration} from '../src/narration.js';
import {t} from '../src/ru.js';
const recorded=new Set(VOICE_SAMPLES.map(line=>line.speaker+'\n'+normalizeSpeech(line.text)));
const assertRecorded=(speaker,text)=>assert.ok(recorded.has(speaker+'\n'+normalizeSpeech(t(text))),`Missing voice: ${speaker}: ${t(text)}`);

const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};

function journey({fuelFirst=false,earlyTools=false,saveEveryStep=false}={}) {
  let s=newGame();const storage=memory();
  const act=fn=>{const result=fn(s);assertRecorded(result.speaker||'BEN',result.text);assertRecorded('BEN',restoredNarration(s));if(saveEveryStep){assert.equal(saveGame(storage,s),true);s=loadGame(storage).state;}return result;};
  const use=(target,item)=>act(s=>interact(s,target,'use',item));
  const go=where=>act(s=>travel(s,where));
  const pick=choice=>act(s=>choose(s,choice));
  act(s=>interact(s,'dumpster','kick'));
  pick('hose');pick('jerky');use('bike','keys');
  assert.equal(s.scene,'garage');assert.equal(accessible(s,'yard'),true);
  use('can');pick('wrench');if(earlyTools){pick('magnet');pick('fuse');}
  go('yard');
  if(fuelFirst){use('pump','hose');use('pump','can');use('dog','jerky');use('forks');}
  else{use('dog','jerky');use('forks');use('pump','hose');use('pump','can');}
  go('garage');
  if(fuelFirst)use('bike','fuel');
  use('bike','forks');use('bike','wrench');
  if(!fuelFirst)use('bike','fuel');
  assert.equal(s.flags.repaired,true);assert.equal(accessible(s,'corley'),true);
  if(!earlyTools)pick('magnet');
  go('kickstand');pick('photographer');use('dumpster','magnet');
  go('garage');use('mo','film');if(!earlyTools)pick('fuse');
  go('corley');use('cabinet','wrench');use('cabinet','fuse');act(s=>interact(s,'plaque','look'));
  act(s=>submitCode(s,'2040'));use('terminal','film');use('terminal','tape');const ending=use('terminal');
  assert.equal(ending.won,true);assert.equal(s.flags.won,true);assert.ok(s.finishedAt>=s.startedAt);
  assert.equal(milestones.filter(key=>s.flags[key]).length,milestones.length);
  assert.equal(quests(s).filter(([,done])=>done).length,8);
  assert.equal(s.inventory.includes('wrench'),true);assert.equal(s.inventory.includes('film'),true);
  return s;
}

test('Complete adventure is winnable through actual actions, with a reload after every step',()=>{journey({saveEveryStep:true});});
test('Fuel, tools, and forks can be collected in different orders without soft-locking',()=>{journey({fuelFirst:true,earlyTools:true,saveEveryStep:true});});
test('Every repair completion order triggers the next chapter',()=>{
  for(const order of [['fuel','forks','wrench'],['forks','fuel','wrench'],['forks','wrench','fuel']]){
    const s=newGame();s.scene='garage';s.flags.workshopUnlocked=true;s.inventory=['fuel','forks','wrench'];
    for(const item of order)interact(s,'bike','use',item);
    assert.equal(s.flags.repaired,true,order.join(','));assert.equal(s.journal.filter(t=>t.includes('The Corley lives')).length,1);
  }
});
test('Premature puzzle actions explain prerequisites and preserve items',()=>{
  const s=newGame();interact(s,'dumpster','kick');interact(s,'bike','use','keys');
  choose(s,'wrench');interact(s,'can','use');
  assert.match(interact(s,'bike','use','wrench').text,/forks/);assert.ok(s.inventory.includes('wrench'));
  travel(s,'yard');assert.match(interact(s,'forks','use').text,/dog/);assert.ok(!s.inventory.includes('forks'));
  assert.match(interact(s,'pump','use','can').text,/hose/);assert.ok(s.inventory.includes('can'));
  const before=structuredClone(s.inventory);interact(s,'dog','use','wrench');assert.deepEqual(s.inventory,before);
});
test('Locations and objects are inaccessible until their prerequisites are met',()=>{
  const s=newGame();travel(s,'garage');travel(s,'yard');travel(s,'corley');assert.equal(s.scene,'kickstand');
  interact(s,'can','use');assert.deepEqual(s.inventory,[]);
  choose(s,'fuse');assert.deepEqual(s.inventory,[]);
  assert.equal(accessible(s,'toString'),false);assert.equal(accessible(s,'__proto__'),false);
  interact(s,'dumpster','kick');interact(s,'bike','use','keys');travel(s,'corley');assert.equal(s.scene,'garage');
});
test('One-time items cannot be duplicated and consumed hotspots disappear',()=>{
  const s=newGame();interact(s,'dumpster','kick');interact(s,'dumpster','kick');assert.deepEqual(s.inventory,['keys']);
  choose(s,'hose');choose(s,'hose');assert.equal(s.inventory.filter(i=>i==='hose').length,1);
  interact(s,'bike','use','keys');interact(s,'can','use');assert.ok(!objects(s).some(o=>o.id==='can'));
});

test('Collecting the fork removes both its scene sprite and hotspot, including after reload and use on the bike',()=>{
  let s=newGame();const store=memory();
  interact(s,'dumpster','kick');choose(s,'jerky');interact(s,'bike','use','keys');travel(s,'yard');
  const visible=()=>sceneSprites(s).some(sprite=>sprite.id==='forks');
  assert.equal(visible(),true);assert.equal(SCENERY_MASKS.yard.forks,undefined,'No fork baked into scenery interaction');
  interact(s,'forks','use');assert.equal(visible(),true,'The guard dog still blocks pickup');
  interact(s,'dog','use','jerky');interact(s,'forks','use');
  assert.equal(s.flags.forksTaken,true);assert.ok(s.inventory.includes('forks'));assert.equal(visible(),false);
  assert.equal(objects(s).some(object=>object.id==='forks'),false);
  assert.equal(saveGame(store,s),true);s=loadGame(store).state;
  assert.equal(visible(),false);assert.equal(objects(s).some(object=>object.id==='forks'),false);
  interact(s,'forks','use');assert.equal(s.inventory.filter(item=>item==='forks').length,1);
  travel(s,'garage');interact(s,'bike','use','forks');travel(s,'yard');
  assert.equal(s.inventory.includes('forks'),false);assert.equal(visible(),false);
});
test('Cabinet artwork follows opening and fuse installation, preserving each state after reload',()=>{
  let s=newGame();const store=memory();
  s.scene='corley';s.flags.workshopUnlocked=true;s.flags.repaired=true;s.inventory=['wrench','fuse'];
  const check=stage=>{
    for(const stretch of [.6,1,2.4]){
      const sprite=sceneSprites(s,stretch).find(sprite=>sprite.id==='cabinet');
      const expected=CABINET_FRAMES[stage];
      assert.equal(sprite.asset,'cabinet');assert.deepEqual(sprite.frame,expected.source);
      const scale=sprite.box.h/sprite.frame[3];
      assert.ok(Math.abs(sprite.box.x+expected.anchor[0]*scale/stretch-529)<.001,'Body stays planted when door opens');
      assert.ok(Math.abs(sprite.box.y+expected.anchor[1]*scale-414)<.001,'Feet stay on the ground');
      assert.equal(SCENERY_MASKS.corley.cabinet,undefined,'Picking uses the state artwork alpha');
    }
    assert.ok(objects(s).some(object=>object.id==='cabinet'));
  };
  const reload=stage=>{check(stage);assert.equal(saveGame(store,s),true);s=loadGame(store).state;check(stage);};
  reload('closed');
  interact(s,'cabinet','use','fuse');assert.ok(s.inventory.includes('fuse'));reload('closed');
  interact(s,'cabinet','use','wrench');assert.equal(s.flags.cabinetOpen,true);reload('open');
  interact(s,'cabinet','use','fuse');assert.equal(s.flags.powerOn,true);assert.equal(s.inventory.includes('fuse'),false);reload('powered');
  travel(s,'garage');travel(s,'corley');check('powered');
});
test('Terminal enforces electricity, PIN and both pieces of evidence',()=>{
  const s=newGame();s.scene='corley';s.flags.workshopUnlocked=true;s.flags.repaired=true;s.inventory=['wrench','fuse','film','tape'];
  interact(s,'terminal','use','film');assert.ok(!s.flags.filmLoaded);
  interact(s,'cabinet','use','fuse');assert.ok(s.inventory.includes('fuse'));assert.ok(!s.flags.powerOn);
  interact(s,'cabinet','use','wrench');interact(s,'cabinet','use','fuse');
  assert.equal(submitCode(s,'1234').error,true);assert.ok(!s.flags.terminalUnlocked);
  submitCode(s,'2040');interact(s,'terminal','use','film');interact(s,'terminal','use');assert.ok(!s.flags.won);
  interact(s,'terminal','use','tape');assert.equal(interact(s,'terminal','use').won,true);
});
test('New, partial, and completed saves survive a storage round trip',()=>{
  const store=memory(),s=newGame();assert.equal(loadGame(store).restored,false);
  interact(s,'dumpster','kick');saveGame(store,s);assert.deepEqual(loadGame(store).state,s);
  const completed=journey();saveGame(store,completed);assert.deepEqual(loadGame(store).state,completed);
  const imported=validateSave(JSON.parse(JSON.stringify(completed)));assert.deepEqual(imported,completed);
  imported.inventory.push('can');assert.notDeepEqual(imported.inventory,completed.inventory);
});
test('Malformed saves are rejected without deleting or overwriting the original',()=>{
  const store=memory();store.setItem(SAVE_KEY,'{ not json');const restored=loadGame(store);assert.ok(restored.error);assert.equal(restored.restored,false);assert.equal(store.getItem(SAVE_KEY),'{ not json');
  for(const change of [{version:2},{scene:'__proto__'},{inventory:['unknown']},{inventory:['keys','keys']},{flags:{won:'yes'}},{visited:['unknown']},{actions:-5},{finishedAt:'yesterday'},{journal:['x'.repeat(1001)]}])assert.throws(()=>validateSave({...newGame(),...change}));
});

test('Older saves gain an empty speech history, while malformed history is rejected',()=>{
  const legacy=newGame();delete legacy.heardSpeech;
  assert.deepEqual(validateSave(legacy),{...legacy,heardSpeech:[]});
  const store=memory();store.setItem(SAVE_KEY,JSON.stringify(legacy));assert.equal(loadGame(store).restored,true);
  assert.deepEqual(loadGame(store).state.heardSpeech,[]);
  const original={...newGame(),heardSpeech:['ben-intro']},imported=validateSave(original);imported.heardSpeech.push('mo-greeting');
  assert.deepEqual(original.heardSpeech,['ben-intro'],'Imported history does not share a mutable array');
  for(const heardSpeech of [null,'ben-intro',{},[42],['../bad'],['ben-intro','ben-intro'],['x'.repeat(101)],Array.from({length:513},(_,i)=>'line-'+i)])assert.throws(()=>validateSave({...newGame(),heardSpeech}),/speech history/);
});
test('Storage denial and quota exhaustion return a recoverable result',()=>{
  const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('quota');}};
  assert.ok(loadGame(denied).error);assert.equal(saveGame(denied,newGame()),false);
});
test('Hints provide a next step at every major stage, including the ending',()=>{
  const s=newGame();assert.match(hint(s,2),/Kick/);interact(s,'dumpster','kick');assert.match(hint(s,2),/keys/);
  interact(s,'bike','use','keys');assert.match(hint(s,2),/jerky/);
  const finished=journey();assert.match(objective(finished),/ride free/);assert.match(hint(finished,2),/new ride/);
});
test('Every reachable scene has unique named hotspots within its canvas',()=>{
  const s=newGame();s.flags.workshopUnlocked=true;s.flags.repaired=true;
  for(const scene of ['kickstand','garage','yard','corley']){s.scene=scene;const list=objects(s);assert.equal(new Set(list.map(o=>o.id)).size,list.length);for(const o of list){assert.ok(o.name);assert.ok(o.x>=0&&o.y>=0&&o.x+o.w<=100&&o.y+o.h<=100,o.id);}}
});
