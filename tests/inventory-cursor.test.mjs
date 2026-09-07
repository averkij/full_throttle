import test from 'node:test';
import assert from 'node:assert/strict';
import {createInventoryCursor,drawInventoryCursor,ITEM_CURSOR_SIZE} from '../src/inventory-cursor.js';

test('Selected item cursors persist over targets, cache artwork, and reset after deselection or use',async()=>{
  const layer={style:{},dataset:{}},drawn=[];
  const cursor=createInventoryCursor({layer,ready:Promise.resolve(),makeCursor:id=>{drawn.push(id);return {toDataURL:()=>`data:image/png;base64,${id}`};}});
  await Promise.resolve();
  cursor.select('keys');assert.match(layer.style.cursor,/keys.*7 7, crosshair/);
  cursor.hover(true);assert.match(layer.style.cursor,/keys/);
  cursor.hover(false);assert.match(layer.style.cursor,/keys/);
  cursor.select('wrench');assert.match(layer.style.cursor,/wrench/);
  cursor.select('keys');assert.deepEqual(drawn,['keys','wrench']);
  cursor.select(null);assert.equal(layer.style.cursor,'default');assert.equal(layer.dataset.itemCursor,undefined);
  cursor.hover(true);assert.equal(layer.style.cursor,'pointer');
});

test('Late artwork cannot resurrect a deselected item or replace a newer selection',async()=>{
  let finish;
  const ready=new Promise(resolve=>{finish=resolve;}),layer={style:{},dataset:{}},drawn=[];
  const cursor=createInventoryCursor({layer,ready,makeCursor:id=>{drawn.push(id);return {toDataURL:()=>`data:image/png;base64,${id}`};}});
  cursor.select('keys');assert.equal(layer.style.cursor,'crosshair');
  cursor.select(null);finish();await ready;
  assert.equal(layer.style.cursor,'default');assert.deepEqual(drawn,[]);
  cursor.select('forks');assert.deepEqual(drawn,['forks']);assert.match(layer.style.cursor,/forks/);
});

test('Cursor artwork is tightly fitted to 64 pixels while transparent padding stays outside the image',()=>{
  const pixels=new Uint8ClampedArray(128*128*4);
  for(let y=20;y<100;y++)for(let x=60;x<68;x++)pixels[(y*128+x)*4+3]=255;
  const draws=[],context={getImageData:()=>({data:pixels}),drawImage(...args){draws.push(args);},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
  const image=drawInventoryCursor('forks',{makeCanvas:()=>({getContext:()=>context}),drawItem(){}});
  assert.equal(image.width,ITEM_CURSOR_SIZE);assert.equal(image.height,64);
  assert.deepEqual(draws[0].slice(1),[60,20,8,80,34.5,12,5,50]);
  assert.equal(drawInventoryCursor('empty',{makeCanvas:()=>({getContext:()=>({getImageData:()=>({data:new Uint8ClampedArray(128*128*4)})})}),drawItem(){}}),null);
});
