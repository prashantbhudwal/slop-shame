#!/usr/bin/env python3
"""Reproduce calibration inputs with the Python standard library, no model/API calls.

Research-only corpora never leave data/eval/raw/. See MANIFEST.md before reuse.
"""
import argparse
import collections
import concurrent.futures
import hashlib
import html
import io
import json
import pathlib
import re
import tarfile
import time
import urllib.parse
import urllib.request
import csv
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
RAW = ROOT / 'data/eval/raw'
DOWNLOADS = RAW / 'downloads'
NORMALIZED = RAW / 'normalized'
SAMPLES = ROOT / 'data/eval/samples'
TWEET_REV = '48d1eee50c389d12f49bb0af285a37dba4d23a6a'
WI_URL = 'https://www.cl.cam.ac.uk/research/nl/bea2019st/data/wi+locness_v2.1.bea19.tar.gz'
RAID_URL = 'https://dataset.raid-bench.xyz/train_none.csv'
RAID_ETAG = '"a3b0661bddab1f7e63499e8f309c5eb4-8"'
AESLC_REV = '7afc087a1cc234d07121f0d4a2d87102ddceabc2'
HUMAN_DETECTORS_REV = 'afcf03d14d2da4a038d8d0fafa5ec779dd858181'
RECEIPTS = []
LOCK_PATH = ROOT / 'data/eval/sources.lock.json'
LOCK = json.loads(LOCK_PATH.read_text()) if LOCK_PATH.exists() else {}
JS_WHITESPACE = re.compile(r'[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+')


def word_count(text):
    # Match ECMAScript /\s+/u exactly (Python str.split has extra controls).
    return len([part for part in JS_WHITESPACE.split(text) if part])


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def download(url, name, expected_etag=None):
    path = DOWNLOADS / name
    if not path.exists():
        part = path.with_suffix(path.suffix + '.part')
        for attempt in range(3):
            try:
                request = urllib.request.Request(url, headers={'User-Agent': 'SlopShame-OfflineResearch/1.0'})
                with urllib.request.urlopen(request, timeout=60) as response, part.open('wb') as out:
                    if expected_etag and response.headers.get('ETag') != expected_etag:
                        raise RuntimeError(f'{name}: upstream changed ETag; review the new version before updating')
                    size = int(response.headers.get('Content-Length', 0))
                    count = 0
                    while block := response.read(1024 * 1024):
                        out.write(block)
                        count += len(block)
                    if size and count != size:
                        raise IOError(f'{name}: incomplete download {count}/{size}')
                part.replace(path)
                break
            except Exception:
                part.unlink(missing_ok=True)
                if attempt == 2:
                    raise
                time.sleep(2)
    checksum = digest(path)
    expected = next((r for r in LOCK.get('upstreamSnapshots', []) if r.get('url') == url), None)
    if expected and expected.get('immutable') and checksum != expected['sha256']:
        raise RuntimeError(f'{name}: SHA-256 differs from sources.lock.json; review the new source before reuse')
    RECEIPTS.append({'url': url, 'file': str(path.relative_to(ROOT)), 'sha256': checksum})
    print(f'Fetched/cached {name}: {path.stat().st_size:,} bytes', flush=True)
    return path


def item(id_, text, label, source, subset, genre, register, **metadata):
    text = text.strip().replace('\r\n', '\n')
    words = word_count(text)
    if not 30 <= words <= 600:
        return None
    return dict(id=id_, text=text, label=label, source=source, subset=subset,
                words=words, genre=genre, register=register, **metadata)


def write(name, rows, refresh, public=False):
    rows = [row for row in rows if row]
    target = (SAMPLES if public and refresh else NORMALIZED) / f'{name}.jsonl'
    target.parent.mkdir(parents=True, exist_ok=True)
    content = ''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in rows)
    checksum = hashlib.sha256(content.encode('utf-8')).hexdigest()
    expected = next((r for r in LOCK.get('normalized', []) if pathlib.PurePosixPath(r['file']).name == target.name), None)
    if expected and checksum != expected['sha256']:
        raise RuntimeError(f'{name}: normalized output differs from sources.lock.json; review selection/source changes before replacing it')
    target.write_text(content)
    RECEIPTS.append({'file': str(target.relative_to(ROOT)), 'sha256': digest(target), 'items': len(rows)})
    print(f'{target.relative_to(ROOT)}: {len(rows)} {dict(collections.Counter(r["label"] for r in rows))}', flush=True)


