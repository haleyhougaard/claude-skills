---
name: etsy-pod-operator
description: "Run a Printify-fulfilled Etsy shop from keyword research to finished listing: niche selection from real demand, original art, print-file prep, Printify builds through the browser, Etsy SEO, and a draft-only mode with a mandatory end-of-batch status sweep. Use when asked to research, design, build or list print-on-demand products for Etsy."
---

# Etsy POD operator

This skill runs the whole loop from "what should we sell" to "the listing is live (or ready
for review as a draft)," for a Printify-fulfilled Etsy shop. It is built for autonomous
batch runs: the operator picks niches from real demand data, generates original art,
prepares print files, builds products, and reports back.

The single most important quality bar: **every listing has to plausibly compete with page
one for its target keyword.** A batch of twenty mediocre listings is worth less than five
good ones, because Etsy's ranking punishes listings that get impressions and no clicks.

The second-most important rule, and the one most likely to burn trust if missed: **when the
user says drafts only, nothing goes live, and you verify that at the end, not just at build
time.** See "Draft-only batches" below — Printify has a recurring, unexplained bug where a
product silently flips to Published with no explicit publish click.

## What you need before starting

Confirm you have these, and stop and ask if something is missing rather than guessing:

- **Printify** logged in, with the Etsy shop connected. The shop id appears in URLs as
  `/shops/<id>/`.
- **Higgsfield MCP** for image generation (`generate_image_batch`, `upscale_image`,
  `media_upload`, `media_confirm`, `sandbox_exec`, `jobs_wait`, `balance`).
- **A browser automation tool** (Claude in Chrome) — the entire Printify build runs
  through the browser, since Printify has no usable public API in this setup.
- **A keyword research source.** RankHero, eRank, or Etsy's own search. If the user has a
  research tool logged in, use it; otherwise fall back to reading Etsy's first page for
  the target keywords, which is slower but works.

Ask the user for anything not already settled: how many listings, any niche direction,
the blank and retail price if they differ from their usual, and **whether to publish live
or leave drafts — this is a hard constraint, not a preference to infer.** If the run is
unattended, use their established defaults, save everything as drafts, state the assumptions
at the top of your work, and proceed.

## The phases

Work through these in order. Each phase gates the next — bad research produces good-looking
listings that nobody searches for.

### 1. Research and niche selection

Find keywords with **real volume and thin competition**. The shape you want is a phrase
with tens of thousands of monthly searches and a competition count in the low hundreds,
not the thousands. A phrase doing 49,500 searches against 92 competing listings is a gap;
the same volume against 5,000 listings is a wall.

Also check what's *climbing*. Seasonal terms have ordering windows — Halloween buyers shop
from late August, so a Halloween design published in October has already missed most of
its season.

Then verify on Etsy itself before committing. Search the exact phrase and read page one:

- What visual language is actually winning? (vintage woodcut single-ink, 90s bootleg
  collage, minimal line art, blackletter — these are different markets)
- What do the top listings charge? Match the quality tier you're pricing into.
- Is the user already ranking for this phrase? If so, do not build a near-duplicate that
  cannibalizes their own listing — pick a different angle within the niche.
- **Screen for IP.** Franchise names, movie and band references, quotes from TV shows, and
  recognizable character designs are takedown bait. Generic formats of a joke are fine;
  the specific copyrighted expression is not. When a phrase turns out to be a web cartoon,
  a film title, or (subtler) a poem/song whose text keeps showing up verbatim in the top
  listings, drop it and note why — don't just avoid the obvious franchise names, read what
  the actual bestsellers are quoting.

Allocate the batch across two or three niches rather than one, mixing seasonal urgency
with evergreen humor so the shop isn't entirely dependent on one month.

When a first pass of generated designs gets rejected as low-caliber, add a mandatory step
before regenerating: search Etsy for the niche's natural shopper phrase, identify the
actual highest-review/bestseller-tagged listing, and write the next prompt to hit that same
visual caliber (art tradition, palette, composition, text treatment) — original art, not a
copy. Benchmarking against a real bestseller before generating is worth doing by default for
any niche, not just as a recovery step.

### 2. Design generation

Generate original art with Higgsfield. `references/design-generation.md` has the prompt
patterns, the flat-art requirement, and the batching and credit mechanics.

The thing that ruins print files: asking for "a t-shirt with X on it" produces a *photo of
a shirt*, and the garment, collar and sleeves end up baked into the print file. Always ask
for flat artwork on a plain background.

QC every image before it goes further. Look at each one and check the spelling character by
character — generative models produce confident nonsense in lettering, and a misspelled
shirt is a refund and a bad review. Regenerate rather than salvage.

### 3. Print file preparation

Turn each approved image into a transparent PNG sized for the blank's print area.
`scripts/process_print_file.py` does this; `references/print-files.md` explains the two
un-matting modes and how to pick one.

