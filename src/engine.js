import { GARAGE_RADIO } from './scene-layout.js';

// Pure game rules: the complete adventure can be played and tested without a DOM.
export const SAVE_KEY = 'full-throttle-dust-deception-v1';
export const SETTINGS_KEY = 'full-throttle-dust-settings-v1';
export const ITEMS = {
  keys: { name: 'Bike keys', description: 'My Corley keys. The only jewelry I need.' },
  hose: { name: 'Siphon hose', description: 'A length of rubber hose. Smells like the last decade.' },
  jerky: { name: 'Beef jerky', description: 'Biker food. Or a peace offering to something with bigger teeth.' },
  can: { name: 'Empty fuel can', description: 'Empty. An accurate summary of my fuel situation.' },
  fuel: { name: 'Full fuel can', description: 'A gallon of questionable gas. My bike is not a snob.' },
  wrench: { name: 'Wrench', description: 'Fits a front axle. Also most things that need persuading.' },
  magnet: { name: 'Pickup magnet', description: 'A strong magnet on a cable. For things my fingers cannot reach.' },
  forks: { name: 'Front forks', description: 'Straight Corley forks. Better than the pretzels on my bike.' },
  film: { name: 'Evidence photos', description: 'Miranda’s contact prints. Ripburger, Corley, and a very clear motive.' },
  tape: { name: 'Corley’s tape', description: 'Malcolm’s recorded will. He leaves the company to Maureen.' },
  fuse: { name: 'Spare fuse', description: 'A 20-amp industrial fuse. Small part, big responsibility.' }
};

export const SCENES = {
  kickstand: { name: 'The Kickstand', short: 'THE KICKSTAND', coordinate: 'MELONWEED OUTSKIRTS · 19:42', index: 0, x: 0, y: 0, description: 'A bar, a bad headache, and the start of trouble.', arrival: 'The Kickstand. Where the drinks are warm and the welcome is colder.', spawn: [61, 87] },
  garage: { name: 'Mo’s Garage', short: 'MO’S GARAGE', coordinate: 'MELONWEED · 20:16', index: 1, x: 1, y: 0, description: 'Good tools. Better company. Your only way back.', arrival: 'Mo’s garage. Smells like gasoline and second chances.', spawn: [42, 88] },
  yard: { name: 'The Salvage Yard', short: 'THE SALVAGE YARD', coordinate: 'OLD ROUTE 9 · 20:38', index: 2, x: 0, y: 1, description: 'Spare parts. Stale gas. Very sharp teeth.', arrival: 'One man’s scrap heap is another man’s way out of town.', spawn: [57, 89] },
  corley: { name: 'Corley Motors', short: 'CORLEY MOTORS', coordinate: 'CORLEY INDUSTRIAL PARK · 23:07', index: 3, x: 1, y: 1, description: 'The shareholders are waiting. So is the truth.', arrival: 'Ripburger has an audience. Time to give him something to talk about.', spawn: [45, 90] }
};

const flagNames = ['keysFound','workshopUnlocked','hoseTaken','jerkyTaken','canTaken','wrenchTaken','magnetTaken','fuseTaken','dogFed','hoseConnected','forksTaken','forksInstalled','fueled','tightened','repaired','filmClue','filmFound','tapeFound','cabinetOpen','powerOn','codeKnown','terminalUnlocked','filmLoaded','tapeLoaded','won'];
export const milestones = ['keysFound','workshopUnlocked','dogFed','forksTaken','hoseConnected','forksInstalled','fueled','tightened','filmFound','tapeFound','cabinetOpen','powerOn','terminalUnlocked','filmLoaded','tapeLoaded','won'];

export function newGame(now = Date.now()) {
  return { version: 1, scene: 'kickstand', inventory: [], flags: {}, visited: ['kickstand'], journal: ['Woke up behind the Kickstand. The Polecats have disappeared with a man named Ripburger. First: find my keys.'], heardSpeech: [], actions: 0, hints: 0, startedAt: now, savedAt: now, finishedAt: null };
}

