#!/usr/bin/env python3
"""Rebuild the directed raster assets. Requires Pillow, magick, cwebp and uvx.

Run: python3 scripts/assets/process.py [--only NAME ...] [--force]
Originals are immutable. rembg cutouts are cached by source SHA256; changing a
raw original invalidates its cutout. All final outputs are rebuilt deterministically.
"""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'assets-src/raw'
PROCESSED = ROOT / 'assets-src/processed'
CUTOUTS = PROCESSED / 'cutouts'
NAVY = '#1B1F3B'
MANIFEST = json.loads((Path(__file__).parent / 'manifest.json').read_text())
CATEGORY_MANIFEST = Path(__file__).parent / 'categories.json'
if CATEGORY_MANIFEST.exists():
    MANIFEST += json.loads(CATEGORY_MANIFEST.read_text())


def run(args, quiet=True):
    # Small ONNX thread pools avoid oversubscription on a shared development Mac.
    environment = dict(os.environ, OMP_NUM_THREADS='2')
    subprocess.run([str(a) for a in args], check=True,
                   stdout=subprocess.DEVNULL if quiet else None, env=environment)


def prepare_cutouts(assets, force=False):
    jobs = []
    for asset in assets:
        name = asset['name']
        if name == 'wanted-frame':
            continue
        source = RAW / f'{name}.png'
        target = CUTOUTS / f'{name}.png'
        signature = target.with_suffix('.sha256')
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if force or not target.exists() or target.stat().st_size == 0 or not signature.exists() or signature.read_text() != digest:
            jobs.append({'source':str(source), 'target':str(target), 'signature':str(signature), 'digest':digest})
    if not jobs:
        return
    batch_file = PROCESSED / 'background-removal-jobs.json'
    batch_file.write_text(json.dumps(jobs, indent=2) + '\n')
    try:
        # One Python interpreter, one ONNX session, sequential images. Never parallelize.
        run(['uvx', '--from', 'rembg[cpu,cli]==2.0.85', 'python',
             Path(__file__).parent / 'remove_backgrounds.py', batch_file], quiet=False)
    except (subprocess.CalledProcessError, FileNotFoundError):
        for job in jobs:
            source, target = Path(job['source']), Path(job['target'])
            signature = Path(job['signature'])
            if target.exists() and target.stat().st_size and signature.exists() and signature.read_text() == job['digest']:
                continue
            run(['magick', source, '-alpha', 'on', '-fuzz', '7%', '-fill', 'none',
                 '-draw', 'alpha 0,0 floodfill', target])
            signature.write_text(job['digest'])


def cutout(asset):
    name = asset['name']
    source = RAW / f'{name}.png'
    target = CUTOUTS / f'{name}.png'
    image = Image.open(target).convert('RGBA')
    if name == 'stamp-shamed':
        # Recover only the generated red ink, including all distressed pinholes.
        # Semantic segmentation tends to keep grey paper inside stamp letters.
        original = Image.open(source).convert('RGB')
        alpha = Image.new('L', original.size)
        pixels = original.tobytes()
        alpha.putdata([max(0, min(255, round((r - max(g, b) - 3) * 1.2)))
                       for r, g, b in zip(pixels[0::3], pixels[1::3], pixels[2::3])])
        image = Image.new('RGBA', original.size, '#ED181D')
        image.putalpha(alpha)
    else:
        # Contract 1 source pixel (~0.2px at 256) and remove uncertain grey fringe.
        alpha = image.getchannel('A').point(
            lambda x: 0 if x < 72 else 255 if x > 200 else round((x - 72) * 255 / 128)
        ).filter(ImageFilter.MinFilter(3))
        image.putalpha(alpha)
    cleaned = PROCESSED / f'{name}-cutout.png'
    image.save(cleaned)
    trimmed = PROCESSED / f'{name}-trimmed.png'
    run(['magick', cleaned, '-trim', '+repage', trimmed])
    return Image.open(trimmed).convert('RGBA')


