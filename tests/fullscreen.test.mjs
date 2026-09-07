import test from 'node:test';
import assert from 'node:assert/strict';
import {createFullscreenController} from '../src/fullscreen.js';

function documentStub(){
  const classes=new Set(),events=new Map();
  const doc={fullscreenElement:null,documentElement:{classList:{toggle(name,on){on?classes.add(name):classes.delete(name);}}},addEventListener(name,fn){events.set(name,fn);},removeEventListener(name){events.delete(name);}};
  return {doc,classes,events,emit(){events.get('fullscreenchange')?.();}};
}
test('Native fullscreen activates, exits and follows browser Escape events',async()=>{
  const {doc,classes,emit}=documentStub(),states=[];
  doc.documentElement.requestFullscreen=async()=>{doc.fullscreenElement=doc.documentElement;emit();};
  doc.exitFullscreen=async()=>{doc.fullscreenElement=null;emit();};
  const mode=createFullscreenController(doc,on=>states.push(on));
  await mode.toggle();assert.ok(mode.isActive());assert.ok(classes.has('screen-mode'));assert.equal(mode.isFallback(),false);
  await mode.toggle();assert.equal(mode.isActive(),false);assert.equal(classes.has('screen-mode'),false);
  await mode.toggle();doc.fullscreenElement=null;emit();assert.equal(mode.isActive(),false);assert.equal(states.at(-1),false);
});
test('Unsupported and denied fullscreen requests fall back to a usable immersive layout',async()=>{
  for(const denied of [false,true]){
    const {doc,classes}=documentStub();if(denied)doc.documentElement.requestFullscreen=async()=>{throw new Error('Denied');};
    const mode=createFullscreenController(doc);await mode.toggle();assert.ok(mode.isFallback());assert.ok(classes.has('screen-mode'));
    await mode.exit();assert.equal(mode.isActive(),false);assert.equal(classes.has('screen-mode'),false);
  }
});
test('Repeated clicks while a request is pending do not issue duplicate requests',async()=>{
  const {doc}=documentStub();let count=0,finish;
  doc.documentElement.requestFullscreen=()=>{count++;return new Promise(resolve=>{finish=()=>{doc.fullscreenElement=doc.documentElement;resolve();};});};
  const mode=createFullscreenController(doc);const first=mode.toggle();await mode.toggle();assert.equal(count,1);finish();await first;assert.ok(mode.isActive());
});
test('Safari fullscreen events and prefixed methods use the same state',async()=>{
  const {doc,events}=documentStub();
  doc.documentElement.webkitRequestFullscreen=()=>{doc.webkitFullscreenElement=doc.documentElement;events.get('webkitfullscreenchange')();};
  doc.webkitExitFullscreen=()=>{doc.webkitFullscreenElement=null;events.get('webkitfullscreenchange')();};
  const mode=createFullscreenController(doc);await mode.toggle();assert.ok(mode.isActive());await mode.exit();assert.equal(mode.isActive(),false);mode.destroy();assert.equal(events.size,0);
});
