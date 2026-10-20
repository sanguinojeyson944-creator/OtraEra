function itemIconMarkup(item) {
  const color = /^#[0-9a-f]{6}$/i.test(item?.appearance?.color || '') ? item.appearance.color : '#b9ad8b';
  const accent = /^#[0-9a-f]{6}$/i.test(item?.appearance?.accent || '') ? item.appearance.accent : '#e0c878';
  const name = (item?.name || '').toLowerCase();
  const kind = item?.kind === 'Arma principal' ? (/hacha/.test(name)?'Hacha':/daga/.test(name)?'Daga':/cimitarra/.test(name)?'Cimitarra':/cetro|bastón/.test(name)?'Cetro':'Espada')
    : item?.kind === 'Cabeza' ? 'Casco'
      : item?.kind === 'Pecho' ? 'Pechera'
        : item?.kind === 'Pantalones' ? 'Pantalones'
          : item?.kind === 'Botas' ? 'Botas'
            : item?.kind === 'Guantes' ? 'Guantes'
              : item?.kind === 'Cinturón' ? 'Cinturón'
                : item?.kind === 'Secundaria' ? 'Escudo'
                  : item?.kind;
  const art = {
    Espada:'<path d="M36 5 21 27l-4-4L36 5Z" fill="currentColor"/><path d="m17 23 8 8m-4-4-10 10m0 0-4-1 1 4m3-3 4 1-1 4" fill="none" stroke="var(--item-accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    Cimitarra:'<path d="M36 5C30 19 23 27 15 30c6-10 11-19 21-25Z" fill="currentColor"/><path d="m16 27 8 7m-4-3L9 42" fill="none" stroke="var(--item-accent)" stroke-width="3" stroke-linecap="round"/>',
    Daga:'<path d="m34 6-8 23-7-7L34 6Z" fill="currentColor"/><path d="m20 22 9 9m-6-5-9 10m0 0-4-1 1 4" fill="none" stroke="var(--item-accent)" stroke-width="3" stroke-linecap="round"/>',
    Hacha:'<path d="m15 39 18-29" fill="none" stroke="var(--item-accent)" stroke-width="4" stroke-linecap="round"/><path d="M29 8c10-3 15 2 12 10l-9 9-8-8 5-11Z" fill="currentColor"/>',
    Cetro:'<path d="m15 41 17-31" fill="none" stroke="var(--item-accent)" stroke-width="4" stroke-linecap="round"/><path d="M31 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" fill="currentColor"/><path d="M31 3v18m-9-9h18" fill="none" stroke="var(--item-accent)" stroke-width="2"/>',
    Gema:'<path d="m13 7 22 0 8 13-19 22L5 20 13 7Z" fill="currentColor" stroke="var(--item-accent)" stroke-width="2" stroke-linejoin="round"/><path d="m13 7 4 13 7 22 7-22 4-13M5 20h38M17 20h14" fill="none" stroke="var(--item-accent)" stroke-width="1.7" stroke-linejoin="round"/>',
    Escudo:'<path d="M24 5 39 11v11c0 10-6 16-15 21C15 38 9 32 9 22V11l15-6Z" fill="currentColor"/><path d="M24 11v26m-10-21 20 13" fill="none" stroke="var(--item-accent)" stroke-width="2"/>',
    Casco:'<path d="M9 28V22a15 15 0 0 1 30 0v6H9Zm-2 0h34v5H7z" fill="currentColor"/><path d="M24 8v20m-9-9h18" stroke="var(--item-accent)" stroke-width="2"/>',
    Pechera:'<path d="m15 8 9 4 9-4 8 8-5 7-4-3v20H16V20l-4 3-5-7 8-8Z" fill="currentColor"/><path d="M24 13v24m-8-14h16" stroke="var(--item-accent)" stroke-width="2"/>',
    Hombreras:'<path d="M7 16c2-8 8-10 14-7l3 8-9 9-9-3 1-7Zm34 0c-2-8-8-10-14-7l-3 8 9 9 9-3-1-7Z" fill="currentColor"/><path d="m8 23 8 2m24-2-8 2" stroke="var(--item-accent)" stroke-width="2"/>',
    Guantes:'<path d="M14 40 9 24c-1-4 4-5 6-2l2 4-3-13c-.6-4 4-5 5-1l2 11-1-15c0-4 5-4 5 0l1 14 1-11c.4-4 5-3 5 1l-1 12 3-5c2-3 6-1 4 3l-7 16H14Z" fill="currentColor"/><path d="M14 32h19" stroke="var(--item-accent)" stroke-width="2"/>',
    Pantalones:'<path d="M12 7h24l-2 13-3 20H20l-2-15-3 15H7l3-22 2-11Z" fill="currentColor"/><path d="M24 8v17m-9-2h18" stroke="var(--item-accent)" stroke-width="2"/>',
    Botas:'<path d="M12 7h10v19l11 5 2 8H8v-6l4-4V7Zm15 0h9v16l7 5v11H24v-7l3-5V7Z" fill="currentColor"/><path d="M9 34h23m-8 3h16" stroke="var(--item-accent)" stroke-width="2"/>',
    Capa:'<path d="M14 8c3 4 17 4 20 0l7 31-17-7-17 7 7-31Z" fill="currentColor"/><path d="M24 12v24m-12-4 12-5 12 5" fill="none" stroke="var(--item-accent)" stroke-width="2"/>',
    Anillo:'<ellipse cx="24" cy="29" rx="12" ry="8" fill="none" stroke="currentColor" stroke-width="5"/><path d="m24 10 7 7-7 7-7-7 7-7Z" fill="var(--item-accent)" stroke="currentColor" stroke-width="2"/><path d="m20 24-3-5m14 5 3-5" stroke="var(--item-accent)" stroke-width="2"/>',
    Amuleto:'<path d="M15 7c0 8 2 11 9 14 7-3 9-6 9-14" fill="none" stroke="var(--item-accent)" stroke-width="3"/><path d="m24 18 10 10-10 14-10-14 10-10Z" fill="currentColor" stroke="var(--item-accent)" stroke-width="2"/><circle cx="24" cy="29" r="3" fill="var(--item-accent)"/>',
    Cinturón:'<path d="M7 17h34v14H7z" fill="currentColor"/><path d="M18 17v14m12-14v14" stroke="var(--item-accent)" stroke-width="2"/><rect x="20" y="19" width="8" height="10" rx="1" fill="none" stroke="var(--item-accent)" stroke-width="2"/><circle cx="24" cy="24" r="1.5" fill="var(--item-accent)"/>',
    Poción:'<path d="M19 5h10v8l5 5v22H14V18l5-5V5Z" fill="currentColor"/><path d="M19 9h10m-10 5h10m-12 11h14v10H17z" fill="var(--item-accent)" stroke="var(--item-accent)" stroke-width="1.5"/><path d="m20 29 3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    Consumible:'<path d="M19 5h10v8l5 5v22H14V18l5-5V5Z" fill="currentColor"/><path d="M19 9h10m-10 5h10m-12 11h14v10H17z" fill="var(--item-accent)" stroke="var(--item-accent)" stroke-width="1.5"/>',
    'Material de Forja':'<path d="m8 32 9-16 7 6 7-11 9 21-8 8H15l-7-8Z" fill="currentColor"/><path d="m17 29 7-7 5 5 5-9m-19 16h16" fill="none" stroke="var(--item-accent)" stroke-width="2.5" stroke-linejoin="round"/>',
    Material:'<path d="m8 32 9-16 7 6 7-11 9 21-8 8H15l-7-8Z" fill="currentColor"/><path d="m17 29 7-7 5 5 5-9m-19 16h16" fill="none" stroke="var(--item-accent)" stroke-width="2.5" stroke-linejoin="round"/>'
  }[kind];
  const fallbackArt = item?.category === 'consumables' || /poción|elixir|tónico|antídoto|hierba/.test(name)
    ? '<path d="M19 5h10v8l5 5v22H14V18l5-5V5Z" fill="currentColor"/><path d="M19 9h10m-10 5h10m-12 11h14v10H17z" fill="var(--item-accent)"/>'
    : item?.category === 'jewelry' || /anillo|amuleto|collar|medalla|reliquia/.test(name)
      ? '<path d="M15 7c0 8 2 11 9 14 7-3 9-6 9-14" fill="none" stroke="var(--item-accent)" stroke-width="3"/><path d="m24 18 10 10-10 14-10-14 10-10Z" fill="currentColor" stroke="var(--item-accent)" stroke-width="2"/>'
      : '<path d="m8 32 9-16 7 6 7-11 9 21-8 8H15l-7-8Z" fill="currentColor"/><path d="m17 29 7-7 5 5 5-9m-19 16h16" fill="none" stroke="var(--item-accent)" stroke-width="2.5" stroke-linejoin="round"/>';
  return '<svg class="slot-icon-art" viewBox="0 0 48 48" style="color:'+color+';--item-accent:'+accent+'" aria-hidden="true">'+(art || fallbackArt)+'</svg>';
}

