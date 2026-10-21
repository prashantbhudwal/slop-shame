#!/usr/bin/env python3
"""Pinned, evaluation-only DetectRL-X ingestion. Python standard library only.

No engine is invoked by ingest. baseline opens ONLY detectrlx-dev.jsonl through
the public TypeScript API, using the project's existing Node/Vite installation.
The released llm_refined_text lineage contradicts the paper; omit it rather
than invent human-ai-polished labels. See eval/hillclimb/DETECTRLX.md.
"""
import argparse
import collections
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
import unicodedata
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / "data/eval/raw/detectrlx"
NORMAL = ROOT / "data/eval/raw/normalized/detectrlx.jsonl"
SPLITS = ROOT / "data/eval/raw/hillclimb"
REV = "ccc9a0a74793dd3448e0da1650b430f5df1b0402"
REPO_REV = "f291775fc1f78d00e52ebbf390d5a1445e05f0af"
BASE = f"https://huggingface.co/datasets/WUJUNCHAO/DetectRL-X/resolve/{REV}/"
STRATEGIES = ["general", "polishing", "condensing", "expanding",
              "backtranslation", "encoder_paraphrasing", "decoder_paraphrasing",
              "seq2seq_paraphrasing"]
FILES = [f"Binary/binary_{s}_open.json" for s in STRATEGIES]
SALT = "detectrlx-v1"
LIMIT = 10_000_000_000
JS_SPACE = "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
WS = re.compile("[" + JS_SPACE + "]+")
GENRES = {"Academic": ("abstract", "formal"), "News": ("news", "formal"),
          "Novel": ("narrative", "literary"), "SEO": ("marketing", "promotional"),
          "Wiki": ("reference", "formal"), "Webtext": ("web", "mixed")}
# Conservative domain-level exclusion: the release has no source URLs or dates
# with which to isolate uncontaminated snapshots inside these source pools.
EXCLUDED_DOMAINS = {"Academic", "News", "SEO", "Wiki"}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def text_hash(text):
    return digest(WS.sub(" ", unicodedata.normalize("NFKC", text)).strip(" ").encode())


def file_hash(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda: f.read(1024 * 1024), b""):
            h.update(b)
    return h.hexdigest()