The short version: art generated on white gets un-matted from white and prints on light
garments; art generated on black gets un-matted from black, keeps its glow, and prints on
dark garments only. Getting this backwards produces a washed-out or muddy print.

Always look at the finished file composited on the target garment color before building the
product. Photo-sourced artifacts (a faint rectangle behind the art, pale vertical strips at
the edges where sleeves were) are subtle on screen and obvious on a printed shirt.
`scripts/process_print_file.py --isolate` removes them by keeping only the largest
connected region of artwork.

### 4. Printify product build

This is the longest phase and the one with the most failure modes.
`references/printify-build.md` is the operational manual: the browser injection recipe,
the exact click sequence, and the pitfalls that will otherwise cost you an hour.

Per product, in order: get a product to build on (fresh editor, or duplicate a donor — see
below) → delete any inherited layer → inject the print file → size and position it → confirm
colorways → save → check mockup contrast → write listing details → set price → save as draft
or publish, per the user's instruction → verify.

**Build from a duplicated donor product when one exists with the right size/colorway/blank
setup already configured**, rather than starting from a blank editor URL every time. Find an
existing product using the same blank and a similar variant spread, click its duplicate/copy
icon, then open the copy's editor. This skips re-configuring variants from scratch. Two
wrinkles: the duplicate-icon click sometimes doesn't register on the first try (no toast
appears) — a blind retry can cause a *double* duplication, leaving two or three "Copy of X"
rows instead of one. Before building on any "Copy of" row, open its editor and check the
Layers panel: if it still shows the donor's original print file untouched, it's blank and
safe to use; if a batch run leaves a spare blank duplicate unused, note it in the tracker so
the next product in the run can grab it directly instead of duplicating again.

**Standing chest-position default**: Width ~10-11in for a Comfort Colors adult tee chest
print (let Height follow proportionally), Position top ~5% (top-anchored, not vertically
centered — this reads as "over the chest" rather than "centered on the shirt"), Position
left usually needs no adjustment — the value inherited from a donor template at the same
width is normally already horizontally centered; only recompute it if the design's width
differs from the donor's.

**After every layer swap, verify there's exactly one layer** before saving: open Variants
and layers, confirm no leftover second layer from the donor or a previous attempt.

**Colorway contrast QC is a judgment call, and the two outcomes are different.** Zoom into
the generated mockup thumbnails for every offered colorway before finalizing. If the design
is genuinely invisible on a color (white art on a white shirt, no visible edge at all),
drop or swap that colorway — don't ship a defect. If it's merely faint or low-contrast but
an outline or shape is still legible (e.g. a light fill color on a light shirt where the
dark outline still reads), it's a legitimate call to keep the standard colorway set rather
than deviate — but make the call consciously and be consistent about where the line is
across a batch, not case-by-case mood.

A workable default colorway convention, unless the user specifies otherwise: light-garment
designs → White/Ivory/Grey plus one accent (e.g. a soft green or blue); dark-garment designs
→ Black/Charcoal or Pepper/Navy plus one accent (e.g. a deep green). This matches the
un-matte-mode rule in `references/print-files.md` — the point is to have *a* default so
every product in a batch is visually consistent, not to force this exact palette.

Two things worth internalizing beyond the mechanics:

**Print size.** Printify drops artwork in at full print-area size, which is bigger than
almost any real shirt graphic. A design that fills a 14.6 inch wide print area looks like a
costume. Set the width deliberately per design and let the height follow.

**Mockup diversity.** Printify's mockup library includes several models, and the default
ordering surfaces the same white man first every time. Rotate the hero image across the
run — different models, different genders and skin tones, and a plain flat-lay shot for some
listings. `references/mockups.md` has the catalogue and a workable rotation.

### 5. Listing SEO

Write the title, thirteen tags and the description per listing. `references/etsy-seo.md`
has the character limits, the tag construction rules, and the description skeleton.

The constraint people get wrong: **Etsy tags cap at 20 characters.** A high-volume phrase
longer than that has to live in the title instead, with a trimmed variant as the tag.
Count the characters rather than eyeballing them — Printify's own counters ("118/140",
"13/13 added") are visible on screen; read them rather than assuming your text fit.

Never promise anything fulfillment can't do. Printify prints and ships; there are no gift
notes, no rush upgrades, and no bundled shipping discounts. A description that offers them
generates support tickets and refunds.

**Field-editing reliability.** Printify's product-details fields are easy to "visually"
edit and silently fail to persist. Programmatic value-setting (a JS native-setter +
dispatched `input`/`change` event) can work, then intermittently revert after Save + fresh
reload with no visible error — confirmed nondeterministic across otherwise-identical runs,
not something wrong with any one script. Prefer, in order:

