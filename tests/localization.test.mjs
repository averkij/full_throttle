import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {t,itemCount,messages} from '../src/ru.js';
import {ITEMS,SCENES,newGame,interact,choose,travel,validateSave,objective,hint,quests,chapter,objects} from '../src/engine.js';

test('Every authored English quest sentence has a Russian translation',async()=>{
  const source=await readFile(new URL('../src/engine.js',import.meta.url),'utf8');
  const quoted=[...source.matchAll(/'((?:\\.|[^'\\])*)'/g)].map(m=>m[1]);
  const display=quoted.filter(s=>/[A-Za-z]/.test(s)&&s.includes(' ')&&s.trim()===s);
  const missing=[...new Set(display.filter(s=>t(s)===s))];
  assert.deepEqual(missing,[],'Untranslated engine text');
  assert.ok(Object.keys(messages).length>250);
});
test('Items, locations, speakers, hotspots, chapters, journal and goals are localized',()=>{
  const translated=s=>{assert.match(t(s),/[А-Яа-яЁё]/u,s);};
  Object.values(ITEMS).forEach(i=>{translated(i.name);translated(i.description);});
  Object.values(SCENES).forEach(s=>['name','short','coordinate','description','arrival'].forEach(key=>translated(s[key])));
  ['BEN','MO','GUARD','BARTENDER','TERMINAL'].forEach(translated);
  const s=newGame();s.flags.workshopUnlocked=true;s.flags.repaired=true;
  for(const location of Object.keys(SCENES)){s.scene=location;objects(s).forEach(o=>translated(o.name));}
  s.journal.forEach(translated);quests(s).forEach(([text])=>translated(text));translated(objective(s));translated(chapter(s)[1]);
  for(let i=0;i<3;i++)translated(hint(s,i));
});
test('Dynamic feedback, item awards and inflected item counts are fully Russian',()=>{
  for(const item of Object.values(ITEMS)){
    assert.equal(t(item.name+' added to your pockets'),'В инвентаре: '+t(item.name));
    assert.doesNotMatch(t('The '+item.name.toLowerCase()+' won’t help with that.'),/[A-Za-z]/);
  }
  const repair='She needs straight front forks, gasoline, the axle tightened with a wrench. Use the parts from your pockets on the bike.';
  assert.doesNotMatch(t(repair),/[A-Za-z]/);
  assert.doesNotMatch(t('Before I transmit, I need to load the evidence photos and Corley’s recorded will. Select each item, then use it on the terminal.'),/[A-Za-z]/);
  assert.equal(itemCount(1),'1 предмет');assert.equal(itemCount(2),'2 предмета');assert.equal(itemCount(11),'11 предметов');assert.equal(itemCount(21),'21 предмет');
});
test('Existing English saves stay unchanged and display a Russian journal',()=>{
  const s=newGame();interact(s,'dumpster','kick');choose(s,'hose');interact(s,'bike','use','keys');choose(s,'wrench');
  const json=JSON.stringify(s),restored=validateSave(JSON.parse(json));
  assert.equal(JSON.stringify(restored),json);
  restored.journal.forEach(line=>assert.match(t(line),/[А-Яа-яЁё]/));
  assert.equal(restored.scene,'garage');assert.ok(restored.inventory.includes('wrench'));
  assert.match(t(travel(restored,'yard').text),/хлама/);
});
test('Russian page declares its language and provides fullscreen and accessible controls',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<html lang="ru">/);assert.match(html,/id="fullscreen-button"/);assert.match(html,/aria-label="На весь экран"/);
  assert.match(html,/БАЙК ОБРЕЧЕННЫЙ/);assert.match(html,/Говорить/);assert.match(html,/192" height="208/);
  assert.doesNotMatch(html,/Show hotspots|Your pockets|The Kickstand|My gang is gone/);
});
