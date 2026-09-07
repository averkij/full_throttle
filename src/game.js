import { ITEMS,SCENES,SETTINGS_KEY,newGame,loadGame,saveGame,validateSave,objective,accessible,objects,travel,interact,conversation,choose,submitCode,hint,quests } from './engine.js';
import { icon,drawItem,drawPortrait,createRenderer,artworkReady } from './art.js';
import { t } from './ru.js';
import { createFullscreenController } from './fullscreen.js';
import { createContextMenu, objectActions } from './context-menu.js';
import { installDebugMode } from './debug-mode.js';
import { VOICE_SAMPLES } from './voice-samples.js';
import { createVoicePlayer } from './voice-player.js';
import { openingNarration,restoredNarration } from './narration.js';
import { createIntro } from './intro.js';
import { createInventoryCursor,drawInventoryCursor } from './inventory-cursor.js';


const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage;
try {storage=window.localStorage;} catch {storage={getItem(){throw new Error('Storage unavailable');},setItem(){throw new Error('Storage unavailable');}};}
const loaded=loadGame(storage);
let state=loaded.state,verb='look',selected=null,hotspotsVisible=false,saveBlocked=!!loaded.error,toastTimer,captionTimer,hintLevel=0,lastHint='',lastFocus=null;
let settings={sound:false,voices:true,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
try {const saved=JSON.parse(storage.getItem(SETTINGS_KEY));if(saved&&typeof saved==='object')for(const key of Object.keys(settings))if(typeof saved[key]==='boolean')settings[key]=saved[key];}catch{}
let audioContext,master,audioTimer,audioStep=0,intro,openingPending=!loaded.restored;
const speech=createVoicePlayer({samples:VOICE_SAMPLES,heardSpeech:state.heardSpeech,onHeard:id=>{state.heardSpeech.push(id);save();},onChange:renderSpeech,onError:()=>toast('Не удалось воспроизвести реплику. Нажмите ещё раз, чтобы повторить.')});
speech.setEnabled(settings.sound&&settings.voices);

document.querySelectorAll('[data-icon]').forEach(el=>el.replaceChildren(icon(el.dataset.icon)));
const renderer=createRenderer($('scene-canvas'),()=>state);
const itemCursor=createInventoryCursor({
  layer:$('hotspots'),ready:artworkReady,
  makeCursor:id=>drawInventoryCursor(id,{makeCanvas:()=>document.createElement('canvas'),drawItem})
});
renderer.setReduced(settings.reducedMotion);
document.documentElement.classList.toggle('reduced-motion',settings.reducedMotion);
const fullscreen=createFullscreenController(document,active=>{
  const button=$('fullscreen-button');
  button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-label',active?'Выйти из полноэкранного режима':'На весь экран');
  button.title=active?'Выйти из полноэкранного режима (F / Esc)':'На весь экран (F)';
  button.replaceChildren(icon(active?'collapse':'expand'));
});

const contextMenu=createContextMenu({
  document,window,layer:$('hotspots'),makeIcon:icon,
  resolveTarget:event=>{const id=pickObject(event);return id?$('hotspots').querySelector('[data-object="'+id+'"]'):null;},
  onTargetChange:setHighlight,
  getActions:id=>objectActions(id,selected?{id:selected,name:t(ITEMS[selected].name)}:null),
  onAction:(id,action)=>{
    const obj=objects(state).find(object=>object.id===id);
    if(!obj)return;
    verb=action.verb;selected=action.item||null;
    const bounds=renderer.objectBounds(id)||obj;
    renderer.walkTo(bounds.x+bounds.w/2);hideCaption();
    apply(interact(state,id,verb,selected));
    $('hotspots').querySelector('[data-object="'+id+'"]')?.focus({preventScroll:true});
  }
});

const debugMode=installDebugMode({
  document,scene:$('scene'),button:$('hotspot-button'),
  onChange:enabled=>{
    hotspotsVisible=false;$('scene').classList.remove('show-hotspots');
    $('hotspot-button').setAttribute('aria-pressed','false');
    toast(enabled?'Режим отладки включён':'Режим отладки выключен');
  }
});

function persistSettings(){try{storage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}}
function playTone(frequency,duration=.12,type='triangle',volume=.06,delay=0){
  if(!audioContext||!settings.sound||audioContext.state!=='running')return;
  const osc=audioContext.createOscillator(),gain=audioContext.createGain(),start=audioContext.currentTime+delay;
  osc.type=type;osc.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+duration+.03);osc.onended=()=>{osc.disconnect();gain.disconnect();};
}
function musicTick(){
  if(document.hidden||!settings.sound||intro?.isOpen())return;
  const notes=[82.41,82.41,98,82.41,110,98,73.42,65.41];
  playTone(notes[audioStep%notes.length],.37,'triangle',.055);
  if(audioStep%4===0)playTone(notes[audioStep%notes.length]*2,.7,'sine',.018);
  audioStep++;
}
async function setAudio(on){
  settings.sound=on;speech.setEnabled(on&&settings.voices);intro?.setSound(on);
  try {
    if(on){audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(!master){master=audioContext.createGain();master.gain.value=speech.snapshot().active ? .18 : .6;master.connect(audioContext.destination);}await audioContext.resume();}
    if(settings.sound!==on)return;
    clearInterval(audioTimer);if(on){musicTick();audioTimer=setInterval(musicTick,430);}else if(audioContext)await audioContext.suspend();
    persistSettings();renderAudio();renderSpeech(speech.snapshot());
  }catch{settings.sound=false;speech.setEnabled(false);intro?.setSound(false);renderAudio();toast('Звук недоступен в этом браузере. Но дорога по-прежнему открыта.');}
}
function renderAudio(){const button=$('audio-button');button.replaceChildren(icon(settings.sound?'sound':'muted'));button.setAttribute('aria-pressed',String(settings.sound));button.setAttribute('aria-label',settings.sound?'Выключить звук':'Включить звук');button.title=settings.sound?'Выключить звук':'Включить звук';}
function renderSpeech(status){
  const button=$('voice-replay');
  button.hidden=!status.current;
  const active=!!status.current&&status.active===status.current;
  button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-label',active?'Остановить реплику':'Прослушать реплику');
  button.title=active?'Остановить реплику':'Прослушать реплику';
  button.replaceChildren(active?document.createTextNode('■'):icon('sound'));
  if(master&&audioContext?.state==='running'){
    master.gain.cancelScheduledValues(audioContext.currentTime);
    master.gain.setTargetAtTime(status.active ? .18 : .6,audioContext.currentTime,.12);
  }
}
function playVoice(){
  if(speech.snapshot().active===speech.snapshot().current){speech.stop();return;}
  settings.voices=true;void setAudio(true);
  void speech.playCurrent();
}
function sound(kind){
  const effectsGain=1.5;
  if(kind==='engine'){[55,73,98,110,146].forEach((n,i)=>playTone(n,.2,'sawtooth',.04*effectsGain,i*.12));}
  else if(kind==='victory'){[164.81,196,220,293.66,329.63].forEach((n,i)=>playTone(n,.6,'triangle',.09*effectsGain,i*.17));}
  else playTone(kind==='item'?440:165,.08,'triangle',.04*effectsGain);
}
function toast(text){clearTimeout(toastTimer);$('scene-toast').textContent=t(text);$('scene-toast').classList.add('visible');toastTimer=setTimeout(()=>$('scene-toast').classList.remove('visible'),4200);}
function save(){
  if(saveBlocked){$('save-status').textContent='Прежнее сохранение защищено · см. меню';return false;}
  const success=saveGame(storage,state);
  $('save-status').innerHTML=success?'<i></i> Прогресс сохранён': 'Ошибка сохранения · экспорт через меню';
  return success;
}
function setVerb(next){contextMenu.close();verb=next;selected=null;renderControls();updateHover();sound('click');}
function scenePoint(event){
  const bounds=$('scene').getBoundingClientRect();
  return {x:(event.clientX-bounds.left)/bounds.width*768,y:(event.clientY-bounds.top)/bounds.height*512};
}
function pickObject(event){const p=scenePoint(event);return renderer.pickObject(p.x,p.y);}
function setHighlight(id){
  renderer.setHighlight(id);
  itemCursor.hover(!!id);
  for(const button of $('hotspots').querySelectorAll('[data-object]'))button.classList.toggle('is-highlighted',button.dataset.object===id);
  const object=objects(state).find(obj=>obj.id===id);updateHover(object?.name||'');
}
function syncHitboxes(){
  const scene=$('scene').getBoundingClientRect();
  for(const button of $('hotspots').querySelectorAll('[data-object]')){
    const box=renderer.objectBounds(button.dataset.object);if(!box)continue;
    button.style.left=box.x+'%';button.style.top=box.y+'%';button.style.width=box.w+'%';button.style.height=box.h+'%';
    const left=box.x/100*scene.width,width=box.w/100*scene.width,half=Math.min(120,scene.width/2-12);
    const center=Math.max(half+10,Math.min(left+width/2,scene.width-half-10));
    button.style.setProperty('--label-x',((center-left)/width*100)+'%');
    button.style.setProperty('--label-y',Math.max(0,62-box.y/100*scene.height)+'px');
  }
}
function activateObject(event,keyboardId=null){
  const id=event.detail===0?keyboardId:pickObject(event);
  const obj=objects(state).find(object=>object.id===id);
  hideCaption();
  if(!obj){if(event.detail!==0)renderer.walkTo(scenePoint(event).x/7.68);return;}
  const box=renderer.objectBounds(id)||obj;
  renderer.walkTo(box.x+box.w/2);apply(interact(state,id,verb,selected));
}
function updateHover(name=''){const action={look:'Осмотреть',use:'Использовать / взять',talk:'Поговорить',kick:'Пнуть'}[verb];$('hover-label').textContent=selected?`${t(ITEMS[selected].name)} → ${name?t(name):'выберите цель'}`:name?`${action}: ${t(name)}`:'Выберите объект';}
function renderControls(){
  itemCursor.select(selected);
  document.querySelectorAll('[data-verb]').forEach(button=>{const active=button.dataset.verb===verb&&!selected;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  const inventory=$('inventory');inventory.replaceChildren();
  if(!state.inventory.length){inventory.innerHTML='<div class="inventory-empty"><span class="empty-slot">+</span><span>Пока пусто. Всё нужное найдётся по дороге.</span></div>';return;}
  for(const id of state.inventory){const button=document.createElement('button');button.className='inventory-item';button.classList.toggle('selected',selected===id);button.setAttribute('aria-pressed',String(selected===id));button.setAttribute('aria-label',`Использовать: ${t(ITEMS[id].name)}`);button.title=`${t(ITEMS[id].name)} — ${t(ITEMS[id].description)}`;const canvas=document.createElement('canvas');canvas.width=120;canvas.height=108;canvas.setAttribute('aria-hidden','true');drawItem(canvas,id);button.append(canvas);
    button.addEventListener('click',()=>{selected=selected===id?null:id;verb='use';renderControls();updateHover();if(selected)dialogue({text:ITEMS[id].description,speaker:'BEN'});sound('click');});
    button.addEventListener('mouseenter',()=>{$('hover-label').textContent=t(ITEMS[id].description);});button.addEventListener('mouseleave',()=>updateHover());inventory.append(button);}
}
function renderScene(){
  contextMenu.close();
  const data=SCENES[state.scene];
  $('scene-name').textContent=t(data.name);
  $('objective-text').textContent=t(objective(state));
  const layer=$('hotspots');layer.replaceChildren();
  for(const obj of objects(state)){
    const button=document.createElement('button');button.className='hotspot';button.dataset.object=obj.id;button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');button.setAttribute('aria-keyshortcuts','Shift+F10');button.style.left=`${obj.x}%`;button.style.top=`${obj.y}%`;button.style.width=`${obj.w}%`;button.style.height=`${obj.h}%`;button.setAttribute('aria-label',t(obj.name));button.innerHTML=`<span class="hotspot-dot" aria-hidden="true"></span><span class="hotspot-label">${escape(t(obj.name))}</span>`;
    button.addEventListener('focus',()=>setHighlight(obj.id));
    button.addEventListener('blur',()=>{if(!contextMenu.isOpen())setHighlight(null);});
    button.addEventListener('click',event=>activateObject(event,obj.id));layer.append(button);
  }
  syncHitboxes();
  const edges=$('travel-edges');edges.replaceChildren();
  const destination=state.scene==='kickstand'?'garage':state.scene==='garage'?'yard':state.scene==='yard'?'garage':'kickstand';
  if(accessible(state,destination)){const button=document.createElement('button');button.className='travel-link';button.textContent=t(SCENES[destination].name);button.append(icon('arrow'));button.addEventListener('click',()=>go(destination));edges.append(button);}
  renderControls();
}
function dialogue(result,{autoplay=true}={}){
  $('dialogue-text').textContent=t(result.text);$('speaker').textContent=t(result.speaker||'BEN');drawPortrait($('portrait-canvas'),result.speaker);
  const choices=$('dialogue-choices');choices.replaceChildren();
  for(const choice of result.choices||[]){const button=document.createElement('button');button.className='dialogue-choice';button.textContent=t(choice.label);button.addEventListener('click',()=>{hideCaption();apply(choose(state,choice.id));});choices.append(button);}
  $('dialogue-text').parentElement.scrollTop=0;
  speech.setLine(result.speaker||'BEN',t(result.text),{autoplay});
}
function apply(result){
  if(selected&&!state.inventory.includes(selected))selected=null;
  renderScene();dialogue(result);save();updateHover();
  if(result.toast){toast(result.toast);sound('item');}
  if(result.sound)sound(result.sound);
  if(result.moved){selected=null;renderControls();$('scene').classList.remove('changing');void $('scene').offsetWidth;$('scene').classList.add('changing');}
  if(result.modal==='keypad')openKeypad(true);
  if(result.won)openEnding(true);
}
function go(destination){closeModal();hideCaption();selected=null;apply(travel(state,destination));}
function hideCaption(){clearTimeout(captionTimer);$('scene-caption').classList.add('hidden');}
function toggleHotspots(){if(!debugMode.enabled())return;hotspotsVisible=!hotspotsVisible;$('scene').classList.toggle('show-hotspots',hotspotsVisible);$('hotspot-button').setAttribute('aria-pressed',String(hotspotsVisible));}

function openModal(content,eyebrow='FULL THROTTLE',keepSpeech=false){if(!keepSpeech)speech.stop();contextMenu.close();if(!$('modal').open)lastFocus=document.activeElement;$('modal-eyebrow').textContent=eyebrow;$('modal-body').innerHTML=content;if(!$('modal').open)$('modal').showModal();$('modal').scrollTop=0;}
function closeModal(){speech.stop();if($('modal').open)$('modal').close();}
$('modal').addEventListener('close',()=>{speech.stopPreview();if(lastFocus?.isConnected)lastFocus.focus();});
$('modal').addEventListener('click',event=>{if(event.target===$('modal')){const r=$('modal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});
function openMap(){openModal(`<h2 id="modal-title">Выбирай дорогу.</h2><p class="modal-intro">${state.flags.workshopUnlocked?'Несколько километров пустыни. Неприятностей хватит на всех.':'Ключи всё ещё у «Кикстэнда». Найди их, чтобы отправиться в путь.'}</p><div class="map-locations">${Object.entries(SCENES).map(([id,data])=>`<button class="map-card ${id===state.scene?'active':''}" data-travel="${id}" ${!accessible(state,id)?'disabled':''}><span class="map-thumbnail" style="background-position:${data.x*100}% ${data.y*100}%"></span><span class="map-card-body"><strong>${escape(t(data.name))}</strong><small>${id===state.scene?'ВЫ ЗДЕСЬ':!accessible(state,id)?id==='corley'?'СНАЧАЛА ПОЧИНИ БАЙК':'СНАЧАЛА НАЙДИ КЛЮЧИ':state.visited.includes(id)?'ВЕРНУТЬСЯ':'ОТПРАВИТЬСЯ'}</small></span></button>`).join('')}</div><p class="notice">${state.flags.workshopUnlocked&&!state.flags.repaired?'До бара, гаража и свалки можно дойти пешком. До завода Корли нужен исправный байк.':'Все предметы и прогресс останутся с тобой.'}</p>`,'СТАРОЕ ШОССЕ № 9 · КАРТА');}
function openJournal(){openModal(`<h2 id="modal-title">Дорожные заметки.</h2><p class="modal-intro">${escape(t(objective(state)))}</p><ul class="journal-quests">${quests(state).map(([text,done])=>`<li class="${done?'completed':''}"><span class="quest-check">${done?'✓':''}</span>${escape(t(text))}</li>`).join('')}</ul><h3>Как всё было</h3><div class="journal-log">${state.journal.map(line=>`<p>${escape(t(line))}</p>`).join('')}</div>`,'ЖУРНАЛ БЕНА');}
function openHint(){
  const current=objective(state);if(current!==lastHint){hintLevel=0;lastHint=current;}
  state.hints++;save();
  openModal(`<h2 id="modal-title">Совет с обочины.</h2><span class="hint-level">ПОДСКАЗКА ${hintLevel+1} ИЗ 3 · ${['НАМЁК','НАПРАВЛЕНИЕ','РЕШЕНИЕ'][hintLevel]}</span><p class="hint-content">${escape(t(hint(state,hintLevel)))}</p><div class="modal-actions">${hintLevel<2?'<button class="secondary-button" data-action="more-hint">Можно поконкретнее →</button>':''}<button class="primary-button" data-action="close">Понял. Вернёмся к делу.</button></div>`,'СПРОСИТЬ — НЕ ЗАЗОРНО');
}
function openMenu(){openModal(`<h2 id="modal-title">Переведи дух.</h2><p class="modal-intro">${escape(t(objective(state)))}</p><div class="modal-actions"><button class="primary-button" data-action="close">Продолжить поездку →</button><button class="secondary-button" data-action="save">Сохранить сейчас</button><button class="secondary-button" data-action="export">Экспорт сохранения</button><button class="secondary-button" data-action="import">Импорт сохранения</button><button class="secondary-button" data-action="intro">Посмотреть вступление</button><button class="secondary-button" data-action="restart">Начать новую поездку</button>${state.flags.won?'<button class="secondary-button" data-action="ending">Посмотреть финал ещё раз</button>':''}</div><label class="setting-row"><span>Звук игры<small>Музыка, эффекты и голоса</small></span><input type="checkbox" id="sound-setting" ${settings.sound?'checked':''}></label><label class="setting-row"><span>Речь персонажей<small>Новые реплики звучат один раз; повтор — кнопкой динамика</small></span><input type="checkbox" id="voice-setting" ${settings.voices?'checked':'' }></label><label class="setting-row"><span>Уменьшить движение<small>Без пыли; вступление листается кнопкой «Дальше»</small></span><input type="checkbox" id="motion-setting" ${settings.reducedMotion?'checked':''}></label><p class="notice">${loaded.error&&saveBlocked?escape(t(loaded.error)):'Автосохранение хранится в этом браузере. Экспортируй его перед очисткой данных или переходом на другое устройство, браузер или адрес сайта.'}</p>`,'ПРИВАЛ');}
function openControls(){openModal('<h2 id="modal-title">Меньше разговоров.<br>Больше газа.</h2><p class="modal-intro">Ты — Бен, вожак «Хорьков». Кто-то испортил твой байк и подставил банду. Исследуй четыре локации, почини мотоцикл и выведи правду на большой экран завода Корли.</p><dl class="controls-list"><dt>Правая кнопка мыши</dt><dd>Нажми на человека или предмет правой кнопкой: рядом появятся действия. Выбери «Поговорить», «Взять», «Осмотреть» или «Пнуть». Выбранный предмет из кармана тоже появится в меню.</dd><dt>Удержание / Shift + F10</dt><dd>На сенсорном экране удерживай объект. С клавиатуры: Tab до объекта, Shift + F10 — меню, стрелки — выбор, Enter — действие, Esc — закрыть.</dd><dt>1 · Осмотр</dt><dd>Осматривай людей и предметы в поисках зацепок.</dd><dt>2 · Действие</dt><dd>Бери предметы, открывай двери и пользуйся механизмами.</dd><dt>3 · Говорить</dt><dd>Нажми на персонажа и выбери реплику.</dd><dt>4 · Пнуть</dt><dd>Когда заклинившему контейнеру нужен веский аргумент.</dd><dt>Инвентарь</dt><dd>Выбери предмет, затем нажми на его цель в сцене. Повторный щелчок по предмету или Esc снимает выбор.</dd><dt>F / Esc</dt><dd>Развернуть игру на весь экран / выйти. На устройствах без поддержки — режим без лишних панелей.</dd><dt>M / J / H</dt><dd>Открыть карту, журнал или подсказку. Работает и в русской раскладке.</dd><dt>Касание / Tab</dt><dd>Можно играть касаниями или с клавиатуры. Tab переключает объекты, Enter выполняет действие.</dd></dl><p class="notice">Таймеров и тупиков нет. Неверные сочетания не уничтожают предметы. Прогресс сохраняется автоматически.</p><button class="primary-button" data-action="close">Поехали →</button>','КАК ИГРАТЬ');}
function openAbout(){openModal('<h2 id="modal-title">Создано для дороги.</h2><p class="modal-intro">«Байк обреченный» — небольшое фанатское приключение по мотивам Full Throttle от LucasArts (1995). Играй за Бена, чини «Корли» вместе с Мо и разоблачи Рипбургера.</p><p class="modal-intro">Новый квест из четырёх локаций с собственными диалогами и головоломками, детальными сгенерированными персонажами, предметами и фонами. Музыка синтезируется в браузере. Реплики персонажей и терминала озвучены ИИ с постоянными голосами и собственной манерой речи. Записи воспроизводятся из локальных файлов. Файлы, записи и графика оригинальной игры не используются.</p><p class="modal-intro">Full Throttle и персонажи принадлежат правообладателям. Фанатский проект не связан с Lucasfilm, LucasArts или Double Fine. Полная оригинальная история доступна в официальном издании.</p><div class="about-links"><a href="https://www.doublefine.com/games/full-throttle-remastered" target="_blank" rel="noopener noreferrer">Официальная Full Throttle Remastered · Double Fine ↗</a><br><a href="https://www.doublefine.com/news/announcing-full-throttle-remastered" target="_blank" rel="noopener noreferrer">О графике и создании ремастера ↗</a></div><p class="notice">Шрифты Golos Text и Oswald распространяются по лицензии SIL OFL. После загрузки игра не требует аккаунта или подключения к сети.</p>','ОБ ЭТОЙ ПОЕЗДКЕ');}
function openKeypad(keepSpeech=false){openModal('<h2 id="modal-title">Служебный доступ.</h2><p class="modal-intro">«КОРЛИ МОТОРС» · СИСТЕМА ПРЕЗЕНТАЦИЙ<br>Введи четырёхзначный код доступа.</p><form id="keypad-form"><label class="eyebrow" for="service-code">КОД ДОСТУПА</label><p style="height:12px"></p><input class="code-input" id="service-code" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="off" placeholder="····" required aria-describedby="code-message"><p class="code-message" id="code-message" role="status"></p><button class="primary-button" type="submit" style="width:100%">Открыть терминал →</button></form>','ПРОМЫШЛЕННЫЕ СИСТЕМЫ КОРЛИ',keepSpeech);$('service-code').focus();}
function openEnding(keepSpeech=false){const minutes=Math.max(1,Math.round(((state.finishedAt||Date.now())-state.startedAt)/60000));openModal(`<h2 id="modal-title">Свободу не запереть<br>в клетке.</h2><div class="ending-art"></div><p class="modal-intro">На экране появляются снимки Миранды. Затем звучит голос Малкольма: он называет Морин своей наследницей. Идеальная ложь Рипбургера рассыпается на глазах у всех акционеров.</p><p class="modal-intro">С «Хорьков» сняты обвинения. Мо получает ключи от «Корли Моторс». На парковке ждёт банда, мерно рокочут двигатели. Мо кивает. Ты выкручиваешь ручку газа.</p><p class="hint-content">«Ты строй их, Мо.<br>А я буду на них ездить».</p><div class="ending-stats"><div class="ending-stat"><strong>4 / 4</strong>МЕСТА ИССЛЕДОВАНЫ</div><div class="ending-stat"><strong>${minutes} МИН</strong>В ДОРОГЕ</div><div class="ending-stat"><strong>${state.hints}</strong>ПОДСКАЗОК</div></div><div class="modal-actions"><button class="primary-button" data-action="close">Остаться ещё ненадолго →</button><button class="secondary-button" data-action="restart">Проехать заново</button></div>`,'КОНЕЦ · ДОРОГА ПРОДОЛЖАЕТСЯ',keepSpeech);}
function confirmRestart(){openModal('<h2 id="modal-title">Полный бак.<br>Новое начало.</h2><p class="modal-intro">Текущее автосохранение будет заменено, а игра начнётся у «Кикстэнда». Если хочешь оставить эту поездку, сначала экспортируй сохранение.</p><div class="modal-actions"><button class="secondary-button" data-action="export">Сначала экспортировать сохранение</button><button class="primary-button" data-action="confirm-restart">Начать новую поездку</button><button class="secondary-button" data-action="menu">Продолжить текущую поездку</button></div>','НОВАЯ ИГРА');}
function restart(){openingPending=true;state=newGame();speech.setHeardSpeech(state.heardSpeech);selected=null;verb='look';saveBlocked=false;hintLevel=0;lastHint='';closeModal();renderScene();dialogue({speaker:'BEN',text:openingNarration},{autoplay:false});save();hideCaption();intro.open({saved:false});}
function exportSave(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`full-throttle-save-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Сохранение экспортировано. Спрячь его в надёжном месте.');}
function importSave(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;try{if(file.size>128000)throw new Error('Этот файл сохранения слишком большой.');const imported=validateSave(JSON.parse(await file.text()));state=imported;speech.setHeardSpeech(state.heardSpeech);selected=null;saveBlocked=false;closeModal();renderScene();dialogue({text:restoredNarration(state),speaker:'BEN'});hideCaption();save();toast('Сохранение загружено. С возвращением, «Хорёк».');}catch(error){openModal(`<h2 id="modal-title">Это сохранение не завелось.</h2><p class="modal-intro">${escape(/[А-Яа-яЁё]/.test(t(error.message))?t(error.message):"Не удалось прочитать файл. Выберите корректное сохранение игры в формате JSON.")}</p><p class="notice">Твой текущий прогресс остался на месте.</p><button class="primary-button" data-action="menu">Вернуться в меню</button>`,'ОШИБКА ИМПОРТА');}});input.click();}

$('modal-body').addEventListener('click',event=>{
  const travelButton=event.target.closest('[data-travel]');if(travelButton){go(travelButton.dataset.travel);return;}
  const action=event.target.closest('[data-action]')?.dataset.action;
  const actions={close:closeModal,menu:openMenu,intro:()=>{closeModal();speech.stop();hideCaption();intro.open({replay:true,saved:true});},controls:openControls,about:openAbout,restart:confirmRestart,'confirm-restart':restart,export:exportSave,import:importSave,ending:openEnding,'more-hint':()=>{hintLevel=Math.min(2,hintLevel+1);openHint();},save:()=>{if(saveBlocked){toast('Прежний файл сохранён. Экспортируй эту поездку или начни новую, чтобы заменить его.');}else{toast(save()?'Прогресс сохранён. Байк будет ждать тебя здесь.':'Хранилище браузера недоступно. Экспортируйте сохранение в файл.');}}};
  if(action&&actions[action])actions[action]();
});
$('modal-body').addEventListener('change',event=>{if(event.target.id==='sound-setting')setAudio(event.target.checked);if(event.target.id==='voice-setting'){settings.voices=event.target.checked;speech.setEnabled(settings.sound&&settings.voices);persistSettings();}if(event.target.id==='motion-setting'){settings.reducedMotion=event.target.checked;renderer.setReduced(settings.reducedMotion);intro.setReduced(settings.reducedMotion);document.documentElement.classList.toggle('reduced-motion',settings.reducedMotion);persistSettings();}});
$('modal-body').addEventListener('submit',event=>{if(event.target.id!=='keypad-form')return;event.preventDefault();const result=submitCode(state,$('service-code').value);if(result.error){$('code-message').textContent=t(result.text);dialogue(result);save();$('service-code').select();}else{closeModal();apply(result);}});
document.querySelectorAll('[data-verb]').forEach(button=>button.addEventListener('click',()=>setVerb(button.dataset.verb)));
$('audio-button').addEventListener('click',()=>setAudio(!settings.sound));
$('voice-replay').addEventListener('click',()=>playVoice());
$('fullscreen-button').addEventListener('click',()=>fullscreen.toggle());
$('journal-button').addEventListener('click',openJournal);$('map-button').addEventListener('click',openMap);$('menu-button').addEventListener('click',openMenu);$('hint-button').addEventListener('click',openHint);$('close-modal').addEventListener('click',closeModal);$('hotspot-button').addEventListener('click',toggleHotspots);
$('hotspots').addEventListener('click',event=>{if(event.target===$('hotspots'))activateObject(event);});
$('hotspots').addEventListener('pointermove',event=>{
  if(contextMenu.isOpen())return;
  const id=pickObject(event);setHighlight(id);
});
$('hotspots').addEventListener('pointerleave',()=>{if(!contextMenu.isOpen())setHighlight(null);});
const hitboxObserver=new ResizeObserver(()=>{setHighlight(null);syncHitboxes();});
hitboxObserver.observe($('scene'));
document.addEventListener('keydown',event=>{
  if(intro?.isOpen()||contextMenu.isOpen())return;
  if(event.ctrlKey||event.metaKey||event.altKey||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
  if($('modal').open)return;
  if(event.key==='Escape'){if(fullscreen.isFallback())fullscreen.exit();selected=null;renderControls();updateHover();return;}
  const commands={'1':()=>setVerb('look'),'2':()=>setVerb('use'),'3':()=>setVerb('talk'),'4':()=>setVerb('kick'),'j':openJournal,'m':openMap,'h':openHint};
  const aliases={KeyJ:'j',KeyM:'m',KeyH:'h',KeyF:'f'};
  commands.f=()=>fullscreen.toggle();
  if(debugMode.enabled())commands[' ']=toggleHotspots;
  const command=commands[aliases[event.code]||event.key.toLowerCase()];if(command){event.preventDefault();command();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){speech.stop();if(audioContext?.state==='running')audioContext.suspend();}else if(settings.sound&&audioContext)audioContext.resume().catch(()=>{});});
window.addEventListener('pagehide',()=>{speech.stop();if(!saveBlocked)saveGame(storage,state);});
document.addEventListener('pointerdown',()=>{if(settings.sound&&!audioContext)setAudio(true);},{once:true});
renderScene();renderAudio();drawPortrait($('portrait-canvas'));
speech.setLine('BEN',$('dialogue-text').textContent,{autoplay:false});
if(loaded.restored){hideCaption();dialogue({text:restoredNarration(state),speaker:'BEN'},{autoplay:false});$('save-status').innerHTML='<i></i> Сохранённая игра загружена';}
else hideCaption();
if(loaded.error){$('save-status').textContent='Проблема с сохранением · см. меню';}

intro=createIntro({
  document,window,hasSave:loaded.restored,sound:settings.sound,reducedMotion:settings.reducedMotion,makeIcon:icon,
  onSoundChange:on=>void setAudio(on),
  onFinish:()=>{
    hideCaption();
    clearTimeout(toastTimer);$('scene-toast').classList.remove('visible');
    if(settings.sound)void setAudio(true);
    // Only the fresh opening can autoplay; replays preserve the current conversation.
    if(openingPending){
      openingPending=false;
      dialogue({speaker:'BEN',text:openingNarration});
    }
    syncHitboxes();
  }
});
$('scene-name').tabIndex=-1;
intro.open();
