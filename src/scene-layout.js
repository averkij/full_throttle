// Percentages of the scene: both the canvas prop and DOM hitbox use this box.
// The radio sits on the workbench, to the left of the open garage shutter.
export const GARAGE_RADIO = Object.freeze({x:40, y:45, w:12, h:11});

export function fitProp(frame, box, stretch = 1) {
  const width = box.w * 7.68, height = box.h * 5.12;
  const scale = Math.min(width * stretch / frame[2], height / frame[3]);
  const w = frame[2] * scale / stretch, h = frame[3] * scale;
  return {x:box.x * 7.68 + (width-w)/2, y:(box.y+box.h)*5.12-h, w, h};
}

export const bodies={BEN:[36,3,326,675],MO:[420,23,296,655],BARTENDER:[766,40,324,638],GUARD:[1154,2,253,676]};
export const portraits={BEN:[0,678,362,408],MO:[362,678,362,408],BARTENDER:[724,678,362,408],GUARD:[1086,678,362,408]};
export const vehicleFrames={broken:[3,2,763,493],repaired:[780,2,756,496],dog:[8,498,698,509],fed:[737,651,756,320]};
export const FORKS_FRAME=[172,56,724,1400];
// Measured cutouts share a body scale and foot baseline. Opening the door
// extends the sprite to the left without moving the cabinet body.
export const CABINET_FRAMES={
  closed:{source:[12,80,536,674],anchor:[269,665]},
  open:{source:[575,80,670,674],anchor:[409,665]},
  powered:{source:[1250,80,631,674],anchor:[369,665]}
};
const itemOrder=['keys','hose','jerky','can','fuel','wrench','magnet','forks','film','tape','fuse','tin'];
export const itemFrames=Object.fromEntries(itemOrder.map((id,i)=>[id,[(i%4)*384,Math.floor(i/4)*1024/3,384,1024/3]]));

export function sceneSprites(state, stretch=1) {
  const sprites=[];
  function add(id,asset,frame,x,feet,height,shadow=null){
    const width=height*frame[2]/frame[3]/stretch;
    sprites.push({id,asset,frame,box:{x:x-width/2,y:feet-height,w:width,h:height},shadow});
  }
  const person=(id,speaker,x,y,h)=>add(id,'characters',bodies[speaker],x,y,h,[x,y,21/stretch,3.2]);
  const bike=(x,y)=>add('bike','props',vehicleFrames[state.flags.repaired?'repaired':'broken'],x,y,128,[x,y-2,76/stretch,7]);
  if(state.scene==='kickstand'){
    person('bartender','BARTENDER',384,386,116);
    if(!state.flags.workshopUnlocked)bike(605,452);
  }
  if(state.scene==='garage'){
    const frame=[89,6,1364,1006];
    sprites.push({id:'radio',asset:'radio',frame,box:fitProp(frame,GARAGE_RADIO,stretch)});
    person('mo','MO',497,395,124);bike(404,450);
    if(!state.flags.canTaken)add('can','items',itemFrames.can,573,422,61);
  }
  if(state.scene==='yard'){
    if(!state.flags.forksTaken)add('forks','forks',FORKS_FRAME,286,392,140);
    add('dog','props',vehicleFrames[state.flags.dogFed?'fed':'dog'],346,421,state.flags.dogFed?44:79,[346,422,43/stretch,5]);
  }
  if(state.scene==='corley'){
    person('guard','GUARD',194,417,120);
    const {source,anchor}=CABINET_FRAMES[state.flags.powerOn?'powered':state.flags.cabinetOpen?'open':'closed'];
    const scale=122/656;
    sprites.push({id:'cabinet',asset:'cabinet',frame:source,
      box:{x:529-anchor[0]*scale/stretch,y:414-anchor[1]*scale,w:source[2]*scale/stretch,h:source[3]*scale},
      shadow:[529,413,48/stretch,5]});
  }
  return sprites;
}
