// Debug discovery is deliberately session-only. Any click elsewhere breaks the sequence.
export function createDebugGate(required = 7) {
  let count = 0, enabled = false;
  return {
    enabled: () => enabled,
    click(inCorner) {
      if (!inCorner) {count = 0;return false;}
      if (++count < required) return false;
      count = 0;enabled = !enabled;return true;
    },
    reset() {count = 0;}
  };
}

export function installDebugMode({document, scene, button, onChange}) {
  const gate = createDebugGate();
  button.hidden = true;
  document.addEventListener('click', event => {
    const bounds = scene.getBoundingClientRect();
    const x = event.clientX-bounds.left, y = event.clientY-bounds.top;
    const corner = event.detail>0 && scene.contains(event.target) && x>=0 && y>=0 && x<44 && y<44;
    if (corner) {event.preventDefault();event.stopImmediatePropagation();}
    if (!gate.click(corner)) return;
    const enabled = gate.enabled();
    button.hidden = !enabled;
    scene.classList.toggle('debug-mode', enabled);
    onChange(enabled);
  }, true);
  document.addEventListener('contextmenu', () => gate.reset(), true);
  return gate;
}
