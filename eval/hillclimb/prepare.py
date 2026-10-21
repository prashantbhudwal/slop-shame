#!/usr/bin/env python3
"""Stream RAID, deterministic source-grouped splits; never inspect locked test labels for fitting."""
import csv, hashlib, heapq, json, sys, collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CACHE=ROOT/'data/eval/raw/hillclimb'
CHAT={'gpt4','chatgpt','cohere-chat','llama-chat','mistral-chat','mpt-chat'}

def digest(x): return hashlib.sha256(x.encode()).hexdigest()
def split(source):
    p=int(digest('slop-hillclimb-v1:'+source)[:16],16)%100
    return 'train' if p<60 else 'dev' if p<80 else 'test'

def main():
    CACHE.mkdir(parents=True,exist_ok=True)
    if (CACHE/'splits.json').exists():
        print('Splits already exist; reusing immutable manifest'); return
    external=ROOT/'data/eval/raw/normalized/raid.jsonl'
    exclude_ids=set(); exclude_sources=set()
    if external.exists():
        for line in external.open():
            r=json.loads(line); exclude_ids.add(r['id'].removeprefix('raid:')); exclude_sources.add(r['source_id'])
    source=ROOT/'data/eval/raw/downloads/raid-train_none.csv'
    csv.field_size_limit(sys.maxsize)
    heaps=collections.defaultdict(list); humans=collections.defaultdict(list); counts=collections.Counter(); excluded=0
    sha=hashlib.sha256()
    with source.open('rb') as f:
        while b:=f.read(8*1024*1024): sha.update(b)
    with source.open(newline='') as f:
        for i,r in enumerate(csv.DictReader(f)):
            if r['attack']!='none': continue
            words=len(r['generation'].split())
            if not 30<=words<=600: continue
            # Whole source groups, not only overlapping row IDs: no parallel-generation leak.
            if r['id'] in exclude_ids or r['source_id'] in exclude_sources:
                excluded+=1; continue
            sp=split(r['source_id']); model=r['model']; label='human' if model=='human' else 'ai'
            family='human' if label=='human' else 'chat' if model in CHAT else 'base'
            counts[(sp,r['domain'],model,r['decoding'],r['repetition_penalty'])]+=1
            row={k:r[k] for k in ['id','source_id','model','domain','decoding','repetition_penalty']}
            row.update(text=r['generation'],words=words,label=label,family=family)
            if label=='human': humans[sp].append(row); continue
            if family=='base' and sp=='train': continue
            cap=200 if sp=='train' else 75
            if family=='base': cap=12 # informational, never fitted/objective
            key=(sp,r['domain'],model,r['decoding'],r['repetition_penalty'])
            priority=int(digest('sample-v1:'+r['id']),16)
            h=heaps[key]; entry=(-priority,r['id'],row)
            if len(h)<cap: heapq.heappush(h,entry)
            elif entry>h[0]: heapq.heapreplace(h,entry)
            if i and i%100000==0: print(f'streamed {i} rows',flush=True)
    summary={}
    for sp in ['train','dev','test']:
        rows=humans[sp]+[x[2] for k,h in heaps.items() if k[0]==sp for x in h]
        rows.sort(key=lambda x:x['id'])
        out=CACHE/f'{sp}.jsonl'
        with out.open('w') as f:
            for r in rows: f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
        summary[sp]={'count':len(rows),'labels':dict(collections.Counter(r['family'] for r in rows)),
                     'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
                     'sources':len(set(r['source_id'] for r in rows))}
    manifest={'version':1,'csvSha256':sha.hexdigest(),'split':'sha256(slop-hillclimb-v1:source_id)[0:16] modulo 100; 60/20/20',
              'sample':'lowest sha256(sample-v1:id) per domain/model/decoding/penalty, 200 train / 75 dev,test; base 12 informational',
              'excludedExternalIds':len(exclude_ids),'excludedExternalSources':len(exclude_sources),'excludedRows':excluded,
              'splits':summary,'eligibleStrata':[{'key':list(k),'n':v} for k,v in sorted(counts.items())]}
    (CACHE/'splits.json').write_text(json.dumps(manifest,indent=2)+'\n')
    # Only aggregate counts/digests leave the ignored cache.
    (ROOT/'eval/hillclimb/splits.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(summary,indent=2))
if __name__=='__main__': main()
