import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENERY_MASKS,sceneryBox,createSceneryMasks} from '../src/scenery-masks.js';
import {createSpriteHighlights} from '../src/highlight.js';

test('Scenery masks scale with the exact source image and remain within all four background cells',()=>{
  let count=0;
  for(const [scene,objects] of Object.entries(SCENERY_MASKS))for(const [id,definition] of Object.entries(objects)){
    const box=sceneryBox(scene,id);count++;
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=768&&box.y+box.h<=512,scene+':'+id);
    assert.deepEqual([box.x,box.y,box.w,box.h],definition.bounds.map(value=>value/2));
    assert.ok(definition.path.startsWith('M '));
  }
  assert.equal(count,14);assert.equal(sceneryBox('yard','not-an-object'),null);
});

test('Scenery selection shares the visible alpha, including holes, and reuses its cached mask',()=>{
  let masks=0,reads=0;const fills=[];
  const pixelData=new Uint8ClampedArray(665*296*4);
  pixelData[(100*665+300)*4+3]=255;
  const cache=createSceneryMasks(()=>{
    masks++;return {width:0,height:0,getContext:()=>({translate(x,y){assert.deepEqual([x,y],[-157,-468]);},fill(path,rule){fills.push({path,rule});}})};
  },path=>path);
  const first=cache.get('yard','wreck'),second=cache.get('yard','wreck');
  assert.equal(first,second);assert.equal(masks,1);assert.equal(fills[0].rule,'evenodd');
  assert.equal(cache.get('yard','forks'),null,'A sprite is not turned into background geometry');
  const highlights=createSpriteHighlights(()=>({width:0,height:0,getContext:()=>({drawImage(){},fillRect(){},getImageData(){reads++;return {data:pixelData};}})}));
  const {asset,frame,box}=first;
  assert.equal(highlights.contains(asset,frame,box,box.x+150,box.y+50),true);
  assert.equal(highlights.contains(asset,frame,box,box.x+149,box.y+50),false,'Adjacent empty pixels do not select the car');
  assert.equal(highlights.contains(asset,frame,box,box.x-1,box.y),false);
  const context={save(){},restore(){},drawImage(){}};
  highlights.draw(context,asset,frame,box,1);
  assert.equal(context.globalCompositeOperation,'screen');assert.equal(context.globalAlpha,.12);
  assert.equal(reads,1,'Hover, clicking and drawing all use the same cached alpha');
});
