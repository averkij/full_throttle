// A local, original minor-key road theme. Nodes are stopped on every exit;
// nothing is scheduled until a player gesture enables sound.
export function createIntroScore({createContext=()=>new(window.AudioContext||window.webkitAudioContext)()}={}) {
  let context, output, timer, step=0;
  const nodes=new Set();
  function note(frequency,duration,type,volume,slide=0) {
    const oscillator=context.createOscillator(),gain=context.createGain();
    const now=context.currentTime;
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(frequency,now);
    if(slide)oscillator.frequency.exponentialRampToValueAtTime(slide,now+duration);
    gain.gain.setValueAtTime(0,now);
    gain.gain.linearRampToValueAtTime(volume,now+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    oscillator.connect(gain);gain.connect(output);nodes.add(oscillator);
    oscillator.onended=()=>{nodes.delete(oscillator);oscillator.disconnect();gain.disconnect();};
    oscillator.start();oscillator.stop(now+duration+.03);
  }
  function tick() {
    const riff=[82.41,82.41,0,82.41,98,82.41,110,98,73.42,73.42,0,73.42,98,73.42,65.41,73.42];
    const root=riff[step%riff.length];
    if(root){note(root,.24,'sawtooth',.075);note(root*1.5,.2,'triangle',.035);}
    if(step%4===0)note(115,.18,'sine',.32,42);
    if(step%4===2){note(155,.11,'triangle',.13,65);note(1850,.035,'square',.018);}
    note(4200,.025,'square',step%2===0?.007:.003);
    if(step%16===0){note(164.81,2.2,'triangle',.028);note(246.94,2.1,'sine',.025);}
    step++;
  }
  function stop() {
    clearInterval(timer);timer=null;
    for(const node of nodes){try{node.stop();}catch{}}
    nodes.clear();
    if(context?.state==='running')void context.suspend().catch(()=>{});
  }
  return {
    async start() {
      try {
        context??=createContext();
        if(!output){output=context.createBiquadFilter();output.type='lowpass';output.frequency.value=1800;output.connect(context.destination);}
        if(timer)return;
        // Mark intent before resume: a late resolution cannot restart a skipped intro.
        timer=setInterval(()=>{if(context.state==='running')tick();},230);
        await context.resume();
        if(timer)tick();else if(context.state==='running')await context.suspend();
      } catch {stop();}
    },
    stop,
    destroy(){stop();if(context)void context.close().catch(()=>{});}
  };
}
