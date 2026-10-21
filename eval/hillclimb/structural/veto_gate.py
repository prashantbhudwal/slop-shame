#!/usr/bin/env python3
"""Metadata gate: only veto authors' rows are JSON-decoded or emitted.

The combined source necessarily requires a byte-level scan. Holdout bodies are
not decoded, extracted, returned, scored, or copied into the evaluation inputs.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'data/eval/raw/normalized'
TARGET = ROOT / 'data/eval/raw/hillclimb/structural-engine/input-linkedin-veto.jsonl'
authors = json.loads((SOURCE / 'linkedin-influencers-split.json').read_text())
author_field = re.compile(rb'(?:^|,)\s*"author"\s*:\s*("(?:[^"\\]|\\.)*")')
count = 0
with (SOURCE / 'linkedin-influencers.jsonl').open('rb') as source, TARGET.open('wb') as target:
    for raw in source:
        match = author_field.search(raw)
        if match is None:
            raise RuntimeError('Row missing top-level author metadata')
        author = json.loads(match.group(1))
        partition = authors['authors'].get(author)
        if partition is None:
            raise RuntimeError('Author absent from explicit split')
        if partition != 'veto':
            continue
        row = json.loads(raw)
        assert row['author'] == author
        target.write(raw)
        count += 1
assert count == authors['counts']['veto'] == 8189
print(json.dumps({'vetoRows': count, 'holdoutBodiesDecoded': 0, 'destination': str(TARGET.relative_to(ROOT))}))
