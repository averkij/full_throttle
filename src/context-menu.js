const people = new Set(['mo', 'bartender', 'guard']);
const useLabels = {can:'Взять', forks:'Взять', workbench:'Взять инструмент', radio:'Послушать', bar:'Войти', cabinet:'Открыть'};

export function objectActions(id, selectedItem = null) {
  const actions = [
    {verb:'look', label:'Осмотреть', icon:'eye'},
    {verb:'use', label:useLabels[id] || 'Использовать', icon:'hand'},
    {verb:'talk', label:'Поговорить', icon:'talk'},
    {verb:'kick', label:'Пнуть', icon:'boot'}
  ];
  if (people.has(id)) [actions[1], actions[2]] = [actions[2], actions[1]];
  if (selectedItem) actions.unshift({verb:'use', item:selectedItem.id, label:`Применить: ${selectedItem.name}`, icon:'hand'});
  return actions;
}

export function menuPosition(x, y, width, height, viewportWidth, viewportHeight) {
  const inset = 8;
  return {
    left: Math.max(inset, Math.min(x + 8, viewportWidth - width - inset)),
    top: Math.max(inset, Math.min(y + 8, viewportHeight - height - inset))
  };
}

// One delegated listener survives every replacement of the scene's hotspots.
export function createContextMenu({document, window, layer, getActions, onAction, makeIcon, resolveTarget, onTargetChange=()=>{}}) {
  const pointerTarget = event => resolveTarget ? resolveTarget(event) : event.target.closest('[data-object]');
  const menu = document.createElement('div');
  menu.id = 'object-menu';
  menu.className = 'object-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-labelledby', 'object-menu-title');
  document.body.append(menu);
  let origin = null, buttons = [], hold = null, suppressClick = null;

  function cancelHold() { if (hold) window.clearTimeout(hold.timer); hold = null; }
  function close(restoreFocus = false) {
    cancelHold();
    const previous = origin;
    if (previous) previous.setAttribute('aria-expanded', 'false');
    origin = null;
    menu.hidden = true;
    onTargetChange(null);
    if (restoreFocus && previous?.isConnected) previous.focus();
  }
  function open(target, x, y) {
    close();
    origin = target;
    target.setAttribute('aria-expanded', 'true');
    menu.replaceChildren();
    const title = document.createElement('div');
    title.id = 'object-menu-title';
    title.className = 'object-menu-title';
    title.textContent = target.getAttribute('aria-label');
    menu.append(title);
    buttons = getActions(target.dataset.object).map(action => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.tabIndex = -1;
      if (action.item) button.className = 'object-menu-item';
      const label = document.createElement('span');
      label.textContent = action.label;
      button.append(makeIcon(action.icon), label);
      button.addEventListener('click', () => {
        const id = origin?.dataset.object;
        close(true);
        if (id) onAction(id, action);
      });
      menu.append(button);
      return button;
    });
    menu.hidden = false;
    const rect = menu.getBoundingClientRect();
    const position = menuPosition(x, y, rect.width, rect.height, window.innerWidth, window.innerHeight);
    menu.style.left = `${position.left}px`;
    menu.style.top = `${position.top}px`;
    buttons[0]?.focus({preventScroll:true});
    onTargetChange(target.dataset.object);
  }
  layer.addEventListener('contextmenu', event => {
    const target = event.clientX || event.clientY ? pointerTarget(event) : event.target.closest('[data-object]');
    if (!target) return;
    event.preventDefault();
    cancelHold();
    // Some touch browsers dispatch their own contextmenu after our long press.
    if (origin === target) return;
    const rect = target.getBoundingClientRect();
    open(target, event.clientX || rect.left + rect.width / 2, event.clientY || rect.top + rect.height / 2);
  });
  layer.addEventListener('keydown', event => {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
    const target = event.target.closest('[data-object]');
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = target.getBoundingClientRect();
    open(target, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  layer.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    const target = pointerTarget(event);
    if (!target) return;
    cancelHold();
    hold = {x:event.clientX, y:event.clientY, timer:window.setTimeout(() => {
      suppressClick = target;
      open(target, event.clientX, event.clientY);
    }, 500)};
  });
  layer.addEventListener('pointermove', event => {
    if (hold && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 10) cancelHold();
  });
  layer.addEventListener('click', event => {
    if (suppressClick && pointerTarget(event) === suppressClick) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    suppressClick = null;
  }, true);
  document.addEventListener('pointerup', cancelHold);
  document.addEventListener('pointercancel', cancelHold);
  document.addEventListener('pointerdown', event => {
    suppressClick = null;
    if (!menu.hidden && !menu.contains(event.target)) close();
  }, true);
  document.addEventListener('focusin', event => {
    if (!menu.hidden && !menu.contains(event.target)) close();
  });
  menu.addEventListener('contextmenu', event => event.preventDefault());
  menu.addEventListener('keydown', event => {
    if (event.key === 'Tab') { close(); return; }
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    const index = buttons.indexOf(document.activeElement);
    const next = {ArrowDown:(index+1)%buttons.length, ArrowUp:(index+buttons.length-1)%buttons.length, Home:0, End:buttons.length-1}[event.key];
    if (next !== undefined) {event.preventDefault(); buttons[next].focus();}
  });
  window.addEventListener('resize', () => close());
  window.addEventListener('scroll', event => {if (!menu.contains(event.target)) close();}, true);
  document.addEventListener('fullscreenchange', () => close());
  document.addEventListener('webkitfullscreenchange', () => close());
  return {close, isOpen:() => !menu.hidden};
}
