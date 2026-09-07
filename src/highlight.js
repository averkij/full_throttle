export function createHighlightFade(duration=180){
  const values=new Map();let target=null;
  return {
    select(id){target=id;},
    clear(){target=null;values.clear();},
    step(delta,reduced=false){
      if(target&&!values.has(target))values.set(target,0);
      for(const [id,opacity] of values){
        const goal=id===target?1:0;
        const next=reduced?goal:Math.max(0,Math.min(1,opacity+Math.sign(goal-opacity)*Math.max(0,Math.min(delta,50))/duration));
        if(next===0&&goal===0)values.delete(id);else values.set(id,next);
      }
    },
    opacity(id){return values.get(id)||0;}
  };
}

// A cached copy of each source frame keeps exactly its native alpha, including
// spokes, gaps between limbs, and soft edges. Empty atlas padding stays empty.
export function createSpriteHighlights(makeCanvas){
  const images=new WeakMap();
  function mask(asset,frame){
    if(!asset.ready)return null;
    let frames=images.get(asset.image);if(!frames){frames=new Map();images.set(asset.image,frames);}
    const key=frame.join(',');if(frames.has(key))return frames.get(key);
    const canvas=makeCanvas();canvas.width=Math.ceil(frame[2]);canvas.height=Math.ceil(frame[3]);
    const c=canvas.getContext('2d',{willReadFrequently:true});
    c.drawImage(asset.image,...frame,0,0,canvas.width,canvas.height);
    const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;
    c.globalCompositeOperation='source-in';c.fillStyle='#f1d497';c.fillRect(0,0,canvas.width,canvas.height);
    const result={canvas,pixels};frames.set(key,result);return result;
  }
  return {
    contains(asset,frame,box,x,y){
      if(x<box.x||y<box.y||x>=box.x+box.w||y>=box.y+box.h)return false;
      const sample=mask(asset,frame);if(!sample)return true;
      const px=Math.floor((x-box.x)/box.w*sample.canvas.width),py=Math.floor((y-box.y)/box.h*sample.canvas.height);
      return sample.pixels[(py*sample.canvas.width+px)*4+3]>32;
    },
    draw(c,asset,frame,box,opacity){
      if(opacity<=0)return;
      const sample=mask(asset,frame);if(!sample)return;
      c.save();c.globalAlpha=opacity*.12;c.globalCompositeOperation='screen';
      c.shadowColor='#ffdc9e';c.shadowBlur=5;
      c.drawImage(sample.canvas,box.x,box.y,box.w,box.h);c.restore();
    }
  };
}
