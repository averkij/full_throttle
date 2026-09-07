export const ITEM_CURSOR_SIZE=64;
export const ITEM_CURSOR_HOTSPOT=[7,7];

// Reuse the inventory artwork, preserving its alpha. Tight cropping makes a
// small key or a long fork readable without exceeding browser cursor limits.
export function drawInventoryCursor(id,{makeCanvas,drawItem}){
  const source=makeCanvas();source.width=128;source.height=128;drawItem(source,id);
  const pixels=source.getContext('2d').getImageData(0,0,128,128).data;
  let left=128,top=128,right=-1,bottom=-1;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(pixels[(y*128+x)*4+3]>32){
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right<left)return null;
  const cursor=makeCanvas();cursor.width=ITEM_CURSOR_SIZE;cursor.height=ITEM_CURSOR_SIZE;
  const c=cursor.getContext('2d');c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  const width=right-left+1,height=bottom-top+1,scale=Math.min(50/width,50/height);
  c.shadowColor='#000c';c.shadowBlur=2;c.shadowOffsetY=1;
  c.drawImage(source,left,top,width,height,12+(50-width*scale)/2,12+(50-height*scale)/2,width*scale,height*scale);
  c.shadowBlur=0;c.shadowOffsetY=0;
  // This tiny reticle is the native pointer's exact click point. The item sits
  // beside it, so small targets are not covered by the object being applied.
  c.beginPath();c.moveTo(7,2);c.lineTo(7,12);c.moveTo(2,7);c.lineTo(12,7);
  c.strokeStyle='#130e08';c.lineWidth=3;c.stroke();
  c.strokeStyle='#ffe1a4';c.lineWidth=1;c.stroke();
  return cursor;
}

export function createInventoryCursor({layer,ready,makeCursor}){
  const cache=new Map();let selected=null,target=false,artReady=false;
  function refresh(){
    let cursor=target?'pointer':'default';
    if(selected){
      if(artReady&&!cache.has(selected)){
        const image=makeCursor(selected);
        if(image)cache.set(selected,`url("${image.toDataURL('image/png')}") ${ITEM_CURSOR_HOTSPOT.join(' ')}, crosshair`);
      }
      cursor=cache.get(selected)||'crosshair';
    }
    layer.style.cursor=cursor;
    if(selected)layer.dataset.itemCursor=selected;else delete layer.dataset.itemCursor;
  }
  // The currently selected item is read after loading, not captured before it:
  // changing selection or pressing Escape during loading cannot restore it.
  Promise.resolve(ready).then(()=>{artReady=true;refresh();}).catch(()=>{});
  return {
    select(id){selected=id||null;refresh();},
    hover(active){target=!!active;refresh();}
  };
}