export function validateSave(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== 1) throw new Error('This is not a compatible Dust & Deception save.');
  if (!Object.hasOwn(SCENES, raw.scene) || !Array.isArray(raw.inventory) || !raw.flags || typeof raw.flags !== 'object' || Array.isArray(raw.flags)) throw new Error('The save contains invalid game data.');
  if (raw.inventory.length > Object.keys(ITEMS).length || raw.inventory.some(id => !Object.hasOwn(ITEMS,id)) || new Set(raw.inventory).size !== raw.inventory.length) throw new Error('The save contains an invalid inventory.');
  if (!Array.isArray(raw.visited) || raw.visited.some(id => !Object.hasOwn(SCENES,id)) || !Array.isArray(raw.journal) || raw.journal.some(line => typeof line !== 'string' || line.length > 1000) || raw.journal.length > 100) throw new Error('The save contains invalid journal data.');
  if (raw.heardSpeech !== undefined && (!Array.isArray(raw.heardSpeech) || raw.heardSpeech.length > 512 || raw.heardSpeech.some(id => typeof id !== 'string' || id.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) || new Set(raw.heardSpeech).size !== raw.heardSpeech.length)) throw new Error('The save contains invalid speech history.');
  for (const [flag, value] of Object.entries(raw.flags)) if (!flagNames.includes(flag) || typeof value !== 'boolean') throw new Error('The save contains invalid quest flags.');
  for (const field of ['actions','hints','startedAt','savedAt']) if (!Number.isFinite(raw[field]) || raw[field] < 0) throw new Error('The save contains invalid progress data.');
  if (raw.finishedAt !== null && (!Number.isFinite(raw.finishedAt) || raw.finishedAt < raw.startedAt)) throw new Error('The save contains an invalid completion time.');
  if (raw.scene !== 'kickstand' && !raw.flags.workshopUnlocked) throw new Error('The save location does not match your progress.');
  if (raw.scene === 'corley' && !raw.flags.repaired) throw new Error('The save location does not match your bike repairs.');
  const result = newGame(raw.startedAt);
  for (const key of Object.keys(result)) if (key !== 'heardSpeech' || raw.heardSpeech !== undefined) result[key] = structuredClone(raw[key]);
  return result;
}

export function loadGame(storage) {
  try {
    const text = storage.getItem(SAVE_KEY);
    return text ? { state: validateSave(JSON.parse(text)), restored: true, error: null } : { state: newGame(), restored: false, error: null };
  } catch (error) { return { state: newGame(), restored: false, error: 'Your saved game could not be read. A new ride is ready; the previous save is kept until you choose to replace it.' }; }
}