def tweets(refresh):
    configs = ['gpt4o', 'Meta-Llama-3-8B-Instruct', 'Mistral-7B-Instruct-v0.2', 'Qwen2-7B-Instruct']
    by_label = {'human': {}, 'ai': {}}
    for config in configs:
        url = f'https://huggingface.co/datasets/redasers/Unmasking-the-Imposters/resolve/{TWEET_REV}/{config}/test.json'
        # The published *.json files are newline-delimited objects.
        data = [json.loads(line) for line in download(url, f'tweets-{config}.json').read_text().splitlines() if line.strip()]
        for i, row in enumerate(data):
            label = 'human' if row['label'] == 0 else 'ai'
            text = row['text']
            key = hashlib.sha256(text.encode()).hexdigest()
            record = item(f'unmasking:{config}:test:{i}', text, label, 'unmasking',
                          'casual' if label == 'human' else 'social-ai', 'social-post', 'casual',
                          generator=None if label == 'human' else config,
                          original_split='test', revision=TWEET_REV, license='CC-BY-4.0')
            if record:
                by_label[label].setdefault(key, record)
    # Hash ordering is independent of scores; no cherry-picking the easy examples.
    chosen = []
    for label in ('human', 'ai'):
        candidates = [value for _, value in sorted(by_label[label].items())]
        chosen.extend(candidates[:100])
        if len(candidates) < 100:
            print(f'NOTE: only {len(candidates)} eligible unique {label} test tweets after 30-word floor', flush=True)
    write('unmasking', chosen, refresh, public=True)


def plos(refresh):
    params = {'q': 'publication_date:[2020-01-01T00:00:00Z TO 2020-12-31T23:59:59Z] AND article_type:"Research Article" AND doc_type:full',
              'fl': 'id,title,author,abstract,publication_date', 'rows': 200, 'sort': 'id asc'}
    url = 'https://api.plos.org/search?' + urllib.parse.urlencode(params)
    data = json.loads(download(url, 'plos-2020.json').read_text())
    rows = []
    for doc in data['response']['docs']:
        text = html.unescape(re.sub(r'<[^>]+>', '', '\n'.join(doc.get('abstract', []))))
        record = item('plos:' + doc['id'], text, 'human', 'plos-2020', 'formal',
                      'academic-abstract', 'formal', url='https://doi.org/' + doc['id'],
                      title=doc['title'], authors=doc.get('author', []),
                      published=doc['publication_date'], license='CC-BY-4.0')
        if record:
            rows.append(record)
        if len(rows) == 160:
            break
    if len(rows) < 160:
        raise RuntimeError(f'PLOS returned only {len(rows)} eligible abstracts')
    write('plos', rows, refresh, public=True)


def official(refresh):
    # Several policy topics, dates and years. Full statement paragraphs, excluding
    # voting names/navigation. First consecutive paragraphs only, never text repair.
    dates = ['20190130', '20190320', '20190501', '20190619', '20190731', '20190918', '20191030', '20191211',
             '20200129', '20200303', '20200315', '20200429', '20200610', '20200729', '20200916', '20201105', '20201216',
             '20210127', '20210317', '20210428', '20210616', '20210728', '20210922', '20211103', '20211215']
    rows = []
    for date in dates:
        url = f'https://federalreserve.gov/newsevents/pressreleases/monetary{date}a.htm'
        content = download(url, f'fed-{date}.html').read_text(encoding='utf-8-sig')
        body = content.split('<div id="article">', 1)[1]
        body = body.split('<div class="col-xs-12 col-sm-8 col-md-8">', 1)[1].split('</div>', 1)[0]
        paragraphs = []
        for value in re.findall(r'<p(?:\s[^>]*)?>(.*?)</p>', body, re.S):
            paragraph = re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', '', value))).strip()
            if paragraph.startswith(('Voting for', 'Implementation Note')):
                break
            if paragraph and word_count('\n\n'.join(paragraphs + [paragraph])) <= 600:
                paragraphs.append(paragraph)
            else:
                break
        record = item(f'fed:{date}', '\n\n'.join(paragraphs), 'human', 'federal-reserve', 'formal',
                      'professional-release', 'formal', url=url, authors=['Board of Governors of the Federal Reserve System'],
                      published=f'{date[:4]}-{date[4:6]}-{date[6:]}', license='LicenseRef-US-Government-Public-Domain',
                      transformation='First consecutive statement paragraphs, ≤600 words; navigation and voting list omitted')
        if not record:
            raise RuntimeError(f'No eligible statement parsed for {date}')
        rows.append(record)
    write('official-releases', rows, refresh, public=True)


