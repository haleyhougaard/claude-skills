#!/usr/bin/env python3
"""Turn a generated image into a transparent, print-ready PNG.

Un-mattes artwork from a solid white or black background, recovering both the ink
colour and its true opacity, then crops to the artwork and resizes for the blank's
print area.

    python3 process_print_file.py in.png out.png --mode W
    python3 process_print_file.py in.png out.png --mode B --isolate
    python3 process_print_file.py in.png out.png --mode W --floor 0.32

Mode W  art on white -> prints on LIGHT garments
Mode B  art on black -> prints on DARK garments (keeps glow as real transparency)

Also accepts an already-processed RGBA file with --mode A, which skips un-matting and
just re-applies the alpha floor, isolation and crop. Useful for fixing a print file
without re-fetching the source.

Requires: pillow, numpy. --isolate additionally requires scipy.
"""

import argparse
import sys

import numpy as np
from PIL import Image


def unmatte(rgb, mode):
    """Recover (ink, alpha) from artwork composited on a solid background."""
    if mode == "W":
        # Ink is whatever is darker than white. The more it darkens, the more opaque.
        alpha = 1.0 - rgb.min(axis=2)
        safe = np.clip(alpha, 1e-4, 1.0)
        ink = np.clip((rgb - (1.0 - alpha[..., None])) / safe[..., None], 0, 1)
    else:
        # Ink is whatever is brighter than black.
        alpha = rgb.max(axis=2)
        safe = np.clip(alpha, 1e-4, 1.0)
        ink = np.clip(rgb / safe[..., None], 0, 1)
    return ink, alpha


def isolate_largest(alpha, core_threshold=0.55, grow_fraction=0.012):
    """Keep only the largest connected blob of artwork.

    Removes garment edges, collars and sleeves that came along when the source was a
    photo of a shirt rather than flat art. The mask is grown and softened so the
    artwork's own faint outer glow survives.
    """
    try:
        from scipy import ndimage
    except ImportError:
        sys.exit("--isolate needs scipy: pip install scipy")

    core = alpha > core_threshold
    labels, count = ndimage.label(core)
    if count == 0:
        return alpha

    sizes = ndimage.sum(core, labels, range(1, count + 1))
    mask = labels == (int(np.argmax(sizes)) + 1)
    grow = max(6, int(grow_fraction * max(alpha.shape)))
    mask = ndimage.binary_dilation(mask, iterations=grow)
    mask = ndimage.binary_fill_holes(mask)
    soft = ndimage.gaussian_filter(mask.astype(np.float32), 3)
    return alpha * np.clip(soft, 0, 1)


def crop_box(alpha, threshold, margin_fraction):
    solid = alpha > threshold
    rows, cols = np.any(solid, axis=1), np.any(solid, axis=0)
    if not rows.any() or not cols.any():
        sys.exit("No artwork found above the alpha threshold — wrong --mode, or a blank image?")

    y0 = int(np.argmax(rows))
    y1 = len(rows) - int(np.argmax(rows[::-1]))
    x0 = int(np.argmax(cols))
    x1 = len(cols) - int(np.argmax(cols[::-1]))

    pad = int(margin_fraction * max(y1 - y0, x1 - x0))
    return (
        max(0, y0 - pad),
        max(0, x0 - pad),
        min(alpha.shape[0], y1 + pad),
        min(alpha.shape[1], x1 + pad),
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--mode", required=True, choices=["W", "B", "A"],
                    help="W: art on white. B: art on black. A: already RGBA, skip un-matting.")
    ap.add_argument("--width", type=int, default=4500,
                    help="output width in px (default 4500)")
    ap.add_argument("--floor", type=float, default=0.11,
                    help="alpha at or below this becomes fully transparent; raise to "
                         "0.3-0.35 to kill paper texture or fabric noise (default 0.11)")
    ap.add_argument("--ceiling", type=float, default=0.93,
                    help="alpha above this becomes fully opaque (default 0.93)")
    ap.add_argument("--isolate", action="store_true",
                    help="keep only the largest connected region of artwork")
    ap.add_argument("--margin", type=float, default=0.025,
                    help="padding around the crop as a fraction of the long side")
    ap.add_argument("--crop-threshold", type=float, default=0.35,
                    help="alpha considered solid when finding the bounding box")
    args = ap.parse_args()

    img = Image.open(args.src)

    if args.mode == "A":
        arr = np.asarray(img.convert("RGBA")).astype(np.float32) / 255.0
        ink, alpha = arr[..., :3], arr[..., 3]
        # Rescale the surviving alpha against the new floor so faint texture drops out
        # cleanly instead of leaving a grey wash behind.
        alpha = np.clip((alpha - args.floor) / max(1e-6, 1.0 - args.floor), 0, 1)
    else:
        rgb = np.asarray(img.convert("RGB")).astype(np.float32) / 255.0
        ink, alpha = unmatte(rgb, args.mode)
        alpha = np.where(alpha < args.floor, 0.0, alpha)

    if args.isolate:
        alpha = isolate_largest(alpha)

    alpha = np.where(alpha > args.ceiling, 1.0, alpha)

    y0, x0, y1, x1 = crop_box(alpha, args.crop_threshold, args.margin)
    rgba = (np.dstack([ink, alpha[..., None]])[y0:y1, x0:x1] * 255).astype(np.uint8)

    out = Image.fromarray(rgba, "RGBA")
    out = out.resize((args.width, int(out.height * args.width / out.width)), Image.LANCZOS)
    out.save(args.dst, compress_level=1)
    print(f"{args.dst} {out.size[0]}x{out.size[1]} mode={args.mode} "
          f"floor={args.floor}{' isolated' if args.isolate else ''}")


if __name__ == "__main__":
    main()