def save(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")


def json_array(path):
    """Stream a JSON array with raw_decode; memory bounded by chunk + one row."""
    decoder = json.JSONDecoder()
    buffer = ""
    first = True
    with path.open(encoding="utf-8") as f:
        eof = False
        while True:
            if not eof and len(buffer) < 1024 * 1024:
                chunk = f.read(1024 * 1024)
                buffer += chunk
                eof = not chunk
            buffer = buffer.lstrip()
            if first:
                if not buffer.startswith("["):
                    raise ValueError("Expected a JSON array")
                buffer = buffer[1:]
                first = False
                continue
            if buffer.startswith(","):
                buffer = buffer[1:]
                continue
            if buffer.startswith("]"):
                if buffer[1:].strip() or f.read().strip():
                    raise ValueError("Trailing JSON data")
                return
            try:
                obj, end = decoder.raw_decode(buffer)
            except json.JSONDecodeError:
                if eof:
                    raise
                chunk = f.read(1024 * 1024)
                buffer += chunk
                eof = not chunk
                continue
            yield obj
            buffer = buffer[end:]


def metadata():
    WORK.mkdir(parents=True, exist_ok=True)
    receipts = []
    urls = {
        "pinned-api.json": f"https://huggingface.co/api/datasets/WUJUNCHAO/DetectRL-X/revision/{REV}",
        "pinned-tree.json": f"https://huggingface.co/api/datasets/WUJUNCHAO/DetectRL-X/tree/{REV}?recursive=true&expand=false",
        "pinned-card.md": BASE + "README.md",
        "pinned-repo.md": f"https://raw.githubusercontent.com/ATH-MaaS/Marco-LLM/{REPO_REV}/DetectRL-X/README.md",
    }
    for name, url in urls.items():
        path = WORK / name
        if not path.exists():
            with urllib.request.urlopen(url, timeout=90) as response:
                data = response.read()
            with path.open("xb") as f:
                f.write(data)
        receipts.append({"url": url, "bytes": path.stat().st_size,
                         "sha256": file_hash(path)})
    api = json.loads((WORK / "pinned-api.json").read_text())
    assert api["sha"] == REV and not api.get("gated") and not api.get("private")
    assert "This dataset is released under the **MIT License**." in (WORK / "pinned-card.md").read_text()
    tree = json.loads((WORK / "pinned-tree.json").read_text())
    entries = {e["path"]: e for e in tree if e["type"] == "file"}
    planned = sum(entries[name]["size"] for name in FILES)
    assert planned < LIMIT
    return entries, receipts, planned


def ingest():
    targets = [NORMAL, SPLITS / "detectrlx-splits.json"]
    targets += [SPLITS / f"detectrlx-{s}.jsonl" for s in ("train", "dev", "test")]
    targets += [WORK / "ingest.json", WORK / "ambiguous-refined.jsonl", WORK / "ingest.sqlite"]
    if any(p.exists() for p in targets):
        raise SystemExit("Refusing to replace existing DetectRL-X outputs; use a fresh checkout or archive only these outputs.")
    entries, receipts, planned = metadata()
    print(f"Pinned {REV}; planned dataset transfer {planned:,} bytes; one file at a time.", flush=True)
    db_path = WORK / "ingest.sqlite"
    db = sqlite3.connect(db_path)
    db.execute("PRAGMA threads=1")
    db.execute("PRAGMA cache_size=-16000")
    db.executescript("""
        CREATE TABLE external(hash TEXT PRIMARY KEY);
        CREATE TABLE records(hash TEXT PRIMARY KEY, label TEXT, class TEXT, group_id TEXT, body TEXT);
        CREATE TABLE links(hash TEXT, group_id TEXT, PRIMARY KEY(hash,group_id));
        CREATE TABLE groups(id TEXT PRIMARY KEY, excluded TEXT);
        CREATE TABLE originals(group_id TEXT, model TEXT, hash TEXT, PRIMARY KEY(group_id,model));
    """)
    external_receipts = []
    external_paths = sorted((ROOT / "data/eval/raw/normalized").glob("*.jsonl"))
    external_paths += sorted((ROOT / "data/eval/samples").glob("*.jsonl"))
    for path in external_paths:
        external_receipts.append({"file": str(path.relative_to(ROOT)), "sha256": file_hash(path)})
        with path.open(encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    r = json.loads(line)
                    db.execute("INSERT OR IGNORE INTO external VALUES (?)", (text_hash(r["text"]),))
    db.commit()
    stats = collections.Counter()
    by_file = {}
    # A literal future-year mention is an audit flag, not a publication date.
    # The release provides no publication/source URL fields. No dates are invented.
    dates = collections.defaultdict(collections.Counter)
    source_fields = set()
    transferred = 0
    quarantine = (WORK / "ambiguous-refined.jsonl").open("x", encoding="utf-8")
    try:
        for name in FILES:
            entry = entries[name]
            path = WORK / (Path(name).stem + ".download")
            url = BASE + name + "?download=true"
            if not path.exists():
                if transferred + entry["size"] > LIMIT:
                    raise RuntimeError("Transfer budget exceeded")
                h = hashlib.sha256()
                size = 0
                with urllib.request.urlopen(url, timeout=120) as response, path.open("xb") as out:
                    if response.status != 200:
                        raise RuntimeError(f"Unexpected HTTP {response.status}")
                    for chunk in iter(lambda: response.read(1024 * 1024), b""):
                        size += len(chunk)
                        if transferred + size > LIMIT:
                            raise RuntimeError("Transfer budget exceeded")
                        out.write(chunk)
                        h.update(chunk)
                sha = h.hexdigest()
            else:
                size, sha = path.stat().st_size, file_hash(path)
            transferred += size
            if size != entry["size"] or sha != entry["lfs"]["oid"]:
                raise RuntimeError(f"Size/SHA-256 mismatch: {name}")
            receipt = {"url": url, "path": name, "bytes": size, "sha256": sha}
            # A receipt survives parse failures and deletion of raw input.
            save(WORK / (Path(name).stem + ".receipt.json"), receipt)
            receipts.append(receipt)
            counts = collections.Counter()
            strategy = Path(name).stem.removeprefix("binary_").removeprefix("trinary_").removesuffix("_open")
            for row_index, r in enumerate(json_array(path)):
                counts["rows"] += 1
                source_fields.update(r)
                if r["lang"].lower() != "english":
                    continue
                counts["english"] += 1
                domain, generator, upstream = r["domain"], r["model"], r["split"]
                if domain not in GENRES or generator not in ("gpt-4o", "deepseek-v3", "gemini-2.5-flash", "qwen-max"):
                    raise ValueError(f"Unknown domain/model: {domain}/{generator}")
                human_hash = text_hash(r["human_written_text"])
                group = "detectrlx:human:" + human_hash
                excluded = "external-human-source" if db.execute("SELECT 1 FROM external WHERE hash=?", (human_hash,)).fetchone() else None
                db.execute("INSERT OR IGNORE INTO groups VALUES (?,?)", (group, excluded))
                # Unambiguous original field is audited only once, from Binary/general.
                if name == FILES[0]:
                    for y in set(re.findall(r"\b(?:202[2-9]|203\d)\b", r["human_written_text"])):
                        dates[domain][y] += 1
                if domain in EXCLUDED_DOMAINS:
                    counts["excluded_date_domain"] += 1
                    continue
                generated_hash = text_hash(r["llm_generated_text"])
                if name == FILES[0]:
                    db.execute("INSERT OR IGNORE INTO originals VALUES (?,?,?)", (group, generator, generated_hash))
                original = db.execute("SELECT hash FROM originals WHERE group_id=? AND model=?", (group, generator)).fetchone()
                if upstream == "train" and original and original[0] != generated_hash:
                    raise ValueError("Documented identical train invariant violated; audit lineage before continuing")
                actual = "none" if strategy == "general" or upstream == "train" else strategy
                attack = "paraphrasing" if actual.endswith("_paraphrasing") else actual
                candidates = [("human_written_text", "human", "human", "none"),
                              ("llm_generated_text", "ai", "ai-raw" if attack == "none" else "ai-transformed", attack)]
                refined = r.get("llm_refined_text")
                if refined:
                    q = {"group_id": group, "upstream_model": generator, "domain": domain,
                         "upstream_split": upstream, "text_sha256": text_hash(refined), "source_file": name,
                         "reason": "Paper HLT vs card LGT refinement: unresolved input lineage"}
                    quarantine.write(json.dumps(q, ensure_ascii=False) + "\n")
                    counts["quarantined_refined"] += 1
                for field, label, klass, row_attack in candidates:
                    text = r[field]
                    words = len(WS.split(text.strip(JS_SPACE))) if text.strip(JS_SPACE) else 0
                    if not 30 <= words <= 600:
                        stats["outside_length"] += 1
                        continue
                    key = text_hash(text)
                    db.execute("INSERT OR IGNORE INTO links VALUES (?,?)", (key, group))
                    if db.execute("SELECT 1 FROM external WHERE hash=?", (key,)).fetchone():
                        stats["external_duplicate_occurrences"] += 1
                        continue
                    prior = db.execute("SELECT label,class FROM records WHERE hash=?", (key,)).fetchone()
                    if prior:
                        if prior[0] != label:
                            db.execute("UPDATE groups SET excluded='conflicting-authorship' WHERE id=?", (group,))
                            stats["conflicting_label_occurrences"] += 1
                        elif prior[1] != klass:
                            # Unchanged transformations retain their first (raw) classification.
                            stats["unchanged_transform_duplicate_occurrences"] += 1
                        stats["internal_duplicate_occurrences"] += 1
                        continue
                    genre, register = GENRES[domain]
                    out = {"id": "detectrlx:" + key, "text": text, "label": label,
                           "source": "detectrlx", "subset": "formal" if label == "human" and register == "formal" else "detectrlx-" + klass,
                           "words": words, "genre": genre, "register": register,
                           "model": generator if label == "ai" else "human", "domain": domain,
                           "attack": row_attack, "attack_variant": actual if label == "ai" else "none",
                           "slopClass": klass, "slopLabel": "negative" if klass in ("human", "human-ai-polished") else "positive",
                           "group_id": group, "source_id": group,
                           "source_file": name, "source_row": row_index, "source_field": field,
                           "upstream_split": upstream, "revision": REV,
                           "license": "LicenseRef-DetectRLX-Underlying-Sources",
                           "human_date_evidence": "paper pre-2022 assertion; row dates absent"}
                    if row_attack in ("polishing", "condensing", "expanding"):
                        out["refiner_model"] = "qwen-max"
                    db.execute("INSERT INTO records VALUES (?,?,?,?,?)", (key, label, klass, group, json.dumps(out, ensure_ascii=False)))
            db.commit()
            by_file[name] = dict(counts)
            path.unlink()
            print(f"{name}: verified {size:,} bytes, {dict(counts)}; raw removed", flush=True)
    finally:
        quarantine.close()
    # Shared output texts can connect two human sources: union BEFORE splitting,
    # even when the duplicate record itself was removed.
    parent = {r[0]: r[0] for r in db.execute("SELECT id FROM groups")}
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    def union(a, b):
        a, b = find(a), find(b)
        if a != b:
            parent[max(a, b)] = min(a, b)
    last_hash = last_group = None
    for key, group in db.execute("SELECT hash,group_id FROM links ORDER BY hash,group_id"):
        if key == last_hash:
            union(last_group, group)
        last_hash, last_group = key, group
    excluded_roots = {find(g) for g, in db.execute("SELECT id FROM groups WHERE excluded IS NOT NULL")}
    assignment = {}
    for group in parent:
        root = find(group)
        n = int(digest(f"{SALT}:{root}".encode())[:16], 16) % 100
        assignment[group] = ("train" if n < 60 else "dev" if n < 80 else "test")
    sizes = {s: collections.Counter() for s in ("train", "dev", "test")}
    counts = {f: collections.defaultdict(collections.Counter) for f in ("domain", "model", "attack", "label", "slopClass")}
    NORMAL.parent.mkdir(parents=True, exist_ok=True)
    handles = {s: (SPLITS / f"detectrlx-{s}.jsonl").open("x", encoding="utf-8") for s in sizes}
    kept_groups = set()
    try:
        with NORMAL.open("x", encoding="utf-8") as out:
            for _, body in db.execute("SELECT hash,body FROM records ORDER BY hash"):
                r = json.loads(body)
                if find(r["group_id"]) in excluded_roots:
                    stats["excluded_group_rows"] += 1
                    continue
                r["split_group_id"] = find(r["group_id"])
                split = assignment[r["group_id"]]
                kept_groups.add(r["group_id"])
                line = json.dumps(r, ensure_ascii=False) + "\n"
                out.write(line)
                handles[split].write(line)
                sizes[split][r["label"]] += 1
                if r["slopClass"] != r["label"]:
                    sizes[split][r["slopClass"]] += 1
                sizes[split]["total"] += 1
                for field in counts:
                    counts[field][r[field]][r["label"]] += 1
    finally:
        for f in handles.values():
            f.close()
        db.close()
    manifest = {"version": 1, "revision": REV, "salt": SALT,
                "usage": "evaluation-only", "fitting_allowed": False,
                "algorithm": "int(sha256(salt + ':' + split_group_id)[:16],16) % 100; <60 train, <80 dev, else test",
                "grouping": "NFKC/ECMAScript-whitespace-normalized human source hash; shared output hashes union source groups with lexicographically smallest root",
                "groups": {g: {"split": assignment[g], "split_group_id": find(g)} for g in sorted(kept_groups)},
                "splits": {s: {"counts": dict(sizes[s]), "sha256": file_hash(SPLITS / f"detectrlx-{s}.jsonl")} for s in sizes},
                "normalized_sha256": file_hash(NORMAL), "existing_inputs": external_receipts,
                "test_engine_evaluated": False}
    save(SPLITS / "detectrlx-splits.json", manifest)
    report = {"revision": REV, "planned_dataset_bytes": planned,
              "usage": "evaluation-only", "fitting_allowed": False,
              "dataset_bytes": transferred, "receipts": receipts, "files": by_file,
              "filters": dict(stats), "counts": {k: dict(v) for k, v in counts.items()},
              "excluded_date_domains": sorted(EXCLUDED_DOMAINS),
              "future_year_mentions_not_publication_dates": {k: dict(v) for k, v in dates.items()},
              "released_fields": sorted(source_fields), "split_counts": {s: dict(v) for s, v in sizes.items()}}
    save(WORK / "ingest.json", report)
    db_path.unlink()
    print(json.dumps({"counts": report["counts"], "splits": report["split_counts"]}, indent=2))


BASELINE_JS = r"""
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {loadCorpus} from './eval/lib/corpus.mjs';
const root=process.cwd(), hash=x=>createHash('sha256').update(x).digest('hex');
function tree() {
 const h=createHash('sha256');
 function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=resolve(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.ts')){h.update(relative(root,p));h.update(readFileSync(p));}}}
 walk(resolve(root,'src/lib/engine'));return h.digest('hex');
}
const before=tree(), file='data/eval/raw/hillclimb/detectrlx-dev.jsonl';
const {items,receipts,duplicates}=await loadCorpus([file],{minWords:30,maxWords:600});
if(duplicates)throw Error('Unexpected duplicate dev texts');
const server=await createServer({configFile:false,server:{middlewareMode:true,watch:null,hmr:false},appType:'custom',logLevel:'error'});
let rows;
try {
 const {analyzePost}=await server.ssrLoadModule('/src/lib/engine/index.ts');
 rows=items.map(r=>{const {score}=analyzePost({text:r.text});if(!Number.isInteger(score)||score<0||score>100)throw Error('Invalid score');const {text,...m}=r;return {...m,score};});
} finally {await server.close();}
if(before!==tree())throw Error('Engine changed during dev evaluation');
function metric(rs){
 const h=rs.filter(r=>r.label==='human'),a=rs.filter(r=>r.label==='ai');
 const n=rs.filter(r=>r.slopLabel==='negative'),p=rs.filter(r=>r.slopLabel==='positive');
 const hits=rs=>rs.filter(r=>r.score>=40).length, rate=(k,n)=>n?k/n:null;
 return {count:rs.length,human:h.length,humanFP:hits(h),humanFPR:rate(hits(h),h.length),
  ai:a.length,aiTP:hits(a),aiRecall:rate(hits(a),a.length),negative:n.length,slopFP:hits(n),
  slopFPR:rate(hits(n),n.length),positive:p.length,slopTP:hits(p),slopRecall:rate(hits(p),p.length)};
}
const results={overall:metric(rows)};
for(const field of ['domain','model','attack','slopClass']){
 const keys=[...new Set(rows.map(r=>r[field]))].sort();
 if(field==='slopClass'&&!keys.includes('human-ai-polished'))keys.push('human-ai-polished');
 results[field]=Object.fromEntries(keys.map(k=>[k,metric(rows.filter(r=>r[field]===k))]));
}
const report={timestamp:new Date().toISOString(),threshold:40,engineSha256:before,
 gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,
 command:'python3 scripts/eval/detectrlx.py baseline',inputs:receipts,testEngineEvaluated:false,results};
writeFileSync('data/eval/raw/detectrlx/dev-baseline.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
writeFileSync('data/eval/raw/detectrlx/dev-predictions.jsonl',rows.map(r=>JSON.stringify(r)).join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify(report,null,2));
"""


def baseline():
    if (WORK / "dev-baseline.json").exists() or (WORK / "dev-predictions.jsonl").exists():
        raise SystemExit("Refusing to overwrite an existing dev baseline.")
    env = dict(os.environ, OMP_NUM_THREADS="2", OPENBLAS_NUM_THREADS="2",
               UV_THREADPOOL_SIZE="1", GOMAXPROCS="2")
    subprocess.run(["node", "--v8-pool-size=1", "--input-type=module"], input=BASELINE_JS, text=True,
                   cwd=ROOT, env=env, check=True)


def validate():
    """Integrity checks may read test text for hashing; never load an engine."""
    manifest = json.loads((SPLITS / "detectrlx-splits.json").read_text())
    ids, hashes, group_splits = set(), set(), {}
    counts = {}
    for split in ("train", "dev", "test"):
        path = SPLITS / f"detectrlx-{split}.jsonl"
        assert file_hash(path) == manifest["splits"][split]["sha256"]
        c = collections.Counter()
        with path.open(encoding="utf-8") as f:
            for line in f:
                r = json.loads(line)
                key = text_hash(r["text"])
                assert key not in hashes and r["id"] not in ids
                hashes.add(key)
                ids.add(r["id"])
                assert r["words"] == len(WS.split(r["text"].strip(JS_SPACE)))
                assert 30 <= r["words"] <= 600
                assert r["domain"] not in EXCLUDED_DOMAINS
                assert r["slopClass"] in ("human", "ai-raw", "ai-transformed")
                assert (r["label"] == "human") == (r["slopLabel"] == "negative")
                root = r["split_group_id"]
                assert group_splits.setdefault(root, split) == split
                n = int(digest(f"{SALT}:{root}".encode())[:16], 16) % 100
                assert split == ("train" if n < 60 else "dev" if n < 80 else "test")
                assert manifest["groups"][r["group_id"]]["split"] == split
                c[r["label"]] += 1
                if r["slopClass"] != r["label"]:
                    c[r["slopClass"]] += 1
                c["total"] += 1
        assert dict(c) == manifest["splits"][split]["counts"], (split, dict(c))
        counts[split] = dict(c)
    assert file_hash(NORMAL) == manifest["normalized_sha256"]
    with NORMAL.open(encoding="utf-8") as f:
        normalized_ids = {json.loads(line)["id"] for line in f}
    assert normalized_ids == ids
    external = set()
    for receipt in manifest["existing_inputs"]:
        path = ROOT / receipt["file"]
        assert file_hash(path) == receipt["sha256"], f"Deduplication input changed: {path}"
        with path.open(encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    external.add(text_hash(json.loads(line)["text"]))
    assert not hashes.intersection(external)
    report = {"checks": ["hashes", "schema/length", "exact deduplication", "external deduplication",
                         "source grouping", "split isolation", "split counts", "slop classes"],
              "counts": counts, "unique_records": len(ids), "split_components": len(group_splits),
              "test_engine_evaluated": False}
    save(WORK / "integrity.json", report)
    print(json.dumps(report, indent=2))


def document():
    """Write aggregate-only documentation; never copy source bodies or snippets."""
    ingest_report = json.loads((WORK / "ingest.json").read_text())
    split_report = json.loads((SPLITS / "detectrlx-splits.json").read_text())
    base = json.loads((WORK / "dev-baseline.json").read_text())
    card = f"https://huggingface.co/datasets/WUJUNCHAO/DetectRL-X/blob/{REV}/README.md"
    repo = f"https://github.com/ATH-MaaS/Marco-LLM/blob/{REPO_REV}/DetectRL-X/README.md"
    lines = ["# DetectRL-X English evaluation receipt", "",
             "Verified and ingested 2026-10-21. **Evaluation-only; never commit, bundle, or use this corpus to derive product weights.** No dataset prose is quoted here. Existing RAID data/splits were not changed; no DetectRL-X test text was passed to an engine.", "",
             "## Verification and rights", "",
             f"Dataset: [WUJUNCHAO/DetectRL-X]({card}), revision `{REV}`. HF API reports public, non-gated access. The exact card statement (Markdown emphasis removed) is: “This dataset is released under the MIT License.” YAML: `license: mit`. The file tree has no standalone LICENSE text.", "",
             f"The [paper-linked repository README]({repo}), commit `{REPO_REV}`, conflicts with HF: “This dataset is licensed under the Apache License 2.0. Usage is strictly restricted to non-commercial academic research purposes.” This is **not** clean permission to fit distributable weights. All text is conservatively `LicenseRef-DetectRLX-Underlying-Sources`, private evaluation only. Source rights remain unresolved regardless of the card. One excluded academic source even carries a CC BY-NC notice.", "",
             "Paper: Wu et al., [DetectRL-X: Towards Reliable Multilingual and Real-World LLM-Generated Text Detection](https://aclanthology.org/2026.acl-long.1773/), ACL 2026, DOI `10.18653/v1/2026.acl-long.1773`. This verification supersedes the permissive-rights and source/date claims in `research/ai-detection-benchmarks-2026.md`; that existing file was left untouched as instructed.", "",
             "## Human provenance and date check", "",
             "The paper (§3.1.3, Appendix B.2) asserts pre-2022 publication, which would precede November 2022. It names DOAJ PDFs (Academic), BBC/other news (News), Common Crawl fiction (Novel), public/proprietary corporate materials (SEO), Wikipedia (Wiki), and Common Crawl web pages (Webtext). It does **not** identify XSum, Yelp or WritingPrompts as its sources. No row-level publication dates, URLs, original document IDs, or archive revisions are released.", "",
             "**The universal date claim fails the released English data.** Manual date-context checks distinguish completed events/publication metadata from future plans, fictional dates, phone numbers and numeric product codes. Four whole domains and their AI descendants are excluded because clean source snapshots cannot be separated reliably:", "",
             "| Excluded domain | Observed counterexample, paraphrased | Canonical human-text SHA-256 |",
             "| --- | --- | --- |",
             "| Academic | November 2023 journal issue / 2023 DOI; 2025 PDF download metadata. | `d762752b08b7cc0b8f13102ff8e15fcacec6b8a3f312874db2d5c065d21cec72` |",
             "| News | Reports photos already having gone viral on 2024-03-31. | `17c7204c1611a5517a0be1a15e174d3d332359525369eabe06ddec4da231e23b` |",
             "| SEO | Reports a business award already received in 2024. | `ba78e800ef154e9ba6bb1c18680cdd8dedf0592624f463984365b2ff9f9e08de` |",
             "| Wiki | Reports a completed leadership appointment on 2023-01-13. | `903b4714cd66ec920171a63368c308a7937cf699917d5f9fbc312060c1030b42` |", "",
             "Novel and Webtext are retained on the authors’ pre-2022 attestation, **not independently verified publication dates**. Their inspected later-year references were fiction, forecasts, contract endpoints, targets, or a phone number; a year mention alone is not a publication date. The release cannot prove every remaining sample predates ChatGPT, nor exclude older automated writing. Each strategy has 15,600 English pair rows; 10,400 belong to the excluded domains and 5,200 to the retained domains, before length filtering/deduplication.", "",
             "## Lineage and the owner’s slop target", "",
             "`label` preserves authorship for compatibility with `eval/lib/corpus.mjs`: originals are `human`; model output is `ai`. **Use `slopLabel`/`slopClass`, not authorship alone, for the owner’s target.** `slopLabel` is negative for human originals and any verified human-draft AI revisions; positive for raw or subsequently transformed AI generations.", "",
             "| Released field / workflow | slopClass | slopLabel | Decision |",
             "| --- | --- | --- | --- |",
             "| Binary `human_written_text` | human | negative | Original human field. |",
             "| Binary/general `llm_generated_text`, including repeated train rows | ai-raw | positive | Paper describes automated summarize-then-generate from human source text; no manual draft revision is established. |",
             "| Binary strategy test `llm_generated_text` | ai-transformed | positive | Card explicitly says strategies transform LLM-generated text; polishing/condensing/expanding apply to LGT in Binary. |",
             "| Ternary `llm_refined_text` | unresolved | excluded | Paper defines HLT as human-origin refinement, but both card and repo field table describe this field as refinement of LGT. Neither publishes parent-field links/export code. Assigning human-ai-polished would be a guess. |", "",
             "**There are zero verified `human-ai-polished` negatives in this ingest.** That baseline cell is unavailable, not a measured zero false-positive rate. Ternary bundles are not downloaded in full or used. Four 64 KiB schema probes (including two Ternary files) were receipted and removed. The paper says Qwen-Max performs refinement; it does not justify assigning every transformed output to its original generator as refiner. Original `model` is retained and `refiner_model` is supplied only for the documented refinement operations.", "",
             "All insertion/deletion/substitution/zero-width perturbation and truncated length bundles are omitted. Keep `attack_variant` to distinguish the three paraphrasers even though `attack` groups them as `paraphrasing`. A text unchanged by a transformation keeps its first/raw provenance after deduplication.", "",
             "## Normalization and counts", "",
             "Full texts only, 30–600 ECMAScript whitespace words; no truncation, spelling repair or tell removal. Exact deduplication uses NFKC plus ECMAScript whitespace collapse, matching the corpus loader. It checks all pre-existing `raw/normalized/*.jsonl` and committed `samples/*.jsonl`; input hashes are pinned in the split manifest. If an existing corpus contains a human source, the entire related DetectRL-X group is excluded. Shared output hashes union source groups before splitting to prevent cross-split duplicate leakage.", ""]
    for field in ("label", "slopClass", "domain", "model", "attack"):
        lines += [f"### Counts by {field}", "", "| Value | Human | AI | Total |", "| --- | ---: | ---: | ---: |"]
        values = dict(ingest_report["counts"][field])
        if field == "slopClass":
            values.setdefault("human-ai-polished", {})
        for key, c in sorted(values.items()):
            lines.append(f"| {key} | {c.get('human',0):,} | {c.get('ai',0):,} | {sum(c.values()):,} |")
        lines.append("")
    lines += ["### Filtering receipt", "", "```json", json.dumps(ingest_report["filters"], indent=2), "```", "",
              "### Grouped splits", "",
              "Salt: `detectrlx-v1`. `group_id` / `source_id` hash the normalized paired human text; `split_group_id` is the smallest hash in any duplicate-connected component. If no upstream group exists, text hashing supplies it. Split is `int(sha256('detectrlx-v1:' + split_group_id)[:16], 16) % 100`: 0–59 train, 60–79 dev, 80–99 test. This is a 60/20/20 group allocation, not an exact row quota. Upstream train/test tags are retained as metadata, not reused as these splits. No stratified sampling or test-guided selection.", "",
              "| Split | Human | AI | Total | SHA-256 |", "| --- | ---: | ---: | ---: | --- |"]
    for split, v in split_report["splits"].items():
        c = v["counts"]
        lines.append(f"| {split} | {c.get('human',0):,} | {c.get('ai',0):,} | {c['total']:,} | `{v['sha256']}` |")
    lines += ["", f"Normalized JSONL SHA-256: `{split_report['normalized_sha256']}`. Manifest: `data/eval/raw/hillclimb/detectrlx-splits.json`. **The test split has not been scored.**", "",
              "## Current-engine dev baseline", "", f"Threshold: score ≥40. Engine-tree SHA-256 `{base['engineSha256']}`; Git HEAD `{base['gitHead']}` (dirty working-tree engine, not merely HEAD); Node `{base['node']}`; run `{base['timestamp']}`. Vite loads only public `src/lib/engine/index.ts` and calls `analyzePost({{text}})`. Engine hash must remain identical across evaluation. No weight fitting or tuning is performed.", ""]
    def rate(k, n):
        return f"{k:,}/{n:,} ({100*k/n:.2f}%)" if n else "n/a"
    for field in ("overall", "slopClass", "domain", "model", "attack"):
        values = {"overall": base["results"]["overall"]} if field == "overall" else base["results"][field]
        lines += [f"### Dev by {field}", "", "| Group | Human FP ≥40 | Authorship AI recall ≥40 | Slop-negative FP ≥40 | Slop-positive recall ≥40 |", "| --- | ---: | ---: | ---: | ---: |"]
        for key, m in values.items():
            lines.append(f"| {key} | {rate(m['humanFP'],m['human'])} | {rate(m['aiTP'],m['ai'])} | {rate(m['slopFP'],m['negative'])} | {rate(m['slopTP'],m['positive'])} |")
        lines.append("")
    lines += ["Model rows describe original generators. Human originals belong to the `human` model row and `none` attack row, so FP denominators for AI-only cells are n/a. The zero-size polished-negative cell means missing coverage. Reading test metadata for integrity/counts does not involve scoring.", "",
              "## Downloads, receipts and storage", "",
              f"Full HF API tree: 32,984,288,798 bytes including metadata. Selected eight Binary bundles: **{ingest_report['dataset_bytes']:,} bytes ({ingest_report['dataset_bytes']/1e9:.3f} GB)**. No English-only files are offered. All seven other languages are discarded during streaming. Each complete file is size-checked and SHA-256 checked against HF LFS, parsed one at a time, then deleted. Raw peak is the largest selected file, 1,017,914,092 bytes; normalized/split outputs are additional. This remains below the 10 GB transfer / 5 GB task-storage budget. Small verification probes and metadata are additional (see receipts). No browsers or model calls; Python stdlib, one ingest process, SQLite `threads=1`; baseline worker pools capped at two.", "",
              f"Resolve URL prefix: `{BASE}` (each full download appends its path and `?download=true`).", "",
              "| Pinned path | Bytes | SHA-256 |", "| --- | ---: | --- |"]
    for r in ingest_report["receipts"]:
        if "path" in r:
            lines.append(f"| `{r['path']}` | {r['bytes']:,} | `{r['sha256']}` |")
    lines += ["", "Per-file URL/size/hash receipts, metadata copies, date audit and the aggregate ingest/baseline reports live in ignored `data/eval/raw/detectrlx/`. No unneeded full downloads remain. Ternary is omitted on documentation evidence; no English Ternary rows or guessed third-field classes enter the corpus.", "",
              "## Reproduction", "", "From the repo root, with the existing Node/Vite dependencies installed:", "", "```sh",
              "python3 scripts/eval/detectrlx.py verify",
              "OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python3 scripts/eval/detectrlx.py ingest",
              "python3 scripts/eval/detectrlx.py validate",
              "python3 scripts/eval/detectrlx.py baseline",
              "python3 scripts/eval/detectrlx.py document", "```", "",
              "Commands refuse to overwrite existing outputs. Reproduce in a fresh checkout with the same pre-existing deduplication inputs, or archive only this task’s `detectrlx*` outputs and its own receipt directory first; never delete/modify another agent’s hillclimb files. `document` creates only this report and does not edit MANIFEST. `baseline` has no test-file option and never loads test. The script’s frozen domain exclusion is based on the date audit above, not any engine result.", "",
              "## Limits for fitting weights", "",
              "Do not fit product weights from this evaluation-only ingest: unresolved underlying rights and the upstream non-commercial restriction remain. Four of six domains are absent after the failed date check. Retained human dates are attested, not independently certified. There are no verified effortful AI-polished negatives, and authorship labels alone implement the wrong target. Modern paid/frontier generators do not establish cheap-model quality or prove lack of user effort; the classes are workflow proxies. Near-duplicate documents/authors cannot be grouped without missing original IDs, and a 30–600-word window introduces selection bias. This is a useful limited modern-model stress test, not adequate supervision for the owner’s full slop definition.", ""]
    target = ROOT / "eval/hillclimb/DETECTRLX.md"
    with target.open("x", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(target.relative_to(ROOT))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("verify", "ingest", "validate", "baseline", "document"))
    args = parser.parse_args()
    if args.command == "verify":
        entries, receipts, planned = metadata()
        print(json.dumps({"revision": REV, "dataset_bytes": planned,
                          "selected": [{"path": n, "bytes": entries[n]["size"], "sha256": entries[n]["lfs"]["oid"]} for n in FILES],
                          "metadata_receipts": receipts}, indent=2))
    elif args.command == "ingest":
        ingest()
    elif args.command == "baseline":
        baseline()
    elif args.command == "validate":
        validate()
    else:
        document()


if __name__ == "__main__":
    main()
