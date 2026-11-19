# Print files — from generated image to print-ready PNG

A print file is a transparent RGBA PNG, sized so it lands at 200+ DPI in the blank's print
area, with nothing in it but the artwork. `scripts/process_print_file.py` produces one.

## The two un-matte modes

Generated art arrives on a background — usually white or black. Removing that background is
not a matter of deleting one color, because the artwork's own soft edges, glows and
antialiasing are *blends* with the background. You have to recover what the ink was and how
opaque it was at every pixel.

**White mode (`W`)** — art drawn on white. Anything darker than white is ink; the darker it
is, the more opaque. Alpha is `1 − min(R,G,B)` and the ink color is recovered by dividing
out the white that was mixed in. Use for woodcuts, engravings, line art, single-colour
prints, dark lettering. The result composites correctly on **light garments**.

**Black mode (`B`)** — art drawn on black. Anything brighter than black is ink. Alpha is
`max(R,G,B)`. This preserves glow, airbrush haze and neon edges as genuinely semi-transparent
pixels. Use for airbrush art, flame effects, luminous designs, anything with a halo. The
result only composites correctly on **dark garments**, because those semi-transparent pixels
let the garment show through — on white they read as washed-out grey.

Picking the wrong mode is the most common way to ruin a batch, and it's easy to miss on
screen. Decide the mode when you write the generation prompt, and carry it through to the
colorway choice: `B` designs get Black / Pepper / True Navy / Blue Spruce, `W` designs get
White / Ivory / Grey / Bay.

## Running the script

```bash
python3 scripts/process_print_file.py IN.png OUT.png --mode W --width 4500
python3 scripts/process_print_file.py IN.png OUT.png --mode B --isolate
```

Options:

- `--mode W|B` — which background to un-matte from (required)
- `--width` — output width in pixels, default 4500. Match your blank's print area.
- `--floor` — alpha below this becomes fully transparent, default 0.11. Raise it to
  0.3-0.35 when a paper texture or fabric noise is bleeding through.
- `--isolate` — keep only the largest connected region of artwork. Removes stray
  garment edges, collars and sleeves from photo-sourced images.
- `--margin` — padding around the cropped artwork, default 0.025 (2.5%).

The script un-mattes, applies the alpha floor and ceiling, optionally isolates, crops to the
artwork's bounding box with margin, resizes with LANCZOS, and writes RGBA PNG.

## Where to run it

If your shell can't reach the CDN holding the source images, run it in the Higgsfield
sandbox, which has open internet and Pillow/numpy/scipy available. The sandbox is
effectively stateless between calls, so make each call self-contained: download, process,
upload, all in one command chained with `&&`. Two images per call fits comfortably inside
the 60-second window; request the presigned upload URLs first so the PUT is part of the same
command.

## Quality checks

Always composite the finished file onto the target garment color and look at it before
building the product.

**Photo contamination.** If the source was a photo of a shirt rather than flat art, the
garment comes along: a faint rectangle behind the design where the fabric was, pale vertical
strips at the edges where sleeves sat, a collar arc at the top. Subtle on screen, obvious on
a printed shirt. `--isolate` removes it. If the artwork legitimately has separate pieces
that isolation would eat, raise `--floor` instead and crop tighter.

**Paper texture.** Aged-paper or parchment backgrounds survive as a low-alpha wash and print
as a visible rectangle. `--floor 0.32` usually clears it while keeping the linework.

**Halos.** A bright fringe around dark art means it was un-matted in the wrong mode.
Reprocess in the other mode.

**Aspect ratio.** Print areas are portrait, typically around 1.13:1 (4494 × 5097 px on a
Comfort Colors 1717). Files much taller than that get height-constrained and end up narrower
on the shirt than expected. It still prints fine, but check the placement preview.

**Resolution.** Printify shows a DPI readout per layer. Anything in the "high resolution"
band is fine. Since you'll be sizing the design down from full print-area width anyway, DPI
generally goes up, not down. If a failed upscale forced you to work from a smaller original,
check this rather than assuming.

## Reprocessing without the original

The finished print file is itself RGBA, so you can re-run alpha adjustments on it directly
without re-fetching or re-upscaling the source: read the existing alpha channel, rescale it
against a new floor, re-crop, re-export. This is the quick fix when you spot a texture or
artifact problem after the fact.