def wi():
    path = download(WI_URL, 'wi-locness-2.1.tar.gz')
    rows = []
    with tarfile.open(path) as archive:
        for name in ['licence.wi.txt', 'readme.txt']:
            (DOWNLOADS / ('wi-' + name)).write_bytes(archive.extractfile('wi+locness/' + name).read())
        for level in 'ABC':
            for line in archive.extractfile(f'wi+locness/json/{level}.dev.json'):
                doc = json.loads(line)
                text = doc['text']
                # Coarse text-only genre tags; retain original writing and errors.
                genre = 'letter' if re.match(r'\s*(Dear\b|Hi\b|Hello\b)', text, re.I) else 'essay'
                record = item('wi:' + doc['id'], text, 'human', 'write-improve-2.1', 'non-native', genre, 'learner',
                              cefr=doc['cefr'], original_split='dev', license='LicenseRef-Cambridge-WI-Research-Only')
                if record:
                    rows.append(record)
    write('wi', rows, False)


def uci(refresh):
    url = 'https://archive.ics.uci.edu/static/public/331/sentiment+labelled+sentences.zip'
    path = download(url, 'uci-sentiment.zip')
    rows = []
    with zipfile.ZipFile(path) as archive:
        for filename, genre in [('amazon_cells_labelled.txt', 'product-review'), ('yelp_labelled.txt', 'service-review'), ('imdb_labelled.txt', 'review')]:
            content = archive.read('sentiment labelled sentences/' + filename).decode('utf-8')
            for i, line in enumerate(content.split('\n')):
                if not line.strip():
                    continue
                # Sentiment is unrelated to authorship; never use the 0/1 score as an AI label.
                text, sentiment = line.rsplit('\t', 1)
                record = item(f'uci:{filename}:{i}', text, 'human', 'uci-sentiment-2015', 'casual', genre, 'casual',
                              authors=['Dimitrios Kotzias'], url='https://doi.org/10.24432/C57604',
                              sentiment=sentiment, license='CC-BY-4.0', published='2015-05-29')
                if record:
                    rows.append(record)
    write('uci-reviews', rows[:200], refresh, public=True)


def aeslc():
    url = f'https://codeload.github.com/ryanzhumich/AESLC/tar.gz/{AESLC_REV}'
    path = download(url, 'aeslc.tar.gz')
    rows = []
    with tarfile.open(path) as archive:
        members = sorted((m for m in archive.getmembers() if '/enron_subject_line/test/' in m.name and m.isfile()), key=lambda m: m.name)
        for member in members:
            text = archive.extractfile(member).read().decode('utf-8').split('@subject', 1)[0].strip()
            record = item('aeslc:' + pathlib.PurePosixPath(member.name).name, text, 'human', 'aeslc-2019', 'professional',
                          'email', 'professional', revision=AESLC_REV, original_split='test', license='CC-BY-NC-SA-4.0')
            if record:
                rows.append(record)
            if len(rows) == 120:
                break
    if len(rows) != 120:
        raise RuntimeError(f'AESLC only {len(rows)} eligible test messages')
    write('aeslc', rows, False)


def human_detectors():
    url = f'https://raw.githubusercontent.com/jenna-russell/human_detectors/{HUMAN_DETECTORS_REV}/human_detectors.json'
    data = json.loads(download(url, 'human-detectors-pinned.json').read_text())
    rows = []
    for key, doc in sorted(data.items(), key=lambda kv: int(kv[0])):
        # Use ground truth, NOT human annotator guesses or other detectors' decisions.
        # Avoid republishing the copyrighted human news articles in the same file.
        if doc['ground_truth'] == 'Human-written':
            continue
        if doc['ground_truth'] != 'AI-generated':
            raise ValueError(f'Unknown ground_truth {doc["ground_truth"]}')
        record = item('human-detectors:' + key, doc['article'], 'ai', 'human-detectors-2025', 'dataset-ai',
                      'news', 'formal', generator=doc['generation_model'], revision=HUMAN_DETECTORS_REV,
                      license='LicenseRef-HumanDetectors-Underlying-News',
                      transformation='AI rows only, full article; original news titles/bylines and annotations omitted')
        if record:
            rows.append(record)
    write('human-detectors-ai', rows, False)


