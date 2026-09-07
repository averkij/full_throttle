export function normalizeSpeech(text){return String(text).normalize('NFC').replace(/[«»“”"]/g,'').replace(/\s+/g,' ').trim();}

// Playback uses only the pre-generated local files. No network synthesis at runtime.
export function createVoicePlayer({samples,previewSamples=[],heardSpeech=[],onHeard=()=>{},createAudio=url=>new Audio(url),onChange=()=>{},onError=()=>{}}){
  const lines=new Map(samples.map(sample=>[sample.speaker+'\n'+normalizeSpeech(sample.text),sample]));
  const auditions=new Map([...previewSamples,...samples].map(sample=>[sample.id,sample]));
  let enabled=false,current=null,active=null,heard=new Set(heardSpeech);
  const snapshot=()=>({current:current?.id||null,active:active?.sample.id||null,status:active?.status||'idle'});
  const notify=()=>onChange(snapshot());
  function stop(){
    const previous=active;active=null;
    if(previous){previous.audio.onplaying=null;previous.audio.onended=null;previous.audio.onerror=null;previous.audio.pause();previous.audio.removeAttribute('src');previous.audio.load();}
    notify();
  }
  async function play(sample,preview=false){
    stop();if(!enabled||!sample)return false;
    let audio;
    try{audio=createAudio(sample.url);}catch{onError(sample);return false;}
    const playback={sample,audio,preview,status:'loading'};active=playback;audio.preload='auto';audio.volume=.92;
    const failed=()=>{if(active===playback){stop();onError(sample);}};
    audio.onplaying=()=>{
      if(active!==playback)return;
      playback.status='playing';
      // Count audible gameplay speech, including manual replay. Menu auditions
      // and attempts that never started must not consume the first playback.
      if(!preview&&!heard.has(sample.id)){heard.add(sample.id);onHeard(sample.id);}
      notify();
    };
    audio.onended=()=>{if(active===playback)stop();};audio.onerror=failed;notify();
    try{await audio.play();return active===playback;}catch{failed();return false;}
  }
  return {
    snapshot,
    setHeardSpeech(ids){stop();heard=new Set(ids);},
    setEnabled(value){enabled=!!value;if(!enabled)stop();},
    setLine(speaker,text,{autoplay=true}={}){
      stop();current=lines.get(speaker+'\n'+normalizeSpeech(text))||null;notify();
      if(autoplay&&enabled&&current&&!heard.has(current.id))void play(current);
      return current;
    },
    playCurrent(){return play(current);},
    playSample(id){return play(auditions.get(id),true);},
    stop,
    stopPreview(){if(active?.preview)stop();}
  };
}
