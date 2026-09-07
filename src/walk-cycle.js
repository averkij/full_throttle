export const WALK_FRAME_COUNT = 8;
const STRIDE = 144;
const SPEED = 19;

// Cell-local pelvis center and boot baseline, checked against the generated sheet.
// Keeping a common source scale avoids resizing the body when the legs spread.
const anchors = [[215,463],[190,464],[183,466],[181,461],[208,450],[181,451],[179,454],[177,448]];
export const WALK_FRAMES = anchors.map((anchor, index) => ({
  source:[index % 4 * 384, Math.floor(index / 4) * 512, 384, 512], anchor
}));

export function walkSprite(index, height = 145, stretch = 1) {
  const frame = WALK_FRAMES[index];
  const scale = height / 442;
  return {source:frame.source, x:-frame.anchor[0]*scale/stretch, y:-frame.anchor[1]*scale, w:384*scale/stretch, h:512*scale};
}

export function createWalker(x = 61, y = 87, reduced = false) {
  let target = x, phase = 0, flip = false;
  const moving = () => Math.abs(target-x) > .001;
  const pose = () => ({x,y,flip,moving:!reduced && moving(),frame:!reduced && moving()?Math.floor(phase)%WALK_FRAME_COUNT:null});
  return {
    pose,
    reset(nextX, nextY) {x=target=nextX;y=nextY;phase=0;flip=false;},
    moveTo(nextX) {
      if (!Number.isFinite(nextX)) return;
      const next = Math.max(16, Math.min(85, nextX));
      if (!moving() || (next<x)!==flip) phase=0;
      if (Math.abs(next-x)>.001) flip=next<x;
      target=next;
      if (reduced) x=target;
    },
    setReduced(value) {reduced=!!value;if(reduced){x=target;phase=0;}},
    step(deltaMs, stretch = 1) {
      if (!moving() || reduced) return pose();
      const aspect = Number.isFinite(stretch) && stretch>0 ? stretch : 1;
      const dt = Number.isFinite(deltaMs) ? Math.max(0, Math.min(deltaMs,50)) : 0;
      const distance = Math.min(Math.abs(target-x),dt/1000*SPEED/aspect);
      x += Math.sign(target-x)*distance;
      phase = (phase + distance*7.68*aspect/STRIDE*WALK_FRAME_COUNT)%WALK_FRAME_COUNT;
      if (!moving()) {x=target;phase=0;}
      return pose();
    }
  };
}
