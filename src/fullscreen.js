// Uses native fullscreen where available, with an immersive layout as a fallback.
// The whole document is requested so menus and native dialogs remain visible.
export function createFullscreenController(doc, onChange = () => {}) {
  let immersive=false,pending=false;
  const native=()=>doc.fullscreenElement||doc.webkitFullscreenElement;
  const active=()=>!!native()||immersive;
  function sync(){doc.documentElement.classList.toggle('screen-mode',active());onChange(active());}
  async function exit(){
    if(pending)return;
    pending=true;
    try {if(native()){const leave=doc.exitFullscreen||doc.webkitExitFullscreen;if(leave)await leave.call(doc);}immersive=false;}
    catch {immersive=false;}
    finally{pending=false;sync();}
  }
  async function toggle(){
    if(pending)return;
    if(active())return exit();
    pending=true;
    try{
      const request=doc.documentElement.requestFullscreen||doc.documentElement.webkitRequestFullscreen;
      if(request){try{await request.call(doc.documentElement);}catch{immersive=true;}}
      else immersive=true;
    }finally{pending=false;sync();}
  }
  function changed(){immersive=false;sync();}
  doc.addEventListener('fullscreenchange',changed);
  doc.addEventListener('webkitfullscreenchange',changed);
  sync();
  return {toggle,exit,isActive:active,isFallback:()=>immersive,destroy(){doc.removeEventListener('fullscreenchange',changed);doc.removeEventListener('webkitfullscreenchange',changed);}};
}
