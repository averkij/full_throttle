import {createIntroScore} from './intro-score.js';

export const INTRO_BEATS=Object.freeze([
  {duration:5500,scene:'road',line:'Бензин. Братство. Свобода.',detail:'Раньше мне этого хватало.'},
  {duration:5500,scene:'ride',line:'Мы не выбирали неприятности.',detail:'Они сами нашли нас у «Кикстэнда».'},
  {duration:6500,scene:'bar',line:'Помню типа в костюме. Паршивую сделку.',detail:'А потом кто-то выключил свет.'},
  {duration:5000,scene:'blackout',line:'Банда исчезла. Ключи исчезли.',detail:'Пора выяснить, кто за это ответит.'}
]);

// An explicit timeline makes pause, background tabs and manual advancement agree.
export function createIntroTimeline(beats=INTRO_BEATS) {
  let index=0,elapsed=0,paused=false,finished=false;
  const snapshot=()=>({index,elapsed,paused,finished});
  function next(){if(!finished){elapsed=0;index++;if(index>=beats.length){index=beats.length-1;finished=true;}}return snapshot();}
  return {
    snapshot,next,
    reset(){index=0;elapsed=0;paused=false;finished=false;return snapshot();},
    pause(value){paused=!!value;return snapshot();},
    advance(milliseconds){
      if(paused||finished)return snapshot();
      elapsed+=Math.max(0,milliseconds);
      while(!finished&&elapsed>=beats[index].duration){const remainder=elapsed-beats[index].duration;next();if(!finished)elapsed=remainder;}
      return snapshot();
    }
  };
}

export function createIntro({document,window,hasSave=false,sound=false,reducedMotion=false,makeIcon,onSoundChange,onFinish}) {
  const $=id=>document.getElementById(id);
  const root=$('intro'),shell=document.querySelector('.app-shell');
  const timeline=createIntroTimeline(),score=createIntroScore();
  let active=false,playing=false,raf=0,lastTime=0,lastIndex=-1,paused=false,returnFocus=null;
  let motionReduced=reducedMotion,soundEnabled=sound;
  function renderSound(){
    const button=$('intro-sound');
    button.setAttribute('aria-pressed',String(soundEnabled));
    button.firstElementChild.replaceChildren(makeIcon(soundEnabled?'sound':'muted'));
    const label=soundEnabled?'Выключить звук':'Включить звук';
    button.setAttribute('aria-label',label);button.title=label;
  }
  function syncPause(){
    const stopped=paused||document.hidden;
    timeline.pause(stopped);root.classList.toggle('is-paused',stopped);lastTime=0;
    const button=$('intro-pause'),label=paused?'Продолжить':'Пауза';
    button.firstElementChild.replaceChildren(makeIcon(paused?'play':'pause'));
    button.setAttribute('aria-label',label);button.title=label;
    button.setAttribute('aria-pressed',String(paused));
    if(playing&&soundEnabled&&!stopped)void score.start();else score.stop();
  }
  function renderBeat(){
    const {index,elapsed}=timeline.snapshot(),beat=INTRO_BEATS[index];
    if(index!==lastIndex){
      lastIndex=index;root.dataset.shot=beat.scene;
      $('intro-line').textContent=beat.line;$('intro-line-secondary').textContent=beat.detail;
      if(!motionReduced)root.querySelector('.intro-story').animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,fill:'both'});
    }
    root.querySelectorAll('.intro-reel span').forEach((segment,i)=>{
      segment.style.setProperty('--progress',i<index?1:i===index?elapsed/beat.duration:0);
    });
  }
  function frame(now){
    if(!playing)return;
    // Still frames keep the same timing; pause remains available with reduced motion.
    if(lastTime)timeline.advance(now-lastTime);
    lastTime=now;
    if(timeline.snapshot().finished){finish();return;}
    renderBeat();raf=window.requestAnimationFrame(frame);
  }
  function finish(){
    if(!active)return;
    const watched=playing;
    active=false;playing=false;window.cancelAnimationFrame(raf);score.stop();
    root.hidden=true;shell.inert=false;document.documentElement.classList.remove('intro-open');
    root.classList.remove('is-playing','is-paused');
    onFinish({watched});
    const target=returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus:$('scene-name');
    target.focus({preventScroll:true});
  }
  function start(){
    if(!active||playing)return;
    playing=true;paused=false;lastTime=0;lastIndex=-1;timeline.reset();
    root.classList.add('is-playing');root.querySelector('.intro-title-card').hidden=true;
    root.querySelector('.intro-playback').hidden=false;
    $('intro-skip').hidden=false;$('intro-pause').hidden=false;
    renderBeat();syncPause();$('intro-pause').focus({preventScroll:true});
    raf=window.requestAnimationFrame(frame);
  }
  function open({replay=false,saved=hasSave}={}){
    if(active)return;
    returnFocus=document.activeElement===document.body?null:document.activeElement;
    active=true;playing=false;root.hidden=false;shell.inert=true;
    document.documentElement.classList.add('intro-open');
    root.classList.toggle('reduced-motion',motionReduced);root.dataset.shot='title';
    root.querySelector('.intro-title-card').hidden=false;root.querySelector('.intro-playback').hidden=true;
    $('intro-line').textContent='';$('intro-line-secondary').textContent='';
    $('intro-continue').hidden=!saved;
    $('intro-start').className=saved?'secondary-button':'primary-button';
    $('intro-continue').className='primary-button';
    $('intro-start').firstChild.textContent=replay||saved?'Смотреть вступление ':'Завести мотор ';
    $('intro-skip').hidden=true;$('intro-pause').hidden=true;
    renderSound();(saved?$('intro-continue'):$('intro-start')).focus({preventScroll:true});
  }
  $('intro-start').addEventListener('click',start);
  $('intro-continue').addEventListener('click',finish);
  $('intro-skip').addEventListener('click',finish);
  $('intro-pause').addEventListener('click',()=>{paused=!paused;syncPause();});
  $('intro-sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;renderSound();syncPause();onSoundChange(soundEnabled);});
  document.addEventListener('visibilitychange',()=>{if(active)syncPause();});
  window.addEventListener('pagehide',()=>{score.stop();window.cancelAnimationFrame(raf);});
  window.addEventListener('pageshow',event=>{
    if(event.persisted&&playing){syncPause();raf=window.requestAnimationFrame(frame);}
  });
  document.addEventListener('keydown',event=>{
    if(!active)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish();return;}
    if(event.key==='Tab'){
      const focusable=[...root.querySelectorAll('button')].filter(button=>!button.hidden&&button.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    if(event.target.tagName!=='BUTTON'&&[' ','Enter'].includes(event.key)){
      event.preventDefault();if(!playing)start();else{paused=!paused;syncPause();}
    }
    // Game shortcuts must never act through an intro overlay.
    event.stopImmediatePropagation();
  },true);
  return {
    open,isOpen:()=>active,isPlaying:()=>playing,
    setSound(value){soundEnabled=value;renderSound();syncPause();},
    setReduced(value){motionReduced=value;root.classList.toggle('reduced-motion',value);}
  };
}
