# Slop Shame asset delivery

Generated with the built-in OpenAI image tool. Exact prompts and reroll history: `assets-src/prompts/` (31 records).

All 35 runtime files pass dimensions, transparency and byte budgets. All assets were inspected on white and #1B1F3B. Tier icons were checked at 24px and 48px; category icons at 24px; the extension badge at 16px. Reprocessing is byte-identical across 39 deliverables.

| Final file | Dimensions | KB (1000 bytes) |
|---|---:|---:|
| `public/assets/tiers/artisanal.webp` | 256 x 256 | 17.29 |
| `public/assets/tiers/whiff.webp` | 256 x 256 | 11.82 |
| `public/assets/tiers/certified.webp` | 256 x 256 | 19.61 |
| `public/assets/tiers/swamp.webp` | 256 x 256 | 21.45 |
| `public/assets/tiers/slopocalypse.webp` | 256 x 256 | 24.73 |
| `public/assets/categories/ai-vocabulary.webp` | 256 x 256 | 20.79 |
| `public/assets/categories/template-phrases.webp` | 256 x 256 | 17.48 |
| `public/assets/categories/chatbot-leak.webp` | 256 x 256 | 19.36 |
| `public/assets/categories/negation-pivot.webp` | 256 x 256 | 17.49 |
| `public/assets/categories/inflation.webp` | 256 x 256 | 21.07 |
| `public/assets/categories/hedging.webp` | 256 x 256 | 15.55 |
| `public/assets/categories/engagement-bait.webp` | 256 x 256 | 11.67 |
| `public/assets/categories/formatting.webp` | 256 x 256 | 13.97 |
| `public/assets/categories/robotic-rhythm.webp` | 256 x 256 | 16.40 |
| `public/assets/categories/bypass-tricks.webp` | 256 x 256 | 16.80 |
| `public/assets/ui/destroy.webp` | 256 x 256 | 15.46 |
| `public/assets/ui/shame.webp` | 256 x 256 | 17.59 |
| `public/assets/ui/crown.webp` | 256 x 256 | 16.82 |
| `public/assets/ui/trophy.webp` | 256 x 256 | 18.68 |
| `public/assets/fx/kaboom.webp` | 512 x 352 | 49.35 |
| `public/assets/fx/splat-1.webp` | 256 x 256 | 13.72 |
| `public/assets/fx/splat-2.webp` | 256 x 256 | 16.50 |
| `public/assets/fx/splat-3.webp` | 256 x 256 | 13.39 |
| `public/assets/shame/stamp-shamed.webp` | 512 x 512 | 60.01 |
| `public/assets/shame/seal-slop.webp` | 512 x 512 | 56.44 |
| `public/assets/shame/wanted-frame.webp` | 768 x 1024 | 79.84 |
| `public/assets/mascot/sloppy.webp` | 512 x 512 | 45.15 |
| `public/assets/mascot/sloppy-horrified.webp` | 512 x 512 | 43.26 |
| `public/assets/mascot/sloppy-crowned.webp` | 512 x 512 | 53.35 |
| `public/assets/mascot/sloppy-exploded.webp` | 512 x 512 | 73.19 |
| `public/icon/16.png` | 16 x 16 | 1.01 |
| `public/icon/32.png` | 32 x 32 | 3.02 |
| `public/icon/48.png` | 48 x 48 | 5.76 |
| `public/icon/96.png` | 96 x 96 | 16.71 |
| `public/icon/128.png` | 128 x 128 | 26.14 |
| `assets-src/processed/icon-master.png` | 1024 x 1024 | 931.51 |
| `assets-src/processed/contact-sheet.png` | 1440 x 3832 | 2168.08 |
| `assets-src/processed/small-size-check.png` | 1440 x 355 | 77.58 |
| `assets-src/processed/categories-contact-sheet.png` | 1440 x 1334 | 677.21 |
| `assets-src/processed/categories-small-size-check.png` | 1440 x 220 | 39.94 |

Rerolls: Certified Slop and crowned Sloppy once each for smug expressions; extension badge once for 16px legibility; engagement-bait twice (tool rejection, then clipped line). All others: none. No unresolved failures.

Run `python3 scripts/assets/process.py`. One CPU-only bria-rmbg session is reused sequentially per batch; OMP and ONNX thread counts are 2; file locks serialize runs. Exact WebP smoothing radii and quality settings are in `processing-report.json`. Originals are in the gitignored `assets-src/raw/`. No cleanup processes remain. No source code was edited and no git commit was created.
