import test from 'node:test';
import assert from 'node:assert/strict';
import {createIntroTimeline,INTRO_BEATS} from '../src/intro.js';
import {createIntroScore} from '../src/intro-score.js';

test('A paused opening keeps its place and resumes for only its remaining time',()=>{
  const timeline=createIntroTimeline();
  timeline.advance(2000);timeline.pause(true);timeline.advance(60000);
  assert.equal(timeline.snapshot().index,0);assert.equal(timeline.snapshot().elapsed,2000);
  timeline.pause(false);timeline.advance(INTRO_BEATS[0].duration-2001);
  assert.equal(timeline.snapshot().index,0);
  timeline.advance(1);assert.equal(timeline.snapshot().index,1);assert.equal(timeline.snapshot().elapsed,0);
});

test('Manual advancement can finish while paused; replay starts at the beginning',()=>{
  const timeline=createIntroTimeline();timeline.pause(true);
  for(let i=0;i<INTRO_BEATS.length;i++)timeline.next();
  assert.equal(timeline.snapshot().finished,true);
  timeline.advance(5000);timeline.next();assert.equal(timeline.snapshot().index,INTRO_BEATS.length-1);
  assert.deepEqual(timeline.reset(),{index:0,elapsed:0,paused:false,finished:false});
});

test('Elapsed time carries across scene cuts without shortening the complete opening',()=>{
  const timeline=createIntroTimeline();
  const duration=INTRO_BEATS.reduce((total,beat)=>total+beat.duration,0);
  timeline.advance(duration-1);assert.equal(timeline.snapshot().finished,false);
  timeline.advance(1);assert.equal(timeline.snapshot().finished,true);
});

test('Skipping before audio unlock completes never starts the soundtrack',async()=>{
  let unlock,oscillators=0,suspends=0;
  const context={state:'suspended',destination:{},createBiquadFilter(){return {frequency:{},connect(){}};},
    createOscillator(){oscillators++;throw new Error('Must not play after skip');},
    resume(){return new Promise(resolve=>{unlock=()=>{this.state='running';resolve();};});},
    async suspend(){suspends++;this.state='suspended';},async close(){this.state='closed';}};
  const score=createIntroScore({createContext:()=>context});
  const pending=score.start();score.stop();unlock();await pending;
  assert.equal(oscillators,0);assert.equal(suspends,1);assert.equal(context.state,'suspended');
  score.destroy();
});
