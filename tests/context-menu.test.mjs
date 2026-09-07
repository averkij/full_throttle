import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContextMenu, objectActions, menuPosition} from '../src/context-menu.js';
import {newGame, interact, objects} from '../src/engine.js';
import {GARAGE_RADIO, fitProp} from '../src/scene-layout.js';

function fixture() {
  let document;
  class Element {
    constructor() {this.events={};this.attributes={};this.children=[];this.dataset={};this.style={};this.isConnected=true;}
    addEventListener(name, callback) {(this.events[name] ||= []).push(callback);}
    emit(name, values={}) {
      const event={target:this,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=true;},...values};
      for(const callback of this.events[name] || [])callback(event);
      return event;
    }
    setAttribute(name,value) {this.attributes[name]=value;}
    getAttribute(name) {return this.attributes[name];}
    append(...children) {this.children.push(...children);children.forEach(child=>child.parent=this);}
    replaceChildren() {this.children=[];}
    closest() {return this.dataset.object?this:this.parent?.closest();}
    contains(element) {return element===this || this.children.some(child=>child.contains(element));}
    focus() {document.activeElement=this;document.emit('focusin',{target:this});}
    getBoundingClientRect() {return {left:250,top:180,width:244,height:240};}
  }
  document=new Element();document.body=new Element();document.createElement=()=>new Element();
  const window=new Element();window.innerWidth=320;window.innerHeight=480;
  let timer;window.setTimeout=fn=>{timer=fn;return 1;};window.clearTimeout=()=>{timer=null;};
  const layer=new Element(),target=new Element();target.dataset.object='dumpster';target.setAttribute('aria-label','Контейнер');layer.append(target);
  const state=newGame(),actions=[];
  const controller=createContextMenu({document,window,layer,makeIcon:()=>new Element(),getActions:id=>objectActions(id),onAction:(id,action)=>{actions.push(action);interact(state,id,action.verb,action.item);}});
  return {document,window,layer,target,state,actions,controller,menu:document.body.children[0],hold(){timer?.();}};
}

test('Right click opens without taking a turn; one chosen action operates on that exact object',()=>{
  const f=fixture(),before=JSON.stringify(f.state);
  const event=f.layer.emit('contextmenu',{target:f.target,clientX:310,clientY:460});
  assert.ok(event.prevented);assert.ok(f.controller.isOpen());assert.equal(JSON.stringify(f.state),before);
  assert.equal(f.menu.style.left,'68px');assert.equal(f.menu.style.top,'232px');
  assert.equal(f.target.getAttribute('aria-expanded'),'true');
  f.menu.children.find(el=>el.children[1]?.textContent==='Пнуть').emit('click');
  assert.equal(f.actions.length,1);assert.ok(f.state.inventory.includes('keys'));
  assert.equal(f.controller.isOpen(),false);assert.equal(f.document.activeElement,f.target);
});

test('Keyboard opens menu, wraps through actions and Escape returns focus without acting',()=>{
  const f=fixture();f.layer.emit('keydown',{target:f.target,key:'F10',shiftKey:true});
  const first=f.document.activeElement;
  f.menu.emit('keydown',{key:'ArrowUp'});assert.equal(f.document.activeElement,f.menu.children.at(-1));
  f.menu.emit('keydown',{key:'ArrowDown'});assert.equal(f.document.activeElement,first);
  f.menu.emit('keydown',{key:'End'});assert.equal(f.document.activeElement,f.menu.children.at(-1));
  f.menu.emit('keydown',{key:'Home'});assert.equal(f.document.activeElement,first);
  const escape=f.menu.emit('keydown',{key:'Escape'});
  assert.ok(escape.prevented);assert.ok(escape.stopped);assert.equal(f.controller.isOpen(),false);
  assert.equal(f.document.activeElement,f.target);assert.equal(f.actions.length,0);
});

test('Outside click, resize, fullscreen change and scene refresh dismiss stale menus',()=>{
  for(const dismiss of [f=>f.document.emit('pointerdown',{target:f.document.body}),f=>f.window.emit('resize'),f=>f.document.emit('fullscreenchange'),f=>f.controller.close()]){
    const f=fixture();f.layer.emit('contextmenu',{target:f.target,clientX:150,clientY:150});dismiss(f);
    assert.equal(f.controller.isOpen(),false);assert.equal(f.actions.length,0);
  }
});

test('Long press opens actions and suppresses the release click, while scrolling cancels it',()=>{
  const f=fixture();const touch={target:f.target,pointerType:'touch',isPrimary:true,clientX:80,clientY:100};
  f.layer.emit('pointerdown',touch);f.hold();assert.ok(f.controller.isOpen());
  const click=f.layer.emit('click',{target:f.target});assert.ok(click.prevented);assert.ok(click.stopped);
  f.controller.close();f.layer.emit('pointerdown',touch);f.layer.emit('pointermove',{clientX:100,clientY:100});f.hold();
  assert.equal(f.controller.isOpen(),false);assert.equal(f.actions.length,0);
});

test('Menu offers contextual take/talk/listen and keeps inventory use separate from bare use',()=>{
  assert.equal(objectActions('mo')[1].verb,'talk');
  assert.equal(objectActions('can')[1].label,'Взять');
  assert.equal(objectActions('radio')[1].label,'Послушать');
  const actions=objectActions('bike',{id:'wrench',name:'Гаечный ключ'});
  assert.equal(actions[0].item,'wrench');assert.equal(actions[0].label,'Применить: Гаечный ключ');
  assert.equal(actions.find(a=>a.verb==='use'&&!a.item).item,undefined);
  assert.deepEqual(menuPosition(-20,-30,244,240,320,480),{left:8,top:8});
});

test('Radio image stays inside its shared workbench hitbox at normal and fullscreen aspect ratios',()=>{
  const state=newGame();state.scene='garage';
  const radio=objects(state).find(obj=>obj.id==='radio');
  assert.deepEqual({x:radio.x,y:radio.y,w:radio.w,h:radio.h},GARAGE_RADIO);
  assert.ok(radio.x+radio.w<60,'Radio must not cover the doorway at 75%');
  for(const stretch of [.6,1,1.4,2.5]){
    const image=fitProp([89,6,1364,1006],GARAGE_RADIO,stretch);
    assert.ok(image.x>=radio.x*7.68);assert.ok(image.x+image.w<=(radio.x+radio.w)*7.68+.001);
    assert.ok(image.y>=radio.y*5.12-.001);assert.ok(Math.abs(image.y+image.h-(radio.y+radio.h)*5.12)<.001);
    assert.ok(Math.abs(image.w*stretch/image.h-1364/1006)<.001);
  }
});

test('Footer has no orphaned listeners, and optional reference entries stay out of the game menu',async()=>{
  const [html,game]=await Promise.all(['index.html','src/game.js'].map(path=>readFile(new URL('../'+path,import.meta.url),'utf8')));
  assert.doesNotMatch(html,/<footer|footer-save|about-button/);
  assert.doesNotMatch(game,/footer-save|about-button/);
  assert.doesNotMatch(game,/data-action="(?:about|controls|voices)"/);
});