- **Title** (single-line input): click the field, `Home`, `Shift+End`, `Delete` to clear it
  (ctrl+a and triple-click do not reliably select/clear it), then type the new title.
- **Description** (multi-line textarea): use `document.execCommand('insertText', ...)`
  rather than a raw `dispatchEvent`. It fires real InputEvents the way actual typing does,
  which the framework's change detection binds to far more consistently:
  ```js
  const ta = document.querySelectorAll('textarea')[0]; // description is usually index 0
  ta.focus();
  ta.setSelectionRange(0, ta.value.length);
  document.execCommand('insertText', false, '');       // clears it
  document.execCommand('insertText', false, newText);   // sets new text
  ```
  This has proven reliable across many consecutive products with zero reversions, and
  should be the default method rather than a fallback.
- **Tags**: duplicated/donor products inherit the donor's tags even when the field looks
  empty at a glance — scroll to confirm the real count ("13/13 added") before assuming it's
  clear. Click "Clear all" (occasionally needs a second click — verify the count reads
  "0/13"), then per tag: click the tag input, type the tag, click the **Add** button — not
  Enter, which does not submit in this field. Verify the running count every 2-3 tags via a
  screenshot; a stray click can land elsewhere if the page scrolled.

**Mandatory verification, every listing, no exceptions**: click Save (as draft or publish,
per instruction) **first**, then navigate to the product-details URL fresh (a real reload,
not just scrolling back) and confirm Title, Description, and Tags all show the new text
before considering that listing's SEO done. Navigating away *before* saving discards all
unsaved edits silently — the page just reverts to whatever was last saved, with no warning.

### 6. Publish or save as draft, then report

Follow the user's explicit instruction on live-vs-draft. When they haven't specified, save
drafts and say so in the report. Publishing is a choice the user makes, never a default.

**Draft-only batches — mandatory end-of-batch status sweep.** Printify has shown a recurring,
unexplained bug across multiple runs: a handful of products in a batch silently flip to
"Published" status even with no explicit Publish click anywhere in the session — the root
cause has never been identified. Do not trust that "I only ever clicked Save as draft" means
the batch is actually all drafts. Before reporting a draft-only batch complete:

1. Filter My Products by Status = Published.
2. Read the full list (it will include the shop's other, unrelated pre-existing listings —
   don't assume every row belongs to your batch; match by product title/niche against your
   own tracker).
3. For any of *your* batch's products that show as Published, use the row's "..." menu →
   **Hide on Etsy**. There is no direct "revert to draft" action once a product has gone
   live on Etsy; "Hide on Etsy" (status becomes "Hidden") is the closest equivalent — the
   listing stops being visible/purchasable on the storefront.
4. Re-run the Published filter afterward and confirm none of your batch's products remain,
   and record the sweep (what was caught, what the fix was) in the tracker.

Do this sweep once at the end of the whole batch, not per-product — it's cheap to do once
and catches products that flipped status after you'd already moved on to later work.

For a live-publish batch, check each listing as a buyer would after publishing — open it on
Etsy, confirm the images render, the price is right, and the title reads well in search
results rather than as a keyword pile.

Close with a report covering: listings published (or drafted) with their links/ids, niches
and the demand signals behind them, target keywords, blank and provider and base cost,
retail price and margin, anything rejected and why, blockers hit, results of the status
sweep if draft-only, and the three listings you'd bet on selling first with your reasoning.

## Keeping state

Batch runs are long and get interrupted. Keep a working notes file with the design table
(id, description, un-matte mode, media id, status) and a status line per listing that tracks
at minimum: prompt written, image generated, QC passed, print file processed, Printify
product id, SEO done, and final draft/published state. Update it as you go — after each
product, not in a batch at the end — so an interrupted run can resume without redoing work,
double-building, or double-publishing. When a duplicate-icon click misfires and leaves a
spare blank donor copy, note its product id so a later product in the same run can use it
directly instead of creating another duplicate.

## When the user is working alongside you

If the user edits something you built — resizes a design, swaps a mockup, rewrites a title —
leave it alone and work around it. Move to a separate browser tab so you're not fighting
over the same editor. If you believe their version has a real problem (a print file with
artifacts, a tag over the limit), say so plainly, explain the tradeoff, and let them decide
rather than silently reverting their work.

## Reference files

- `references/design-generation.md` — prompt patterns, flat-art rules, batching, QC
- `references/print-files.md` — un-matting modes, sizing, artifact removal, DPI
- `references/printify-build.md` — the browser build recipe and its failure modes
- `references/mockups.md` — mockup catalogue and hero rotation
- `references/etsy-seo.md` — title, tag and description rules with worked examples

## Scripts

- `scripts/process_print_file.py` — image → transparent print-ready PNG
- `scripts/printify_helpers.js` — browser helpers injected into the Printify tab