export function saveGame(storage, state) {
  try { state.savedAt = Date.now(); storage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export function chapter(state) {
  if (state.flags.won) return ['04', 'THE ROAD GOES ON'];
  if (state.flags.filmFound && state.flags.tapeFound) return ['03', 'THE TRUTH HAS AN ENGINE'];
  if (state.flags.repaired) return ['02', 'DUST & DECEPTION'];
  return ['01', 'A RUDE AWAKENING'];
}

export function objective(s) {
  const f = s.flags;
  if (f.won) return 'The Polecats ride free. The road is yours.';
  if (!f.keysFound) return 'Find your keys. Find your gang.';
  if (!f.workshopUnlocked) return 'Get your motorcycle back on the road.';
  if (!f.repaired) return 'Repair the forks, fill the tank, tighten the axle.';
  if (!f.filmFound) return 'Find the photographer’s evidence.';
  if (!f.tapeFound) return 'Show Mo what really happened to her father.';
  if (!f.powerOn) return 'Restore power to Corley’s broadcast terminal.';
  if (!f.terminalUnlocked) return 'Find a way into the broadcast terminal.';
  if (!f.filmLoaded || !f.tapeLoaded) return 'Load the photos and Corley’s last will.';
  return 'Interrupt Ripburger’s speech. Let the truth ride.';
}

export function accessible(s, scene) {
  return Object.hasOwn(SCENES,scene) && (scene === 'kickstand' || (scene === 'corley' ? !!s.flags.repaired : !!s.flags.workshopUnlocked));
}

function note(s, line) { if (!s.journal.includes(line)) s.journal.push(line); }
function give(s, id) { if (!s.inventory.includes(id)) s.inventory.push(id); }
function take(s, id) { s.inventory = s.inventory.filter(i => i !== id); }
function say(text, speaker = 'BEN', extra = {}) { return { text, speaker, ...extra }; }
function award(s, flag, item, text, speaker = 'BEN') {
  s.flags[flag] = true;
  if (item) give(s, item);
  note(s, text);
  return say(text, speaker, { toast: item ? `${ITEMS[item].name} added to your pockets` : 'Journal updated' });
}

export function objects(s) {
  const f = s.flags;
  const object = (id,name,x,y,w,h) => ({id,name,x,y,w,h});
  if (s.scene === 'kickstand') return [
    object('dumpster','Dumpster',1,52,22,23),
    object('bar','Bar door',37,41,9,24),
    object('bartender','Bartender',45,50,10,27),
    object('sign','Kickstand sign',17,16,33,22),
    ...(!f.workshopUnlocked ? [object('bike','Ben’s motorcycle',68,62,24,27)] : [])
  ];
  if (s.scene === 'garage') return [
    object('mo','Maureen',60,48,10,30),
    object('bike','Ben’s motorcycle',40,62,24,28),
    object('workbench','Tool bench',29,43,23,19),
    ...(!f.canTaken ? [object('can','Empty fuel can',72,70,7,13)] : []),
    object('radio','Workshop radio',GARAGE_RADIO.x,GARAGE_RADIO.y,GARAGE_RADIO.w,GARAGE_RADIO.h)
  ];
  if (s.scene === 'yard') return [
    object('dog',f.dogFed ? 'Contented junkyard dog' : 'Junkyard dog',36,70,18,15),
    ...(!f.forksTaken ? [object('forks','Chrome front forks',31,49,14,28)] : []),
    object('pump',f.hoseConnected ? 'Pump with siphon hose' : 'Old fuel pump',87,44,12,32),
    object('wreck','Rusted car',6,43,27,31),
    object('shack','Watchman’s shack',71,29,19,30)
  ];
  return [
    object('terminal',f.terminalUnlocked ? 'Broadcast terminal' : 'Service terminal',8,54,10,20),
    object('plaque','Memorial plaque',28,33,16,16),
    object('guard','Night guard',20,54,10,28),
    object('cabinet',f.cabinetOpen ? 'Open power cabinet' : 'Power cabinet',62,56,13,24),
    object('factory','Shareholders’ meeting',29,10,15,15)
  ];
}

export function travel(s, destination) {
  if (!accessible(s,destination)) return say(destination === 'corley' ? 'Corley’s is fifty miles away. I need a working motorcycle first.' : 'I need my keys before I go wandering off. They have to be around here.');
  if (s.scene === destination) return say('Already here. Still not getting paid by the hour.');
  s.scene = destination;
  s.actions++;
  if (!s.visited.includes(destination)) s.visited.push(destination);
  return say(SCENES[destination].arrival, 'BEN', { moved: true });
}

function repair(s) {
  if (s.flags.forksInstalled && s.flags.fueled && s.flags.tightened && !s.flags.repaired) {
    s.flags.repaired = true;
    note(s,'The Corley lives. But the radio says Malcolm Corley is dead and the Polecats are wanted. Ripburger set us up. Need evidence.');
    return say('She’s running. But listen to that radio… Dad’s dead. They’re blaming your gang. Ripburger did this, Ben. Find something that proves it.', 'MO', { toast:'CHAPTER 02 · DUST & DECEPTION', sound:'engine' });
  }
  return null;
}

export function interact(s, target, verb = 'look', item = null) {
  if (!objects(s).some(o => o.id === target)) return say('That is not here anymore.');
  if (!['look','use','talk','kick'].includes(verb)) return say('One thing at a time.');
  if (item && !s.inventory.includes(item)) return say('I don’t have that.');
  s.actions++;
  const f = s.flags;
  if (item) return useItem(s,target,item);
  if (verb === 'talk') {
    if (target === 'bartender' || target === 'bar') return conversation(s,'bartender');
    if (target === 'mo') return conversation(s,'mo');
    if (target === 'guard') return conversation(s,'guard');
    if (target === 'dog') return say(f.dogFed ? 'He’s busy chewing. Best conversation I’ve had all day.' : 'Nice dog. Nice, incredibly unreasonable dog.');
    return say(({bike:'Come on, girl. We’ve got miles left in us.',pump:'I asked for regular. It’s giving me the silent treatment.',dumpster:'I already spent enough time in there. We’re not getting closer.'})[target] || 'It isn’t much of a talker.');
  }
  if (verb === 'kick') {
    if (target === 'dumpster' && !f.keysFound) return award(s,'keysFound','keys','One solid kick. My keys fall out of a seam in the dumpster. Subtlety is overrated.');
    if (target === 'dumpster') return say(f.repaired && !f.filmFound ? 'Something metal rattles behind the drain grate. My boot won’t fit. For once.' : 'Already made my point.');
    if (target === 'bike') return say('I kick trouble. Not my motorcycle.');
    if (['mo','bartender','guard','dog','bar'].includes(target)) return say('I need allies. I’m not kicking this problem.');
    if (target === 'cabinet') return say('Bolted steel. My boot loses that argument. A wrench might win.');
    if (target === 'pump') return say('Kicking a gasoline pump. Even I have limits.');
    return say('My boot isn’t the right tool for this job.');
  }
  if (target === 'dumpster') {
    if (!f.keysFound) return say('The lid is jammed. Something jingles when I shove it. This calls for the persuasive boot.');
    if (f.repaired && !f.filmFound) return say('A little metal photo tin is stuck behind the drain grate. Too deep to reach. A magnet on a cable would do it.');
    return say('My least favorite hotel. Zero stars. No breakfast.');
  }
  if (target === 'bar' || target === 'bartender') return verb === 'use' ? conversation(s,'bartender') : say('The bartender saw everything. He’s wearing the face of a man who wishes he hadn’t.');
  if (target === 'sign') return say('The Kickstand. A place to park your bike and misplace your dignity.');
  if (target === 'mo') return verb === 'use' ? conversation(s,'mo') : say('Maureen. Knows engines better than most people know their own names.');
  if (target === 'bike') {
    if (!f.workshopUnlocked) return say('My Corley. Somebody’s messed with the front end. Select my keys from the inventory and use them here.');
    if (f.repaired) return say('Straight forks. Tight axle. Fuel in the tank. That’s the sound of possibilities.');
    return say(`She needs ${[!f.forksInstalled && 'straight front forks',!f.fueled && 'gasoline',!f.tightened && 'the axle tightened with a wrench'].filter(Boolean).join(', ')}. Use the parts from your pockets on the bike.`);
  }
  if (target === 'can') return verb === 'use' ? award(s,'canTaken','can','Borrowed an empty fuel can. Now for the difficult half of that equation.') : say('An empty gasoline can. Use it to pick it up.');
  if (target === 'workbench') return verb === 'use' ? conversation(s,'workbench') : say('Mo’s workbench: a wrench, a pickup magnet, and a little box of spare fuses. Use the bench to take a tool.');
  if (target === 'radio') return say(f.repaired ? '“Corley Motors shareholders will hear from acting president Adrian Ripburger tonight.” Not if I can help it.' : 'A weather report. Dry. Dusty. Continued chance of bad decisions.');
  if (target === 'dog') return say(f.dogFed ? 'He’s found a higher calling: beef jerky.' : 'A junkyard dog with a very personal attachment to those front forks. Maybe something edible would change his mind.');
  if (target === 'forks') {
    if (verb === 'use') return f.dogFed ? award(s,'forksTaken','forks','Straight front forks, courtesy of a dog with a full mouth.') : say('The dog snaps before I can reach the forks. Need to make a friend first.');
    return say('A straight pair of Corley forks. Exactly what my front end is missing. Their owner appears to have teeth.');
  }
  if (target === 'pump') return say(f.hoseConnected ? 'The hose is connected. Use an empty fuel can on the pump to siphon the gas.' : 'The pump has gas, but no working motor. Need a hose to siphon it, and a can to catch it.');
  if (target === 'wreck') return say('The car lost an argument with a larger car. The forks beside it look fine, though.');
  if (target === 'shack') return say('Locked. The watchman’s gone. His dog is handling customer complaints.');
  if (target === 'guard') return verb === 'use' ? conversation(s,'guard') : say('A night guard. Tired eyes. A faded Polecats pin on his jacket.');
  if (target === 'plaque') {
    if (!f.codeKnown) return award(s,'codeKnown',null,'The plaque reads: “Malcolm Corley. First victory, race number 2040.” Someone scratched “SERVICE PIN = FIRST VICTORY” underneath.');
    return say('Corley’s first winning race number: 2040. That’s the service PIN.');
  }
  if (target === 'cabinet') return say(f.powerOn ? 'The new fuse is holding. The broadcast terminal has power.' : f.cabinetOpen ? 'The cabinet is open. The 20-amp fuse is blown. Mo keeps spares on her workbench.' : 'A power cabinet, bolted shut. The status lamp is dead. Those bolts look wrench-sized.');
  if (target === 'factory') return say('Upstairs, Ripburger is promising a brighter future. From here, it looks a lot like a minivan.');
  if (target === 'terminal') {
    if (verb === 'look') return say(f.terminalUnlocked ? 'The broadcast terminal feeds the meeting upstairs. It has a photo scanner, a tape deck, and a big TRANSMIT button.' : 'A service terminal, wired to the presentation upstairs. A keypad beside the door asks for a four-digit PIN.');
    if (!f.powerOn) return say('No power. I need to get that cabinet working first.');
    if (!f.terminalUnlocked) return say('Four digits between me and a very uncomfortable speech.', 'BEN', { modal:'keypad' });
    if (f.won) return say('The truth is already out. No encore needed.');
    if (!f.filmLoaded || !f.tapeLoaded) return say(`Before I transmit, I need to load ${[!f.filmLoaded && 'the evidence photos',!f.tapeLoaded && 'Corley’s recorded will'].filter(Boolean).join(' and ')}. Select each item, then use it on the terminal.`);
    f.won = true; s.finishedAt = Date.now();
    note(s,'Broadcast the photos and Malcolm’s will. Ripburger is exposed, Maureen inherits Corley Motors, and the Polecats are cleared. Time to ride.');
    return say('The photos fill the screen. Malcolm’s voice fills the room. Ripburger runs out of words. Outside, a dozen engines start. That’s my cue.', 'BEN', { won:true, sound:'victory', toast:'THE POLECATS RIDE FREE' });
  }
  return say('Nothing else to do here.');
}

function useItem(s,target,item) {
  const f = s.flags;
  if (item === 'keys' && target === 'bike' && s.scene === 'kickstand') {
    take(s,'keys'); f.workshopUnlocked = true; s.scene = 'garage';
    if (!s.visited.includes('garage')) s.visited.push('garage');
    note(s,'The bike was sabotaged. Maureen helped haul it to her garage. Need forks, fuel, and a tightened axle. The salvage yard is within walking distance.');
    return say('The engine coughs. The forks buckle. A mechanic named Mo helps drag the Corley to her shop. “You’re lucky,” she says. Sure doesn’t feel like it.', 'BEN', { moved:true, toast:'MO’S GARAGE & SALVAGE YARD UNLOCKED' });
  }
  if (item === 'jerky' && target === 'dog') {
    take(s,'jerky'); return award(s,'dogFed',null,'The dog trades his professional standards for a mouthful of jerky. The forks are mine to take.');
  }
  if (item === 'hose' && target === 'pump') {
    take(s,'hose'); return award(s,'hoseConnected',null,'Hose connected. Gravity can do the hard work. Now use the empty can on the pump.');
  }
  if (item === 'can' && target === 'pump') {
    if (!f.hoseConnected) return say('A can won’t get the gas out by itself. I need to connect a siphon hose first.');
    take(s,'can'); give(s,'fuel'); note(s,'Siphoned a full can of gas at the salvage yard.');
    return say('One full can. A little rusty, a little flammable. My kind of vintage.', 'BEN', { toast:'Empty can → Full fuel can' });
  }
  if (target === 'bike' && s.scene === 'garage') {
    if (item === 'forks' && !f.forksInstalled) {
      take(s,'forks'); f.forksInstalled=true; note(s,'Installed the salvaged front forks.');
      return repair(s) || say('The new forks slide into place. Need a wrench to tighten the axle.', 'BEN', { toast:'Front forks installed' });
    }
    if (item === 'fuel' && !f.fueled) {
      take(s,'fuel'); f.fueled=true; note(s,'Filled the motorcycle’s tank.');
      return repair(s) || say('Gas in the tank. One less excuse for staying here.', 'BEN', { toast:'Tank filled' });
    }
    if (item === 'wrench') {
      if (!f.forksInstalled) return say('No point tightening a bent front end. Install the straight forks first.');
      if (f.tightened) return say('The axle’s already tight. I’m keeping the wrench, though.');
      f.tightened=true; note(s,'Tightened the new front axle.');
      return repair(s) || say('Axle tightened. That wheel is staying where I put it.', 'BEN', { toast:'Axle secured' });
    }
  }
  if (item === 'magnet' && target === 'dumpster') {
    if (!f.repaired) return say('Nothing to fish out right now. I should get my bike running first.');
    if (f.filmFound) return say('Got the photo tin already.');
    return award(s,'filmFound','film','The magnet catches a photo tin under the grate. Miranda’s contact prints show Ripburger attacking Corley. The Polecats were framed.');
  }
  if (item === 'film' && target === 'mo') {
    if (f.tapeFound) return say('Those photos and Dad’s tape are enough. Get them onto the screen at Corley’s meeting.', 'MO');
    return award(s,'tapeFound','tape','That’s Ripburger… I knew it. Dad gave me this tape. His will. He left Corley Motors to me. Take it. Show them both at the shareholders’ meeting.', 'MO');
  }
  if (item === 'wrench' && target === 'cabinet') {
    if (f.cabinetOpen) return say('The cabinet is open. The wrench has done its part.');
    return award(s,'cabinetOpen',null,'The bolts give way. Inside: one very dead 20-amp fuse. There are spares on Mo’s workbench.');
  }
  if (item === 'fuse' && target === 'cabinet') {
    if (!f.cabinetOpen) return say('First I need to open the bolted cabinet.');
    take(s,'fuse'); return award(s,'powerOn',null,'The replacement fuse clicks in. The terminal lights up. Hello, Ripburger.');
  }
  if (['film','tape'].includes(item) && target === 'terminal') {
    if (!f.powerOn) return say('No electricity. Fix the power cabinet first.');
    if (!f.terminalUnlocked) return say('I need to unlock the terminal first. Use it without an inventory item to enter the PIN.');
    const flag = item === 'film' ? 'filmLoaded' : 'tapeLoaded';
    if (f[flag]) return say('Already loaded. The original stays in my pocket.');
    return award(s,flag,null,item === 'film' ? 'Photos scanned. Ripburger’s little secret is ready for the big screen.' : 'Tape loaded. Malcolm Corley gets the last word.');
  }
  if (item === 'film' && target === 'guard') return say('“I knew the Polecats didn’t do it. I’ll keep the suits busy. Try the service terminal.”', 'GUARD');
  if (item === 'can' && target === 'bike') return say('The can’s empty. Try the fuel pump at the salvage yard.');
  return say(`The ${ITEMS[item].name.toLowerCase()} won’t help with that.`, 'BEN', { wrong:true });
}

export function conversation(s, who) {
  const f = s.flags;
  if (who === 'bartender') return say(f.repaired ? '“Heard the news. I don’t buy it. Your boys are trouble, but not that kind.”' : '“You’re awake. Good. That suit was asking an awful lot about you.”', 'BARTENDER', { choices:[
    { id:'gang',label:'Where did the Polecats go?' },
    ...(!f.hoseTaken ? [{id:'hose',label:'Got anything for siphoning gas?'}] : []),
    ...(!f.jerkyTaken ? [{id:'jerky',label:'I need something to eat.'}] : []),
    ...(f.repaired ? [{id:'photographer',label:'Seen a photographer around here?'}] : []),
    {id:'bye',label:'Keep your head down.'}
  ] });
  if (who === 'mo') return say(f.repaired ? '“An engine I can fix. What Ripburger did… we need proof.”' : '“Somebody worked hard to make this bike kill you. Let’s disappoint them.”','MO',{choices:[
    {id:'repairs',label:'What does the bike need?'},
    {id:'parts',label:'Where do I find the parts?'},
    ...(f.repaired ? [{id:'evidence',label:'How do we clear the Polecats?'}] : []),
    {id:'mo_story',label:'Who taught you to fix bikes?'},
    {id:'bye',label:'I’ll get to work.'}
  ]});
  if (who === 'workbench') return say('A wrench, a magnet, a fuse. The three food groups of motorcycle repair.','BEN',{choices:[
    ...(!f.wrenchTaken ? [{id:'wrench',label:'Take the wrench'}] : []),
    ...(!f.magnetTaken ? [{id:'magnet',label:'Take the pickup magnet'}] : []),
    ...(!f.fuseTaken ? [{id:'fuse',label:'Take a spare fuse'}] : []),
    {id:'bye',label:'Step away'}
  ]});
  return say('“I used to ride with Torque. I know a frame-up when I see one. The service terminal feeds their presentation. You didn’t hear that from me.”','GUARD',{choices:[
    {id:'power',label:'Why is the terminal dead?'},
    {id:'code',label:'Know the access code?'},
    {id:'bye',label:'Owe you one.'}
  ]});
}

export function choose(s, choice) {
  const f = s.flags;
  const npc = {kickstand:'bartender',garage:'mo',corley:'guard'}[s.scene];
  const valid = new Set(npc ? conversation(s,npc).choices.map(c=>c.id) : []);
  if (s.scene === 'garage') conversation(s,'workbench').choices.forEach(c=>valid.add(c.id));
  if (!valid.has(choice)) return say('That conversation has moved on.');
  s.actions++;
  switch(choice) {
    case 'gang': return say('“Ripburger paid your boys to escort Corley. Said you’d catch up. They headed east. Your keys? Heard ’em rattle inside that dumpster.”','BARTENDER');
    case 'hose': return award(s,'hoseTaken','hose','“Take the old tap hose. Never could get the beer taste out of it. Maybe gasoline will help.”','BARTENDER');
    case 'jerky': return award(s,'jerkyTaken','jerky','“Last bag of jerky. Tough enough to patch a tire. On the house.”','BARTENDER');
    case 'photographer': return award(s,'filmClue',null,'“Miranda left a photo tin behind the dumpster’s drain grate. Said she’d come back when the suits stopped following her. Something worth hiding.”','BARTENDER');
    case 'repairs': return say(f.repaired ? '“She’s good. Go make some trouble.”' : '“Straight front forks. A can of gas. Then use the wrench to tighten the axle. Put the parts on the bike yourself. I’ll check your work.”','MO');
    case 'parts': return say('“Salvage yard, down the road. There’s an old fuel pump and a set of forks. Watch the dog. Tools and an empty can are here. The bartender might have a hose.”','MO');
    case 'mo_story': return say('“My dad. He said you can tell who built an engine by how it sounds. I’d know his work anywhere.”','MO');
    case 'evidence': return say(f.tapeFound ? '“The photos prove the murder. Dad’s tape proves who inherits the company. Scan the photos, load the tape, and hit transmit.”' : '“A photographer was following Corley. Ask at the Kickstand. If you find her photos, show them to me.”','MO');
    case 'wrench': return award(s,'wrenchTaken','wrench','Borrowed Mo’s wrench. “Bring it back in one piece,” she says. She probably means me.');
    case 'magnet': return award(s,'magnetTaken','magnet','A pickup magnet on a cable. For when brute force needs a little reach.');
    case 'fuse': return award(s,'fuseTaken','fuse','Pocketed a spare 20-amp fuse. Mo calls it planning ahead.');
    case 'power': return say('“Fuse blew in the courtyard cabinet. Bolted shut. Whoever fixes it will need a wrench and a 20-amp replacement.”','GUARD');
    case 'code': return say('“Corley was sentimental. The service PIN is his first winning race number. It’s on his memorial plaque.”','GUARD');
    default:return say('Time to keep moving.');
  }
}

export function submitCode(s, code) {
  if (s.scene !== 'corley' || !s.flags.powerOn) return say('The terminal needs power first.');
  s.actions++;
  if (String(code).trim() !== '2040') return say('ACCESS DENIED. Corley’s first winning race number… it must be written somewhere.', 'TERMINAL', { error:true });
  return award(s,'terminalUnlocked',null,'ACCESS GRANTED. Photo scanner online. Tape deck ready. The meeting upstairs is about to get interesting.','TERMINAL');
}

export function hint(s, level=0) {
  const f=s.flags;
  let hints;
  if (!f.keysFound) hints=['Your keys are close to where you woke up. Something nearby rattles.','Look at the dumpster. A stuck lid is a good excuse to use your boot.','Select Kick (4), then click the dumpster on the left.'];
  else if (!f.workshopUnlocked) hints=['Having keys is different from using them.','Select the keys in your pockets, then click your motorcycle.','Click Bike keys in the inventory, then Ben’s motorcycle on the right.'];
  else if (!f.repaired) {
    if (!f.forksInstalled) hints = !f.forksTaken ? ['The salvage yard has the parts. The dog has objections.','Ask the bartender for food. Use the jerky on the salvage yard dog, then Use the chrome forks.','Talk to the bartender → “I need something to eat.” Select jerky → dog. Select Use → forks. Go to Mo’s, select forks → bike.'] : ['A part in your pocket won’t steer a motorcycle.','Bring the forks back to Mo’s garage and use them on the bike.','Select Front forks from your inventory, then click Ben’s motorcycle at Mo’s garage.'];
    else if (!f.fueled) hints=['The salvage yard fuel pump is dead, but gravity still works.','Get a hose from the bartender and the empty can at Mo’s. Use the hose, then the can, on the salvage yard pump.','Talk to bartender → siphoning gas. Use fuel can at Mo’s to pick it up. At the yard: hose → pump, can → pump. At Mo’s: full fuel can → bike.'];
    else hints=['An engine is only as good as the bolts holding it together.','The new front axle needs tightening. Mo’s workbench has a wrench.','Use Mo’s workbench → Take the wrench. Select Wrench in your pockets, then click the motorcycle.'];
  } else if (!f.filmFound) hints=['A photographer saw what happened. Try asking at the Kickstand.','A photo tin is trapped behind the dumpster grate. Mo has something that can reach it.','Use Mo’s workbench → Take the pickup magnet. Return to the Kickstand, select magnet, and click the dumpster.'];
  else if (!f.tapeFound) hints=['Mo deserves to see what really happened.','Show the photos to Maureen. Don’t just talk about them.','At Mo’s garage, select Evidence photos in your pockets and click Maureen. She will give you Corley’s tape.'];
  else if (!f.powerOn) hints=['A dead terminal needs electricity before it needs a password.','The power cabinet is bolted shut and its fuse is blown. Mo’s workbench has both things you need.','Take the wrench and spare fuse from Mo’s workbench. At Corley Motors: use wrench on cabinet, then fuse on cabinet.'];
  else if (!f.terminalUnlocked) hints=['Corley put his history on the wall. The guard knows why it matters.','Look at the memorial plaque. His first winning race number is the terminal PIN.','Select Use and click the service terminal. Enter 2040.'];
  else if (!f.filmLoaded || !f.tapeLoaded) hints=['You have two pieces of evidence and one very large audience.','The terminal has a photo scanner and a tape deck. Use both inventory items on it.','Select Evidence photos → broadcast terminal. Select Corley’s tape → broadcast terminal.'];
  else if (!f.won) hints=['Everything is ready. Let the truth do the talking.','The terminal’s TRANSMIT function is waiting.','Deselect any inventory item. Choose Use (2), then click the broadcast terminal.'];
  else hints=['You did it. The road is yours.','Check your journal to look back at the ride.','Start a new ride from the menu whenever you want.'];
  return hints[Math.max(0,Math.min(2,level))];
}

export function quests(s) {
  const f=s.flags;
  return [
    ['Find your keys and reach Mo’s garage',f.workshopUnlocked],
    ['Salvage and install straight front forks',f.forksInstalled],
    ['Siphon gas and fill the tank',f.fueled],
    ['Tighten the axle and repair the bike',f.repaired],
    ['Recover the photographer’s evidence',f.filmFound],
    ['Show Mo the photos; get Corley’s will',f.tapeFound],
    ['Power up and unlock the service terminal',f.terminalUnlocked],
    ['Expose Ripburger at the shareholders’ meeting',f.won]
  ];
}