export function renderItemGrid(container, gridId, itemIds, options = {}) {
  const { getItem, getQuantity, count = itemIds.length, emptyLabel = 'Casilla vacía', slotKeys = [], actionLabel = '' } = options;
  const showPrice = gridId === 'shop' || gridId === 'forge-stock';
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index++) {
    const id = itemIds[index] || null;
    const item = id ? getItem(id) : null;
    const quantity = item && getQuantity ? getQuantity(id, index, gridId) : null;
    const slot = document.createElement('div');
    const rarity = item?.rarity === 'Épico' ? 'epic' : item?.rarity === 'Mágico' ? 'magic' : 'common';
    slot.className = 'item-slot unified-slot ' + (item ? 'rarity-border-' + rarity : 'empty');
    slot.dataset.gridId = gridId;
    slot.dataset.gridIndex = String(index);
    slot.dataset.slotKey = slotKeys[index] || '';
    if (item?.setName) slot.dataset.setName = item.setName;
    slot.draggable = Boolean(item);
    if (id) slot.dataset.itemId = id;
    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'item-main';
    main.setAttribute('aria-label', item ? item.name + ', nivel ' + item.level + (quantity ? ', cantidad ' + quantity : '') + (showPrice ? ', precio ' + item.gp + ' de oro' : '') : emptyLabel);
    main.innerHTML = itemIconMarkup(item) + '<span class="slot-name">' + (item?.name || emptyLabel) + '</span>' + (item ? '<span class="slot-level">' + (showPrice ? item.gp + ' GP' : 'Nv. ' + (item.level || 1) + (item.reinforce ? ' · +' + item.reinforce : '')) + '</span>' : '');
    slot.append(main);
    if (item) {
      if (quantity) {
        const quantityBadge = document.createElement('span');
        quantityBadge.className = 'slot-quantity';
        quantityBadge.textContent = '×' + quantity;
        slot.append(quantityBadge);
      }
      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'item-info';
      info.textContent = 'i';
      info.setAttribute('aria-label', 'Detalles de ' + item.name);
      slot.append(info);
      const actionLabelForItem = typeof actionLabel === 'function' ? actionLabel(item) : actionLabel;
      if (actionLabelForItem) {
        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'grid-action';
        action.dataset.gridAction = actionLabelForItem;
        action.textContent = actionLabelForItem;
        slot.append(action);
      }
    }
    fragment.append(slot);
  }
  container.replaceChildren(fragment);
}

