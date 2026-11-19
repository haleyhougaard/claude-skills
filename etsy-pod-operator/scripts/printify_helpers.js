/* Printify editor helpers.
 *
 * Inject this whole file into the Printify tab after every page load (the SPA keeps
 * window state across in-app route changes, but a real navigation clears it).
 *
 * Everything here is SYNCHRONOUS except __inject, which has to await a fetch. That is
 * deliberate: Chrome throttles setTimeout in backgrounded tabs to roughly once a minute,
 * so any helper that slept between steps would appear to hang forever. Drive the timing
 * from outside — one call per step, with real waits in between.
 */

window.__CDN = window.__CDN || '';  // set to your print-file base URL, ending in '/'

/* ---------- generic ---------- */

// Match elements by exact text. Deliberately queries '*' rather than a tag list:
// Printify's captions are not always in the tag you would guess, and a narrower
// selector silently misses cards that are plainly visible on screen.
window.__byText = (t) =>
  Array.from(document.querySelectorAll('*'))
    .filter((e) => e.children.length === 0 && e.textContent.trim() === t);

window.__btn = (t) =>
  Array.from(document.querySelectorAll('button'))
    .find((b) => b.innerText.trim() === t && !b.disabled);

// Set a React-controlled input/textarea. Assigning .value directly does not notify
// React, so go through the native setter and fire the events its onChange listens for.
window.__set = (el, v) => {
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

/* ---------- print file upload ---------- */

// Fetch the print file inside the page and hand it to the hidden file input as a real
// FileList. The page can reach the CDN even when the automation host cannot, and
// DataTransfer produces a FileList that React's upload handler accepts.
// The Upload panel must be open first — check for the input before calling.
window.__inject = async (idOrUrl, filename) => {
  const input = document.querySelector('input[type=file]');
  if (!input) return 'NOINPUT — open the Upload panel first';
  const url = idOrUrl.startsWith('http') ? idOrUrl : window.__CDN + idOrUrl + '.png';
  const blob = await (await fetch(url)).blob();
  const dt = new DataTransfer();
  dt.items.add(new File([blob], filename, { type: 'image/png' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('input',  { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return 'ok ' + blob.size;
};

/* ---------- colorways ---------- */

window.__colorRow = (name) => {
  for (const el of window.__byText(name)) {
    let p = el;
    for (let i = 0; i < 8; i++) {
      p = p.parentElement;
      if (!p) break;
      const boxes = p.querySelectorAll('input[type=checkbox]');
      if (boxes.length === 1) return { cb: boxes[0] };
    }
  }
  return null;
};

window.__pick = (names) => names.map((n) => {
  const row = window.__colorRow(n);
  if (!row) return n + ':NOT_FOUND';
  if (!row.cb.checked) row.cb.click();
  return n + ':on';
}).join(', ');

window.__unpick = (names) => names.map((n) => {
  const row = window.__colorRow(n);
  if (row && row.cb.checked) row.cb.click();
  return n + ':off';
}).join(', ');

/* ---------- mockups ---------- */

// Switch the view tab (Front, Folded, Person 3 Context, ...). The grid re-renders, so
// wait before picking. A NOT_FOUND here usually means the carousel is still loading.
window.__mtab = (name) => {
  const el = window.__byText(name)[0];
  if (!el) return 'TAB_NOT_FOUND ' + name;
  el.parentElement.click();
  return 'tab ' + name;
};

// Pick one mockup card by its exact label, e.g. 'Front, Ivory' or 'Person 3 Context, Black'.
// Selection order is listing order and the first pick becomes Primary, so pick the hero
// first. Prefer this over Select all, which cannot control ordering.
window.__mpick = (label) => {
  const el = window.__byText(label)[0];
  if (!el) return 'CARD_NOT_FOUND ' + label;
  let p = el;
  for (let i = 0; i < 5; i++) {
    p = p.parentElement;
    if (!p) break;
    const cb = p.querySelector('input[type=checkbox]');
    if (cb) { if (!cb.checked) cb.click(); return 'picked ' + label; }
  }
  return 'NO_CHECKBOX ' + label;
};

window.__mclear = () => {
  const el = window.__byText('Clear all')[0];
  if (!el) return 'NOT_FOUND';
  el.click();
  return 'cleared';
};

window.__mcount = () =>
  (document.body.innerText.match(/\d+ ?\/20 selected/) || [''])[0];

/* ---------- listing details ---------- */

// Set title + description and clear Printify's AI-generated tags in one go.
// On the details page the first two text fields are title and description.
window.__td = (o) => {
  const fields = document.querySelectorAll('input[type=text],textarea');
  if (!fields.length) return 'PAGE_NOT_READY';
  window.__set(fields[0], o.title);
  fields[0].dispatchEvent(new Event('blur', { bubbles: true }));
  window.__set(fields[1], o.desc);
  fields[1].dispatchEvent(new Event('blur', { bubbles: true }));
  const clear = window.__btn('Clear all');
  if (clear) clear.click();
  return 'title+description set, tags cleared';
};

// Add all 13 tags in one synchronous pass. Etsy caps each tag at 20 characters and
// Printify caps the count at 13; anything past that is silently dropped.
window.__addTags = (tags) => {
  let added = 0;
  for (const tag of tags) {
    const input = document.querySelector('input[placeholder="Add tag"]');
    if (!input) break;
    window.__set(input, tag);
    const add = window.__btn('Add');
    if (!add) break;
    add.click();
    added++;
  }
  return added + '/' + tags.length + ' tags added';
};

/* ---------- state checks ---------- */

// document.body.innerText lags the DOM on this page, so treat these as advisory and
// query real elements when you need certainty.
window.__status = () => {
  const body = document.body.innerText;
  return JSON.stringify({
    path: location.pathname,
    tags: (body.match(/\d+\/13 added/) || [''])[0],
    prices: (body.match(/USD \d+\.\d\d/g) || []).slice(0, 2),
    canPublish: !!window.__btn('Publish'),
  });
};

window.__publish = () => {
  const b = window.__btn('Publish');
  if (!b) return 'DISABLED — mockups probably still generating';
  b.click();
  return 'published';
};

'printify helpers ready';