def raid():
    # 802 MB on disk, streamed for download and CSV parsing. No pandas/model loads.
    # The immutable published release is identified by its checked ETag and SHA256.
    path = download(RAID_URL, 'raid-train_none.csv', expected_etag=RAID_ETAG)
    domains = {
        'abstracts': ('academic-abstract', 'formal', 'formal'),
        'books': ('narrative', 'literary', 'narrative'),
        'news': ('news', 'formal', 'formal'),
        'poetry': ('poetry', 'literary', 'creative'),
        'recipes': ('instructions', 'instructional', 'instructions'),
        'reddit': ('forum', 'casual', 'casual'),
        'reviews': ('review', 'casual', 'casual'),
        'wiki': ('reference', 'formal', 'formal'),
    }
    models = {'human': 80, 'gpt4': 20, 'chatgpt': 20, 'llama-chat': 20, 'mistral-chat': 20}
    counts = collections.Counter()
    rows = []
    seen = set()
    with path.open(newline='') as f:
        for doc in csv.DictReader(f):
            domain, model = doc['domain'], doc['model']
            if domain not in domains or model not in models or doc['attack'] != 'none':
                continue
            key = (domain, model)
            if counts[key] >= models[model]:
                continue
            genre, register, subset = domains[domain]
            label = 'human' if model == 'human' else 'ai'
            text = doc['generation']
            text_hash = hashlib.sha256(text.encode()).hexdigest()
            if text_hash in seen:
                continue
            record = item('raid:' + doc['id'], text, label, 'raid-2024', subset if label == 'human' else 'dataset-ai',
                          genre, register, generator=model, original_domain=domain,
                          original_split='train', source_id=doc['source_id'],
                          license='LicenseRef-RAID-Underlying-Sources', attack='none')
            if record:
                rows.append(record)
                counts[key] += 1
                seen.add(text_hash)
    missing = {f'{d}/{m}': counts[(d, m)] for d in domains for m in models if counts[(d, m)] < models[m]}
    if missing:
        raise RuntimeError(f'RAID quota not filled (check domain/model names): {missing}')
    write('raid', rows, False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', choices=['public', 'unmasking', 'plos', 'official', 'uci', 'wi', 'raid', 'aeslc', 'human-detectors', 'all'], default='public')
    parser.add_argument('--research', action='store_true', help='Include locally held research-only W&I and RAID; never redistribute')
    parser.add_argument('--refresh-samples', action='store_true', help='Regenerate the small redistributable checked-in samples')
    args = parser.parse_args()
    for path in (RAW, DOWNLOADS, NORMALIZED, SAMPLES):
        path.mkdir(parents=True, exist_ok=True)
    public_jobs = {'unmasking': tweets, 'plos': plos, 'official': official, 'uci': uci}
    selected = list(public_jobs) if args.source in ('public', 'all') else [args.source] if args.source in public_jobs else []
    # Three modest downloads at once; no browser, model or inference process.
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(public_jobs[name], args.refresh_samples) for name in selected]
        for future in futures:
            future.result()
    research_jobs = {'wi': wi, 'raid': raid, 'aeslc': aeslc, 'human-detectors': human_detectors}
    if args.source in research_jobs and not args.research:
        parser.error('Research-only sources require --research; see data/eval/MANIFEST.md')
    if args.research:
        for name, job in research_jobs.items():
            if args.source in (name, 'all', 'public'):
                job()
    receipt_path = RAW / f'fetch-receipt-{args.source}.json'
    receipt_path.write_text(json.dumps(RECEIPTS, indent=2) + '\n')
    print(f'Receipts: {receipt_path.relative_to(ROOT)}', flush=True)


if __name__ == '__main__':
    main()