export function bindItemGrid(root, handlers) {
  let pressTimer = 0;
  let longPressed = false;
  root.addEventListener('click', event => {
    const slot = event.target.closest('.unified-slot');
    if (!slot || !root.contains(slot)) return;
    if (longPressed) { event.preventDefault(); event.stopPropagation(); longPressed = false; return; }
    const data = { gridId: slot.dataset.gridId, index: Number(slot.dataset.gridIndex), slotKey: slot.dataset.slotKey, itemId: slot.dataset.itemId || null };
    if (event.target.closest('.item-info')) { if (data.itemId) handlers.onDetails(data.itemId, data.gridId); return; }
    const action = event.target.closest('[data-grid-action]')?.dataset.gridAction || null;
    handlers.onActivate({ ...data, action });
  });
  root.addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse') return;
    const slot = event.target.closest('.unified-slot');
    if (slot?.dataset.itemId) handlers.onDetails(slot.dataset.itemId, slot.dataset.gridId);
  });
  root.addEventListener('pointerdown', event => {
    const slot = event.target.closest('.unified-slot');
    if (event.pointerType !== 'touch' || !slot?.dataset.itemId) return;
    longPressed = false;
    pressTimer = window.setTimeout(() => {
      longPressed = true;
      handlers.onDetails(slot.dataset.itemId, slot.dataset.gridId);
    }, 480);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) root.addEventListener(type, () => window.clearTimeout(pressTimer));
  root.addEventListener('dragstart', event => {
    const slot = event.target.closest('.unified-slot');
    if (!slot?.dataset.itemId) { event.preventDefault(); return; }
    const payload = JSON.stringify({ gridId: slot.dataset.gridId, index: Number(slot.dataset.gridIndex), itemId: slot.dataset.itemId, slotKey: slot.dataset.slotKey });
    event.dataTransfer.setData('application/x-walpira-item', payload);
    event.dataTransfer.setData('text/plain', payload);
    event.dataTransfer.effectAllowed = 'move';
    slot.classList.add('dragging');
  });
  root.addEventListener('dragend', event => event.target.closest('.unified-slot')?.classList.remove('dragging'));
  root.addEventListener('dragover', event => {
    if (event.target.closest('.unified-slot')) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }
  });
  root.addEventListener('drop', event => {
    const target = event.target.closest('.unified-slot');
    if (!target) return;
    event.preventDefault();
    try {
      const payload = JSON.parse(event.dataTransfer.getData('application/x-walpira-item') || event.dataTransfer.getData('text/plain'));
      handlers.onTransfer({ fromGrid: payload.gridId, fromIndex: payload.index, fromSlotKey: payload.slotKey, itemId: payload.itemId, toGrid: target.dataset.gridId, toIndex: Number(target.dataset.gridIndex), toSlotKey: target.dataset.slotKey });
    } catch (error) { /* Ignore drops that did not originate from an item grid. */ }
  });
}
