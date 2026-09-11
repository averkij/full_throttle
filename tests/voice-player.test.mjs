import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {VOICE_SAMPLES} from '../src/voice-samples.js';
import {createVoicePlayer} from '../src/voice-player.js';
import {newGame,interact,submitCode,saveGame,loadGame,validateSave,SCENES} from '../src/engine.js';
import {t} from '../src/ru.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function playback(options={}){
  const audios=[],changes=[],errors=[];
  const player=createVoicePlayer({...options,samples:VOICE_SAMPLES,onChange:state=>changes.push(state),onError:sample=>errors.push(sample.id),createAudio:url=>{
    const audio={url,paused:false,released:false,play(){return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});},pause(){this.paused=true;},removeAttribute(name){assert.equal(name,'src');this.released=true;},load(){}};
    audios.push(audio);return audio;
  }});
  return {player,audios,changes,errors};
}

test('Speech stops on a new unvoiced line, mute and explicit stop; preview does not change the current dialogue',async()=>{
  const {player,audios}=playback(),sample=VOICE_SAMPLES[0];
  player.setLine(sample.speaker,sample.text);assert.equal(audios.length,0,'Muted by default');
  player.setEnabled(true);player.setLine(sample.speaker,sample.text);
  assert.equal(audios.length,1);audios[0].onplaying();assert.equal(player.snapshot().status,'playing');
  player.setLine('BEN','Без записи.');assert.equal(audios[0].paused,true);assert.equal(audios[0].released,true);assert.equal(player.snapshot().active,null);
  player.setLine(sample.speaker,sample.text,{autoplay:false});
  void player.playSample(VOICE_SAMPLES[1].id);assert.equal(player.snapshot().current,sample.id);
  player.stopPreview();assert.equal(player.snapshot().active,null);
  void player.playCurrent();player.setEnabled(false);assert.equal(player.snapshot().active,null);assert.equal(audios.at(-1).paused,true);
});

test('Late audio callbacks cannot stop a newer voice, and playback failures leave a replayable line',async()=>{
  const {player,audios,errors}=playback();player.setEnabled(true);
  player.setLine(VOICE_SAMPLES[0].speaker,VOICE_SAMPLES[0].text);
  const oldEnd=audios[0].onended;
  player.setLine(VOICE_SAMPLES[1].speaker,VOICE_SAMPLES[1].text);
  oldEnd();audios[0].reject(new Error('Interrupted'));await flush();
  assert.equal(player.snapshot().active,VOICE_SAMPLES[1].id);assert.deepEqual(errors,[]);
  audios[1].reject(new Error('Autoplay blocked'));await flush();
  assert.equal(player.snapshot().active,null);assert.equal(player.snapshot().current,VOICE_SAMPLES[1].id);assert.deepEqual(errors,[VOICE_SAMPLES[1].id]);
  void player.playCurrent();assert.equal(audios.length,3);audios[2].resolve();audios[2].onended();
  assert.equal(player.snapshot().active,null);
});

test('A heard line becomes text-only on repetition, while replay and different replies still work',()=>{
  const heard=[],{player,audios}=playback({onHeard:id=>heard.push(id)}),line=VOICE_SAMPLES[0],other=VOICE_SAMPLES.find(sample=>sample.speaker==='BEN'&&sample.id!==line.id);
  player.setEnabled(true);player.setLine(line.speaker,line.text);
  audios[0].onplaying();audios[0].onplaying();assert.deepEqual(heard,[line.id],'Playback resumes do not duplicate history');
  player.setLine(line.speaker,line.text);assert.equal(audios.length,1);assert.equal(player.snapshot().active,null);
  assert.equal(player.snapshot().current,line.id,'The replay button remains available');
  player.setLine(other.speaker,other.text);assert.equal(audios.length,2,'A changed reply still plays');
  audios[1].onplaying();audios[1].onended();
  player.setEnabled(false);player.setEnabled(true);player.setLine(line.speaker,' «'+line.text+'» ');
  assert.equal(audios.length,2,'Revisiting a line or toggling sound does not reset history');
  for(let i=0;i<2;i++){void player.playCurrent();audios.at(-1).onplaying();audios.at(-1).onended();}
  assert.equal(audios.length,4,'Manual replay remains repeatable');assert.deepEqual(heard,[line.id,other.id]);
});

test('Muted, suppressed, cancelled and failed attempts do not consume the first automatic playback',async()=>{
  const heard=[],{player,audios}=playback({onHeard:id=>heard.push(id)}),line=VOICE_SAMPLES[0];
  player.setLine(line.speaker,line.text);player.setEnabled(true);player.setLine(line.speaker,line.text,{autoplay:false});
  assert.equal(audios.length,0);assert.deepEqual(heard,[]);
  player.setLine(line.speaker,line.text);const stalePlaying=audios[0].onplaying;
  player.stop();stalePlaying();assert.deepEqual(heard,[]);
  player.setLine(line.speaker,line.text);audios[1].reject(new Error('Blocked'));await flush();assert.deepEqual(heard,[]);
  player.setLine(line.speaker,line.text);assert.equal(audios.length,3);audios[2].onplaying();
  assert.deepEqual(heard,[line.id]);player.stop();player.setLine(line.speaker,line.text);assert.equal(audios.length,3,'An interrupted audible line uses manual replay next time');
});

