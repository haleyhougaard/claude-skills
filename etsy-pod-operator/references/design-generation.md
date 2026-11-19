# Design generation

Original artwork, generated to be a print file — not a picture of a shirt.

## The flat-art rule

The single most consequential thing in the prompt: ask for **flat artwork on a plain
background**, never "a t-shirt with X on it."

Image models given a shirt prompt produce a photograph of a shirt. The collar, sleeves,
fabric folds and studio lighting all end up inside the image, and un-matting then bakes them
into the print file as a faint rectangle behind the art with pale strips where the sleeves
were. It is subtle on screen and unmissable on a printed garment. `--isolate` in the
processing script can rescue it, but generating flat art is free and rescuing isn't.

Phrase it explicitly: *"flat vector-style artwork on a solid white background, centered,
no mockup, no shirt, no garment, no photograph."*

## Choosing the background, which chooses the mode

Decide the un-matte mode when you write the prompt, because it determines both the
background you ask for and the garment colors the listing will offer.

**Generate on white** for art that will print on light garments: woodcuts, engravings, line
art, single-ink illustration, dark lettering, folk art. Processed in `W` mode.

**Generate on black** for art with glow, haze or luminosity: airbrush, flames, neon,
moonlight, anything with a halo. Processed in `B` mode, and the listing offers dark
colorways only.

Mixed batches are fine — track the mode per design in your notes file, since it's needed
again at print-file processing and again at colorway selection.

## Prompt shape

Name the visual tradition rather than describing it loosely. "Vintage woodcut engraving,
single-ink, heavy crosshatching" produces a coherent style; "cool retro art" produces
mush. Match the tradition to what's actually winning on Etsy page one for the keyword —
that research is the whole reason to do research.

Include: subject, art tradition, composition, palette constraint, background, and any
lettering **in quotes and in the exact case you want**.

```
Vintage woodcut engraving of a werewolf walking out of a pine forest under a full moon,
single black ink on solid white background, heavy crosshatch shading, ornate rectangular
border frame, centered flat artwork, no shirt, no mockup, no photograph
```

For lettering, spell it out and specify the case:

```
Retro 1970s badge illustration of a smiling skeleton holding a coffee mug, warm cream and
burnt orange palette on solid black background, arched text reading "DEAD INSIDE" above and
"BUT CAFFEINATED" below in rounded seventies lettering, flat artwork, no garment
```

Portrait aspect (4:5) fits chest print areas naturally.

## IP screening at the prompt stage

Screen before generating, not after — a batch of infringing designs is wasted credits and
wasted time. No franchise characters, film or band references, quoted dialogue from shows,
or recognisable trade dress. Public-domain traditions are open: danse macabre, memento mori,
folk art, botanical and anatomical engraving, heraldry.

## Batching and credits

Generation and upscaling share a concurrency pool — typically four concurrent jobs on
starter plans, so upscales go in waves of four. Both cost credits; check `balance` before
a large run and budget roughly two generations' worth per design to allow for regenerations.

Batch generations, then poll with `jobs_wait` (up to 12 jobs per call). Models occasionally
return a rate-limit error under load — resubmit rather than treating it as a failure.

Upscaling to 4K sharpens linework, but it fails on some images no matter how many times you
retry. After two or three attempts, fall back to the original resolution: at typical chest
print sizes a 1856×2304 source still lands comfortably above 200 DPI, which is what actually
matters.

## QC before anything downstream

Look at every image. Not a sample — every one.

**Spelling, character by character.** Generative models produce confident nonsense in
lettering, and it is the single most expensive error in this pipeline: a misspelled shirt
that reaches a buyer is a refund, a return, and a review. Read each word out.

**Composition.** Is the subject centered and complete? Anatomy plausible? Anything cropped
at the edge that shouldn't be?

**Background.** Solid and uniform, or did the model add a gradient, a vignette, a paper
texture, or a shirt? A textured background survives un-matting as a visible rectangle.

**Style coherence.** Does it match the visual language that's winning on page one, or did
the model drift into generic clipart?

Regenerate rather than salvage. A regeneration costs a couple of credits; a bad design costs
the listing.

To review a batch efficiently, build a labelled contact sheet with PIL in the sandbox, upload
it, and view it once — but if any lettering is too small to read at contact-sheet scale, open
those images individually. Never sign off on text you couldn't actually read.
