import {BUNNY_FRAMES} from './scene-layout.js';
import {bunnyProgress} from './bunny-quest.js';

export const BUNNY_EFFECT_MS=2900;
export function createBunnyEffects(){
  let active=null;
  return {
    start(result,now,reduced){active=result.effect?{kind:result.effect,step:result.bunnyStep,at:now,duration:reduced?0:BUNNY_EFFECT_MS}:null;},
    clear(){active=null;},
    busy(now){return !!active&&now-active.at<active.duration;},
    draw(c,s,asset,now,reduced,stretch){
      const elapsed=active?now-active.at:Infinity;
      const running=active&&elapsed<active.duration&&!reduced;
      const stage=bunnyProgress(s)-(running&&active.kind==='bunny'?1:0);
      const prop=(frame,x,y,h,flip=false,surface=false)=>{
        if(!asset.ready)return;
        const w=h*frame[2]/frame[3]/(surface?1:stretch);
        c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.drawImage(asset.image,...frame,-w/2,-h,w,h);c.restore();
      };
      // The dirt corridor and crater sprites remain visible after save/reload.
      if(stage){
        for(let i=1;i<=stage;i++)prop(BUNNY_FRAMES.crater,(34+i*12)*7.68,86*5.12+16,40,false,true);
      }
      if(!running)return {stage,done:true};
      if(active.kind==='bunny'){
        const progress=Math.min(1,elapsed/1900),from=(34+(active.step-1)*12)*7.68,to=(34+active.step*12)*7.68;
        if(elapsed<1900)prop(BUNNY_FRAMES.bunny,from+(to-from)*progress,86*5.12-Math.abs(Math.sin(progress*Math.PI*5))*11,37);
        else{
          prop(BUNNY_FRAMES.crater,to,86*5.12+16,40,false,true);
          const p=(elapsed-1900)/1000;
          c.save();c.globalAlpha=1-p;
          for(let i=0;i<8;i++){
            const a=i*Math.PI/4;
            c.fillStyle=i%2?'#a18b73':'#eac388';c.beginPath();
            c.ellipse(to+Math.cos(a)*(10+p*28),86*5.12-15-p*35+Math.sin(a)*13,8+p*10,6+p*8,0,0,Math.PI*2);c.fill();
          }
          c.restore();
        }
      }else if(active.kind==='car'){
        const p=Math.min(1,elapsed/1600);prop(BUNNY_FRAMES.car,146-19*p,281+11*p,33);
      }
      return {stage,done:false};
    }
  };
}