def padded(image, size, square=True):
    """4% transparent margin on every side, keeping the subject's proportions."""
    image = image.copy()
    image.thumbnail((round(size * .92), round(size * .92)), Image.Resampling.LANCZOS)
    if square:
        dimensions = (size, size)
    else:
        dimensions = tuple(min(size, math.ceil(d / .92)) for d in image.size)
    canvas = Image.new('RGBA', dimensions)
    canvas.alpha_composite(image, ((dimensions[0] - image.width) // 2,
                                 (dimensions[1] - image.height) // 2))
    return canvas


def encode(image, target, name, limit):
    target.parent.mkdir(parents=True, exist_ok=True)
    staging = PROCESSED / f'{name}-final.png'
    smoothing = 0
    while True:
        candidate = image if smoothing == 0 else image.filter(ImageFilter.GaussianBlur(smoothing))
        candidate.save(staging)
        run(['cwebp', '-quiet', '-q', '85', '-alpha_q', '90', '-m', '6', staging, '-o', target])
        if target.stat().st_size <= limit:
            return smoothing
        smoothing = round(smoothing + .15, 2)
        if smoothing > 1.5:
            raise RuntimeError(f'{target}: still over byte budget after preprocessing')


def font(size):
    for path in ['/System/Library/Fonts/Supplemental/Arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


def category_strip(sheet, categories, top):
    draw = ImageDraw.Draw(sheet)
    slot = 140
    for row, bg in enumerate(['white', NAVY]):
        y = top + row * 110
        ink = NAVY if row == 0 else 'white'
        draw.rectangle((20, y, 1420, y + 103), fill=bg)
        draw.text((32, y + 8), 'Category icons: native 24px', font=font(15), fill=ink)
        for index, asset in enumerate(categories):
            x = 20 + index * slot
            im = Image.open(ROOT / f"public/assets/categories/{asset['name']}.webp").convert('RGBA')
            im = im.resize((24,24), Image.Resampling.LANCZOS)
            sheet.paste(im, (x + 58, y + 36), im)
            label = asset['name']
            draw.text((x + (slot - draw.textlength(label, font=font(12))) / 2, y + 72),
                      label, font=font(12), fill=ink)


def contact_sheet(records, category_only=False):
    # Every shipped file appears on both specified backgrounds at useful scale.
    categories = [a for a in MANIFEST if a['group'] == 'categories']
    width, tile, gap = 1440, 220, 20
    header = 250 if category_only else 620 if categories else 370
    rows = math.ceil(len(records) / 3)
    sheet = Image.new('RGB', (width, header + rows * 266 + 20), '#E8EAF0')
    draw = ImageDraw.Draw(sheet)
    if not category_only:
        draw.text((20, 12), 'SLOP SHAME / generated raster asset review', font=font(25), fill=NAVY)
    tiers = ['artisanal', 'whiff', 'certified', 'swamp', 'slopocalypse']
    for col, bg in enumerate(['white', NAVY]):
        if category_only:
            break
        x0 = 20 + col * 710
        draw.rectangle((x0, 55, x0 + 690, 265), fill=bg)
        ink = NAVY if col == 0 else 'white'
        draw.text((x0 + 12, 63), 'Tier icons: native 24px / 48px', font=font(17), fill=ink)
        for i, name in enumerate(tiers):
            x = x0 + 35 + i * 131
            im = Image.open(ROOT / f'public/assets/tiers/{name}.webp').convert('RGBA')
            for y, size in [(98, 24), (138, 48)]:
                thumb = im.resize((size, size), Image.Resampling.LANCZOS)
                sheet.paste(thumb, (x + (48-size)//2, y), thumb)
            draw.text((x - 10, 204), name, font=font(13), fill=ink)
        draw.text((x0 + 12, 278), 'Extension icons, native pixels:', font=font(16), fill=NAVY)
        xx = x0 + 260
        for size in [16, 32, 48]:
            im = Image.open(ROOT / f'public/icon/{size}.png').convert('RGBA')
            sheet.paste(im, (xx, 276), im)
            xx += size + 30
        tiny = Image.open(ROOT / 'public/icon/16.png').convert('RGBA').resize((64,64), Image.Resampling.NEAREST)
        sheet.paste(tiny, (x0 + 590, 278), tiny)
    if categories:
        category_strip(sheet, categories, 10 if category_only else 355)
    for index, record in enumerate(records):
        col, row = index % 3, index // 3
        x, y = col * 480 + 10, header + row * 266
        image = Image.open(ROOT / record['path']).convert('RGBA')
        image.thumbnail((tile - 14, tile - 14), Image.Resampling.LANCZOS)
        for offset, bg in [(0, 'white'), (tile + gap, NAVY)]:
            draw.rectangle((x + offset, y, x + offset + tile-1, y + tile-1), fill=bg)
            sheet.paste(image, (x + offset + (tile-image.width)//2, y + (tile-image.height)//2), image)
        label = record['path'].replace('public/assets/', '').replace('public/', '')
        draw.text((x, y + 224), label, font=font(15), fill=NAVY)
        draw.text((x, y + 243), f"{record['width']}x{record['height']} / {record['kb']:.1f} KB", font=font(13), fill=NAVY)
    if category_only:
        sheet.save(PROCESSED / 'categories-contact-sheet.png')
    else:
        sheet.save(PROCESSED / 'contact-sheet.png')
        sheet.crop((0, 0, width, 355)).save(PROCESSED / 'small-size-check.png')
        if categories:
            sheet.crop((0, 355, width, 575)).save(PROCESSED / 'categories-small-size-check.png')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', nargs='+')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    for binary in ['magick', 'cwebp', 'uvx']:
        if not shutil.which(binary):
            raise SystemExit(f'Missing required CLI: {binary}')
    CUTOUTS.mkdir(parents=True, exist_ok=True)
    # Serialize complete pipeline invocations, including background removal.
    lock = (PROCESSED / '.process.lock').open('w')
    fcntl.flock(lock, fcntl.LOCK_EX)
    selected = [a for a in MANIFEST if not args.only or a['name'] in args.only]
    prepare_cutouts(selected, args.force)
    processing = {}
    for asset in selected:
        name = asset['name']
        print(f'Processing {name}', flush=True)
        if name == 'wanted-frame':
            image = Image.open(RAW / f'{name}.png').convert('RGB').resize((768,1024), Image.Resampling.LANCZOS)
        else:
            image = padded(cutout(asset), asset['size'], square=name != 'kaboom')
        if name == 'icon':
            image.save(PROCESSED / 'icon-master.png')
            (ROOT / 'public/icon').mkdir(parents=True, exist_ok=True)
            for size in [16, 32, 48, 96, 128]:
                image.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / f'public/icon/{size}.png', optimize=True)
        else:
            limit = (25 if asset['group'] in ['tiers', 'ui', 'categories'] else 80) * 1000
            smoothing = encode(image, ROOT / f"public/assets/{asset['group']}/{name}.webp", name, limit)
            processing[name] = {'pre_encode_blur_radius': smoothing, 'quality':85, 'alpha_quality':90}
    all_paths = [ROOT / f"public/assets/{a['group']}/{a['name']}.webp" for a in MANIFEST if a['name'] != 'icon']
    all_paths += [ROOT / f'public/icon/{size}.png' for size in [16,32,48,96,128]]
    records = []
    for path in all_paths:
        if not path.exists():
            continue
        with Image.open(path) as im:
            records.append({'path':str(path.relative_to(ROOT)), 'width':im.width, 'height':im.height,
                            'bytes':path.stat().st_size, 'kb':round(path.stat().st_size / 1000, 2),
                            'alpha':im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] < 255})
    (PROCESSED / 'asset-report.json').write_text(json.dumps(records, indent=2) + '\n')
    previous = PROCESSED / 'processing-report.json'
    old = json.loads(previous.read_text()) if previous.exists() else {}
    old.update(processing)
    previous.write_text(json.dumps(old, indent=2) + '\n')
    if len(records) == len(MANIFEST) + 4:
        contact_sheet(records)
        category_records = [r for r in records if r['path'].startswith('public/assets/categories/')]
        if category_records:
            contact_sheet(category_records, category_only=True)
    print(f'{len(records)} final files. Report: assets-src/processed/asset-report.json', flush=True)


if __name__ == '__main__':
    main()