test('Auditioning a sample leaves gameplay history alone, but hearing manual replay counts',()=>{
  const heard=[],{player,audios}=playback({onHeard:id=>heard.push(id)}),line=VOICE_SAMPLES[0];
  player.setEnabled(true);void player.playSample(line.id);audios[0].onplaying();audios[0].onended();assert.deepEqual(heard,[]);
  player.setLine(line.speaker,line.text,{autoplay:false});void player.playCurrent();audios[1].onplaying();audios[1].onended();
  assert.deepEqual(heard,[line.id]);player.setLine(line.speaker,line.text);assert.equal(audios.length,2);
});

test('Speech history survives save/load and import, and a new playthrough resets it',()=>{
  let state=newGame(),saved=null;const storage={getItem:()=>saved,setItem:(_key,value)=>saved=value};
  const line=VOICE_SAMPLES[0],first=playback({heardSpeech:state.heardSpeech,onHeard:id=>{state.heardSpeech.push(id);saveGame(storage,state);}});
  first.player.setEnabled(true);first.player.setLine(line.speaker,line.text);first.audios[0].onplaying();
  state=loadGame(storage).state;assert.deepEqual(state.heardSpeech,[line.id]);
  const loaded=playback({heardSpeech:state.heardSpeech});loaded.player.setEnabled(true);loaded.player.setLine(line.speaker,line.text);
  assert.equal(loaded.audios.length,0);assert.equal(loaded.player.snapshot().current,line.id);
  loaded.player.setHeardSpeech(newGame().heardSpeech);loaded.player.setLine(line.speaker,line.text);assert.equal(loaded.audios.length,1);
  const stalePlaying=loaded.audios[0].onplaying;
  loaded.player.setHeardSpeech(validateSave(JSON.parse(saved)).heardSpeech);stalePlaying();loaded.player.setLine(line.speaker,line.text);
  assert.equal(loaded.audios.length,1,'Import replaces the history and stops pending speech');
  loaded.player.setHeardSpeech([]);stalePlaying();loaded.player.setLine(line.speaker,line.text);
  assert.equal(loaded.audios.length,2,'A late event cannot mark the new playthrough as heard');
});

test('Game keeps terminal and ending speech through their automatic dialogs, and voices rejected PINs',async()=>{
  const game=await readFile(new URL('../src/game.js',import.meta.url),'utf8'),audios=[];
  const speech=createVoicePlayer({samples:VOICE_SAMPLES,createAudio:url=>{
    const audio={url,paused:false,play:async()=>{},pause(){this.paused=true;},removeAttribute(){},load(){}};
    audios.push(audio);return audio;
  }});
  speech.setEnabled(true);
  const elements=new Map();
  const $=id=>{
    if(!elements.has(id))elements.set(id,{open:false,textContent:'',innerHTML:'',value:'0000',parentElement:{scrollTop:50},replaceChildren(){},append(){},focus(){},select(){},showModal(){this.open=true;},close(){this.open=false;},classList:{remove(){},add(){}},addEventListener(name,handler){this[name]=handler;}});
    return elements.get(id);
  };
  const state=newGame();state.scene='corley';state.flags={workshopUnlocked:true,repaired:true,powerOn:true};
  const context={$,state,SCENES,speech,t,selected:null,lastFocus:null,document:{activeElement:null,createElement:()=>({addEventListener(){}})},drawPortrait(){},renderScene(){},renderControls(){},save(){},updateHover(){},toast(){},sound(){},contextMenu:{close(){}}};
  // Execute the actual game handlers with a small DOM/audio harness. This catches
  // a modal accidentally cancelling the line that caused it to open.
  const multi=name=>game.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n}'))?.[0];
  const single=name=>game.split('\n').find(line=>line.startsWith('function '+name+'('));
  const submit=game.split('\n').find(line=>line.startsWith("$('modal-body').addEventListener('submit'"));
  // Keep the context so exported function closures use the same state and DOM.
  const runtime={...context,submitCode};
  runInNewContext([multi('dialogue'),multi('apply'),single('openModal'),single('closeModal'),single('openKeypad'),single('openEnding'),submit,'globalThis.handlers={apply,dialogue,openModal};'].join('\n'),runtime);
  const {apply,dialogue,openModal}=runtime.handlers;
  apply(interact(state,'terminal','use'));
  assert.equal($('modal').open,true);assert.ok(speech.snapshot().active,'Opening the keypad preserves Ben’s line');
  $('modal-body').submit({target:{id:'keypad-form'},preventDefault(){}});
  assert.equal($('code-message').textContent,t(submitCode(state,'0000').text));
  assert.equal(speech.snapshot().active,VOICE_SAMPLES.find(line=>line.speaker==='TERMINAL'&&line.text===$('code-message').textContent).id);
  $('service-code').value='2040';$('modal-body').submit({target:{id:'keypad-form'},preventDefault(){}});
  assert.equal($('modal').open,false);assert.equal($('speaker').textContent,t('TERMINAL'));assert.ok(speech.snapshot().active);
  state.flags.filmLoaded=true;state.flags.tapeLoaded=true;
  apply(interact(state,'terminal','use'));
  assert.equal($('modal').open,true);assert.ok(speech.snapshot().active,'Ending overlay preserves the final narration');
  openModal('Menu');assert.equal(speech.snapshot().active,null,'Manual menu interrupts speech');
  const count=audios.length;dialogue({speaker:'BEN',text:VOICE_SAMPLES[0].text},{autoplay:false});
  assert.equal(audios.length,count,'Loading saved dialogue does not play before a gesture');
  assert.equal(speech.snapshot().current,VOICE_SAMPLES[0].id,'Loaded line can still be replayed');
});
