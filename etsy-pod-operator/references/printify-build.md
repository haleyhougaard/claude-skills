# Printify product build — browser recipe

Printify has no usable API in this setup, so the entire build runs through the browser.
This file is the operational manual: what to click, what to inject, and the failure modes
that will otherwise eat an hour of your run.

## Contents

- [The core problem: getting print files in](#the-core-problem-getting-print-files-in)
- [Setup: inject the helpers](#setup-inject-the-helpers)
- [Per-product sequence](#per-product-sequence)
- [Failure modes](#failure-modes)

## The core problem: getting print files in

Printify's uploader offers "My device" and "Dropbox." Clicking "My device" opens a native
file picker that browser automation cannot see or drive, and the container running your
code usually cannot reach the CDN where your finished print files live.

The way through: **fetch the file inside the Printify page and inject it into the hidden
file input.** The page can reach the CDN even when your shell cannot, and a `DataTransfer`
object produces a `FileList` that React's upload handler accepts as a genuine file
selection.

```js
const r = await fetch(url);
const blob = await r.blob();
const file = new File([blob], name, { type: 'image/png' });
const input = document.querySelector('input[type=file]');
const dt = new DataTransfer();
dt.items.add(file);
input.files = dt.files;
input.dispatchEvent(new Event('input',  { bubbles: true }));
input.dispatchEvent(new Event('change', { bubbles: true }));
```

This needs the host serving your print files to allow cross-origin fetches. Higgsfield's
media CDN does. If yours doesn't, the fallback is uploading the files into Printify's own
media library by hand once, then picking them from **My library** in the editor — slower to
start but completely reliable afterwards, and worth doing for a large batch.

The file input only exists while the Upload panel is open, so open it first and verify:
`document.querySelectorAll('input[type=file]').length` should be 1.

## Setup: inject the helpers

Inject `scripts/printify_helpers.js` into the tab after each page load. It defines
`__inject`, `__pick`/`__unpick` (colorways), `__mtab`/`__mpick`/`__mclear` (mockups),
`__td`/`__addTags` (listing details), and small utilities.

**Everything in these helpers is synchronous on purpose.** Chrome throttles `setTimeout` in
backgrounded tabs to roughly once a minute, so an async loop that sleeps between steps will
appear to hang forever — you will see a tag input with a value sitting there and an enabled
Add button that never got clicked. Drive the timing from outside instead: one JS call per
step, with real waits between them in a browser batch. Sequences of 10-20 alternating
`javascript_tool` and `wait` actions in a single batch work well.

## Per-product sequence

### Open the editor and place the design

Navigate to the editor URL for the blank and provider. For Comfort Colors 1717 via Printify
Choice that is `printify.com/app/editor/706/99/dtg`; find yours by opening the blank in the
catalogue and clicking Start designing once, then reuse the URL.

Click the **Upload** icon in the left rail. It is a toggle, and the first click after a page
load is sometimes swallowed — check for the file input and click again if it isn't there,
rather than blind-clicking twice and closing the panel you just opened.

Inject the file, then wait. Large files take real time: a 30 MB PNG can take 30-40 seconds
to upload and render. Watch for the placed-design state rather than assuming a fixed delay.

### Size the design

Open the layer's properties and set **Width** explicitly. Printify's default fills the print
area, which is far larger than a normal shirt graphic. Around 11 inches wide suits most
chest prints on an adult tee; wide landscape art can go to 12, and a small pocket-style
graphic much less. Height follows automatically.

Check the DPI readout stays in the high-resolution band after resizing — shrinking increases
DPI, so this is nearly always fine, but a low-resolution warning means the source was too
small and the listing shouldn't ship.

### Choose colorways

Open **Select variants** and pick colors by name. Aim for four colorways; Printify suggests
5-15 total variants and four colors across a size run lands in that range.

The rule that matters: **match garment darkness to the un-matte mode.** Art un-matted from
black carries semi-transparent glow that only composites correctly on dark garments. Art
un-matted from white is dark ink meant for light garments. A dark-mode file on a white tee
looks washed out and faded; a light-mode file on black loses its shadows.

Colorway availability moves with stock. Some colors offer the full size run, others only
three or four sizes — the picker shows "n/m sizes" per color. Prefer colors with more sizes
for the default, since that's what most buyers land on.

Deselect White if it was pre-selected and doesn't belong in your palette.

### Save and pick mockups

Save the product. Printify takes you to the mockup library and generates previews, which
takes a few seconds per image.

**Selection order determines listing order, and the first selected becomes the Primary
image.** So pick the hero first, deliberately.

Pick cards individually by their exact label (`"Front, Ivory"`, `"Person 3 Context, Black"`)
rather than using Select all — Select all is unreliable through automation and gives you no
control over which image leads. Switch view tabs with `__mtab`, wait for the grid to
re-render, then pick.

Seven images is a good target: hero, a second model shot, the flat front in every colorway,
and a folded detail shot. See `references/mockups.md` for the hero rotation.

The tab list is virtualized on slow loads — if `__mtab` reports the tab wasn't found, wait
and retry rather than concluding it doesn't exist.

### Listing details

`__td({title, desc})` sets the title and description and clears Printify's AI-generated
tags. `__addTags([...])` adds yours. Then open **Edit price**, set the retail price, and
Apply — this updates every variant at once.

Printify pre-fills an AI title, description and tags on save. Overwrite all three. Its
titles are generic and its tags are low-intent.

### Publish

The Publish button stays disabled while mockups are still generating — you'll see "Loading
mockups..." on the details page. Wait for the grid to render, then publish. If a reload
happened in between, Printify regenerates the previews and you have to wait again.

Verify afterwards: the product list shows "Publishing" then "Published."

## Failure modes

**Upload panel won't open.** The rail icon toggles. Click once, check for
`input[type=file]`, click again only if absent. Clicking twice in a row closes it.

**JS click on the rail icon does nothing.** Some rail items only respond to real pointer
events. Use the automation tool's click for those; `.click()` is fine for ordinary buttons.

**Tags stop partway through.** Timer throttling in a background tab. Use the synchronous
`__addTags` helper, not an async loop.

**`document.body.innerText` reads stale.** Counters like "13/13 added" lag behind the DOM.
Query the actual elements when you need certainty.

**Card or tab not found.** Usually still rendering. Wait a few seconds and retry. When
`__byText` misses something you can see on screen, widen the selector — captions aren't
always in the tag you expect, so match across all elements with no element children.

**Batch times out.** Long browser batches with many waits can exceed the tool's own limit.
The actions usually still ran — check state before re-running, or the retry will
double-apply. Split long sequences into two batches.

**Publish disabled.** Mockups still loading, or a required field is empty. Screenshot
before assuming it's broken.

**A reload discards unsaved work.** Title, description and tags typed but not published are
lost, and Printify restores its AI-generated defaults. Don't reload mid-edit.
