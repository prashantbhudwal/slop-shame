# Slop Shame raster pipeline

All artwork was generated with Codex's built-in OpenAI image tool, not drawn
programmatically. Exact prompts and reroll notes are in `assets-src/prompts/`.
The canonical identity reference is `assets-src/raw/sloppy.png`. Rejected first
attempts for Certified Slop and crowned Sloppy are retained under `raw/`.

From the project root:

```sh
python3 scripts/assets/process.py
```

Requires Python with Pillow, ImageMagick 7 (`magick`), `cwebp`, and `uvx`.
No npm dependencies. The script invokes a single Python worker through
`uvx --from 'rembg[cpu,cli]==2.0.85' python`. It loads one `bria-rmbg` session
per batch and loops through images sequentially, CPU-only, with both ONNX thread
pools and `OMP_NUM_THREADS` set to 2. The model is the same one used for the
approved originals' initial cleanup; it is pinned explicitly to retain quality.
Pipeline invocations and model workers are serialized with file locks.
Cutouts are cached by source SHA256. rembg downloads its model on first use.
If rembg fails, the script uses ImageMagick grey-background flood removal.
The stamp uses a red-ink matte after removal to preserve its distressed holes.
Other cutouts receive a one-source-pixel alpha erosion to remove grey fringe.

Each cutout is trimmed with `magick -trim +repage`, then padded with about 4%
transparent margin on each side. Kaboom keeps its trimmed aspect ratio; the
wanted poster retains its original opaque background at 768 x 1024.
WebP encoding always uses `cwebp -q 85 -alpha_q 90 -m 6`. If a file exceeds
its budget, minimal pre-encode smoothing is applied; the radius is recorded in
`assets-src/processed/processing-report.json`. Extension PNGs are generated
from the 1024 x 1024 `assets-src/processed/icon-master.png`.

Useful options:

```sh
python3 scripts/assets/process.py --only certified sloppy-crowned
python3 scripts/assets/process.py --force  # recompute all background removals
```

Final file dimensions, byte sizes and alpha presence are recorded in
`assets-src/processed/asset-report.json`. Every final asset is composited on
white and navy in `assets-src/processed/contact-sheet.png`. Its header shows
the five tiers at native 24px and 48px and extension icons at native sizes.
`small-size-check.png` is a separate crop for inspecting those native pixels.

The ten category icons are registered in `categories.json`; they use the same
cleanup and 256 x 256 / 25,000-byte limits as tier and UI icons. The full contact
sheet includes them on both backgrounds and has a native 24px category strip.
`categories-contact-sheet.png` and `categories-small-size-check.png` provide
focused copies for reviewing this set. Generate only the category exports with:

```sh
python3 scripts/assets/process.py --only ai-vocabulary template-phrases chatbot-leak negation-pivot inflation hedging engagement-bait formatting robotic-rhythm bypass-tricks
```

The script never invokes image generation, changes originals, edits source
code, or makes a git commit. Reprocessing existing originals is repeatable.
