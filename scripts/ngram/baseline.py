#!/usr/bin/env python3
"""Official Google Books v3 baseline; Python stdlib, one process, sequential I/O.
Run `python3 scripts/ngram/baseline.py plan`, then `... run`.
All corpus downloads are streamed from GCS; no downloaded shard is retained.
"""
import ast,bisect,collections,datetime,gzip,hashlib,html,io,json,os,re,sys,time,urllib.parse,urllib.request,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'data/eval/raw/ngram'; OUT.mkdir(parents=True,exist_ok=True)
BASE='https://storage.googleapis.com/books/ngrams/books/20200217/eng/'
LIMIT=100_000_000_000
QUOTES=str.maketrans({'\u2018':"'",'\u2019':"'",'\u201c':'"','\u201d':'"'})
def norm(s): return ' '.join(s.translate(QUOTES).lower().split())
def save(name,obj): (OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def get(u):
 with urllib.request.urlopen(u,timeout=120) as r: return r.read()
def candidates():
 found=collections.defaultdict(set); skipped=[]; inputs={}
 # Lex the restricted TS data syntax without executing any project code.
 lex=re.compile(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|[^\s]')
 for p in sorted(list((ROOT/'src/lib/engine/packs').glob('*.ts'))+list((ROOT/'src/lib/engine/packs/vendor').glob('*.ts'))):
  text=p.read_text(); name=str(p.relative_to(ROOT)); inputs[name]=hashlib.sha256(text.encode()).hexdigest()
  toks=[t for t in lex.findall(text) if not t.startswith(('//','/*'))]
  for i,t in enumerate(toks[:-2]):
   if t not in ('phrases','"phrases"',"'phrases'"):continue
   if toks[i+1:i+3]!=[':', '[']:continue
   j=i+3
   while toks[j]!=']':
    t=toks[j]
    if t==',':j+=1;continue
    if t[0] not in "\"'":raise ValueError(f'Nonliteral phrases entry: {name} {t}')
    value=json.loads(t) if t[0]=='"' else ast.literal_eval(t)
    found[norm(value)].add(name);j+=1
 p=ROOT/'src/lib/engine/packs/vendor/DROPPED.md'; text=p.read_text();inputs[str(p.relative_to(ROOT))]=hashlib.sha256(text.encode()).hexdigest()
 for line in text.splitlines():
  if not line.startswith('| ') or line.startswith(('| Source entry','| ---')):continue
  cols=re.split(r'(?<!\\)\|',line)[1:-1]
  assert len(cols)==3,line
  source=cols[0].strip()
  value=cols[1].strip().replace('\\|','|')
  # The report does not retain kind for dropped rows. Regex metacharacters
  # identify regex sources; punctuation ? and parentheses are kept when prose.
  known_literal=source.startswith(('paech-sampler:','paech-essays:','kobak:','slop-radar:src/database/phrases-en.json:','zeroslop:data/patterns.json:lexicon.','zeroslop:data/patterns.json:riders.','zeroslop:data/patterns.json:rider_triggers['))
  if not known_literal and re.search(r'\\[bwsdBWSDAZ]|\(\?|\[[^]]*\]|\{\d|[|^$]|\.\*|\.\+|\)\??',value):
   skipped.append(value);continue
  found[norm(value)].add(str(p.relative_to(ROOT)))
 p=ROOT/'src/lib/engine/packs/vendor/report.json';b=p.read_bytes();inputs[str(p.relative_to(ROOT))]=hashlib.sha256(b).hexdigest();report=json.loads(b)
 for key in ('rules','overlaps'):
  for row in report[key]:
   if row['kind']=='phrase':found[norm(row['value'])].add('report.json:'+key)
 for row in report['merges']:
  if '.phrase-' in row['owner']: found[norm(row['value'])].add('report.json:merges')
 found.pop('',None)
 (OUT/'candidates.txt').write_text('\n'.join(sorted(found))+'\n')
 save('candidate-sources.json',{'count':len(found),'inputs':inputs,'sources':{k:sorted(v) for k,v in sorted(found.items())},'skippedRegexes':sorted(set(skipped))})
 return sorted(found)
def tokenize(s):
 # Corpus-attested mapping. Some surfaces have multiple exported spellings;
 # unavailable contraction phrases are never estimated from intact unigrams.
 s=s.translate(QUOTES).replace('\u2011','-').replace('\u2010','-')
 s=re.sub(r"(?i)\b(can)(not)\b",r'\1 \2',s)
 s=re.sub(r"(?i)(\w+)('(s|re|ve|ll|d|m))\b",r'\1 \2',s)
 return re.findall(r"n't|'(?:s|re|ve|ll|d|m)\b|[\w]+|[^\w\s]",s)
def list_objects(n):
 # Public XML bucket listing supplies size+ETag for every shard without
 # thousands of HEAD requests. It accesses only the specified eng prefix.
 prefix=f'ngrams/books/20200217/eng/{n}-'; marker='';rows=[]
 ns={'s':'http://doc.s3.amazonaws.com/2006-03-01'}
 while True:
  q=urllib.parse.urlencode({'prefix':prefix,'max-keys':1000,'marker':marker})
  b=get('https://storage.googleapis.com/books?'+q); tree=ET.fromstring(b)
  for e in tree.findall('s:Contents',ns):
   rows.append({'name':e.findtext('s:Key',namespaces=ns).split('/')[-1], 'size':int(e.findtext('s:Size',namespaces=ns)), 'etag':e.findtext('s:ETag',namespaces=ns)})
  if tree.findtext('s:IsTruncated',namespaces=ns)!='true':break
  marker=tree.findtext('s:NextMarker',namespaces=ns)
 return rows

def variant_shards(word,starts):
 # Enumerate shard intersections, not 2**len(word) spellings. Lexical min/max
 # suffixes prune any subtree contained within a single shard.
 choices=[sorted(set((c.lower(),c.upper()))) for c in word]
 lo=['']*(len(word)+1); hi=lo.copy()
 for i in range(len(word)-1,-1,-1):lo[i]=choices[i][0]+lo[i+1];hi[i]=choices[i][-1]+hi[i+1]
 result=set()
 def visit(prefix,i):
  low=bisect.bisect_right(starts,prefix+lo[i])-1; high=bisect.bisect_right(starts,prefix+hi[i])-1
  if low==high:result.add(max(0,low));return
  for c in choices[i]:visit(prefix+c,i+1)
 visit('',0);return result

def plan():
 phrases=candidates(); queries=collections.defaultdict(set)
 for phrase in phrases:
  t=tokenize(phrase);n=len(t)
  if 1<=n<=5:queries[n].add(' '.join(t))
  elif n>5:
   for i in range(n-4):queries[5].add(' '.join(t[i:i+5]))
 # Also collect untagged tokenizer controls, with no bearing on candidate count.
 queries[1].update(["it's","don't","state-of-the-art","it","'s","do","n't","state","-","of","the","art","don","t","n","'","can","ca","cannot","wo","won't"])
 prior=json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else {}
 manifest={};
 for n in range(1,6):
  path=OUT/f'eng-{n}-ngrams_exports.html'
  if not path.exists():path.write_bytes(get(BASE+path.name))
  links=[(u.replace('http:','https:'),html.unescape(v)) for u,v in re.findall(r'<a href="([^"]+\.gz)">(.*?)</a>',path.read_text())]
  starts=[v for u,v in links];assert starts==sorted(starts)
  cached=prior.get(str(n))
  if cached:
   sizes={r['name']:r for r in cached['shards']};all_bytes=cached['allBytes']
  else:
   objects=list_objects(n);sizes={r['name']:r for r in objects};all_bytes=sum(r['size'] for r in objects)
  indices=set()
  for phrase in queries[n]:indices.update(variant_shards(phrase,starts))
  selected=[]
  for i in sorted(indices):
   u,label=links[i];name=u.rsplit('/',1)[1]
   if name not in sizes:
    with urllib.request.urlopen(urllib.request.Request(u,method='HEAD'),timeout=90) as response:
     sizes[name]={'name':name,'size':int(response.headers['Content-Length']),'etag':response.headers['ETag']}
   row={**sizes[name],'url':u,'start':label,'end':starts[i+1] if i+1<len(starts) else None};selected.append(row)
  manifest[str(n)]={'allShardCount':len(links),'allBytes':all_bytes,'neededShardCount':len(selected),'neededBytes':sum(r['size'] for r in selected),'shards':selected}
  print(f"n={n}: {len(selected)}/{len(links)} shards, {manifest[str(n)]['neededBytes']/1e9:.3f} GB needed; {manifest[str(n)]['allBytes']/1e9:.3f} GB all",flush=True)
  save('manifest.json',manifest)
 save('queries.json',{str(n):sorted(q) for n,q in queries.items()});print('CANDIDATES',len(phrases),flush=True)

class Meter(io.RawIOBase):
 def __init__(self,response):self.response=response;self.count=0;self.sha=hashlib.sha256()
 def readable(self):return True
 def readinto(self,b):
  chunk=self.response.read(len(b));b[:len(chunk)]=chunk;self.count+=len(chunk);self.sha.update(chunk);return len(chunk)

def sum_years(parts):
 total=volume=0;yearly={}
 for part in parts:
  fields=part.strip().split(b',')
  if len(fields)!=3:raise ValueError('Expected v3 YEAR,MATCH,VOLUME')
  year=int(fields[0])
  if 2000<=year<=2019:
   m,v=map(int,fields[1:]);total+=m;volume+=v;yearly[str(year)]=[m,v]
 return total,volume,yearly

def run():
 os.nice(10)
 manifest=json.loads((OUT/'manifest.json').read_text()); queries=json.loads((OUT/'queries.json').read_text())
 checkpoint=OUT/'progress.json';state=json.loads(checkpoint.read_text()) if checkpoint.exists() else {'processed':[],'counts':{},'variants':{},'denominators':{},'compressedBytes':0}
 completed={s['name'] for s in state['processed']}
 for n in range(1,6):
  section=manifest[str(n)];pending=[r for r in section['shards'] if r['name'] not in completed]
  if state['compressedBytes']+sum(r['size'] for r in pending)>LIMIT:
   state['stoppedBeforeN']=n;save('progress.json',state);print(f'STOP: n={n} exceeds transfer budget',flush=True);break
  path=OUT/f'totalcounts-{n}'
  if not path.exists():path.write_bytes(get(BASE+path.name))
  years={}
  for part in path.read_text().strip().split():
   fields=list(map(int,part.split(',')));assert len(fields)==4
   if 2000<=fields[0]<=2019:years[str(fields[0])]=fields[1:]
  assert set(years)==set(map(str,range(2000,2020)))
  state['denominators'][str(n)]={'matchCount':sum(v[0] for v in years.values()),'years':years,'url':BASE+path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
  targets={q.encode():q for q in queries[str(n)]}
  for shard in pending:
   started=time.monotonic();hits=collections.defaultdict(lambda:[0,0]);variants={};lines=0
   print('START',shard['name'],f"{shard['size']/1e9:.3f} GB",flush=True)
   with urllib.request.urlopen(shard['url'],timeout=120) as response:
    assert response.status==200,response.status
    assert int(response.headers['Content-Length'])==shard['size']
    meter=Meter(response)
    with io.BufferedReader(meter,buffer_size=2**20) as buf, gzip.GzipFile(fileobj=buf) as data:
     for line in data:
      lines+=1;ngram,_,rest=line.partition(b'\t')
      if b'_' in ngram:continue # excludes POS-suffixed and standalone POS forms
      key=ngram.lower() if ngram.isascii() else ngram.decode('utf-8').lower().encode()
      if key not in targets:continue
      m,v,yearly=sum_years(rest.rstrip(b'\n').split(b'\t'))
      query=targets[key];hits[query][0]+=m;hits[query][1]+=v
      variants[ngram.decode()]={'query':query,'matchCount':m,'volumeCount':v,'years':yearly}
   assert meter.count==shard['size'],(meter.count,shard['size'])
   for query,(m,v) in hits.items():
    count=state['counts'].setdefault(str(n),{}).setdefault(query,[0,0]);count[0]+=m;count[1]+=v
   state['variants'].setdefault(str(n),{}).update(variants)
   state['compressedBytes']+=meter.count
   state['processed'].append({**shard,'sha256':meter.sha.hexdigest(),'bytesRead':meter.count,'lines':lines,'seconds':round(time.monotonic()-started,1)})
   save('progress.json',state)
   print('DONE',shard['name'],f"{lines:,} entries; {len(hits)} query hits; {time.monotonic()-started:.1f}s; total {state['compressedBytes']/1e9:.3f} GB",flush=True)
   if n==1:
    print('TOKEN PROBES',{q:state['counts']['1'].get(q) for q in ["it's","don't","state-of-the-art","it","'s","do","n't","state","-","don","t","n","'","cannot"]},flush=True)
  state.setdefault('completedN',[])
  if n not in state['completedN']:state['completedN'].append(n)
  save('progress.json',state)
 print('Finished; no shard files retained.',flush=True)

def finish():
 state=json.loads((OUT/'progress.json').read_text());manifest=json.loads((OUT/'manifest.json').read_text())
 probes=json.loads((OUT/'tokenization-probes.json').read_text()) if (OUT/'tokenization-probes.json').exists() else []
 probe_bytes=sum(r['bytesRead'] for r in probes)
 range_bytes=json.loads((OUT/'probe-transfer.json').read_text())['bytes'] if (OUT/'probe-transfer.json').exists() else 0
 phrases=(OUT/'candidates.txt').read_text().splitlines();done=set(state['completedN']);rows=[]
 for phrase in phrases:
  tokens=tokenize(phrase);n=len(tokens);coverage='unavailable';m=v=rate=None
  if n in done:
   coverage='exact';m,v=state['counts'].get(str(n),{}).get(' '.join(tokens),[0,0]);rate=m/state['denominators'][str(n)]['matchCount']*1e6
  elif n>5 and 5 in done:
   coverage='upper-bound';windows=[' '.join(tokens[i:i+5]) for i in range(n-4)]
   m=min(state['counts']['5'].get(w,[0,0])[0] for w in windows);v=min(state['counts']['5'].get(w,[0,0])[1] for w in windows)
   rate=m/state['denominators']['5']['matchCount']*1e6
  rows.append(dict(phrase=phrase,n=n,tokens=tokens,coverage=coverage,matchCount=m,volumeCount=v,ratePerMillionTokens=rate,years=[2000,2019]))
 (OUT/'baseline.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n' for r in rows))
 coverage={str(n):dict(collections.Counter(r['coverage'] for r in rows if r['n']==n)) for n in sorted({r['n'] for r in rows})}
 ranked=sorted((r for r in rows if r['ratePerMillionTokens'] is not None),key=lambda r:(-r['ratePerMillionTokens'],r['phrase']))
 summary={'candidateCount':len(rows),'coverage':coverage,'compressedCorpusBytes':state['compressedBytes'],'tokenizationProbeBytes':probe_bytes,'initialRangeProbeBytes':range_bytes,'measuredDataBodyBytes':state['compressedBytes']+probe_bytes+range_bytes,'approximateMetadataBytes':20_000_000,'above1PerMillion':sum(r['ratePerMillionTokens']>1 for r in ranked),'above10PerMillion':sum(r['ratePerMillionTokens']>10 for r in ranked),'top30':[r['phrase'] for r in ranked[:30]],'denominators':state['denominators']}
 save('summary.json',summary)
 text='''# Pre-ChatGPT book phrase-frequency baseline

Google Books Ngram, English (`eng`), version **20200217**; publication years
**2000–2019 inclusive**. Outputs are offline research priors, not detector rules.

## Sources and licence

- [Official dataset index](https://storage.googleapis.com/books/ngrams/books/datasetsv3.html)
- Official export indexes: '''+', '.join(f'[{n}-grams]({BASE}eng-{n}-ngrams_exports.html)' for n in range(1,6))+'''
- [1-gram total counts](https://storage.googleapis.com/books/ngrams/books/20200217/eng/totalcounts-1)
- Shard data: `https://storage.googleapis.com/books/ngrams/books/20200217/eng/<n>-<shard>-of-<count>.gz`.
- Public bucket XML listings, restricted to `ngrams/books/20200217/eng/<n>-`,
  supplied every shard's size and ETag before corpus transfers. No Viewer or
  Viewer JSON endpoint was queried. The saved HTML files are export indexes.

The dataset index states this compilation is licensed **Creative Commons
Attribution 3.0 Unported (CC BY 3.0)**:
https://creativecommons.org/licenses/by/3.0/ . Reuse requires appropriate credit,
a licence link, and identification of modifications; do not imply endorsement.
Retain this attribution with redistributed results:

> Source: Google Books Ngram data, English, version 20200217, Google;
> licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/).
> Dataset: https://storage.googleapis.com/books/ngrams/books/datasetsv3.html .
> Modified by the Slop Shame project: candidate phrase selection, lowercase
> matching, token mapping, and aggregation over publication years 2000–2019.

This is attribution for the compiled n-gram data, not a claim that the underlying
books or all project source files have this licence.

## Reproduction and candidate construction

Run from the repository root, with Python standard library only:
`python3 scripts/ngram/baseline.py plan`, then `... run`, then `... finish`.
Optional verification: `python3 scripts/ngram/tokenization_probes.py` (performs
additional, separately metered transfers; the saved evidence avoids rerunning).
The run is sequential in one low-priority process. Each gzip shard is streamed
directly into the extractor, without creating a downloaded or expanded shard
on disk. `progress.json` checkpoints only completed shards and records their
SHA-256 values, compressed bytes, case variants, and per-year matched counts.
Do not rerun `plan` against changed sources and reuse an old `progress.json`.

`candidate-sources.json` records input SHA-256 values and each candidate's
origins. Literal `phrases` arrays are lexed without executing TypeScript.
The Matcher column of `DROPPED.md` is included; regex sources are skipped,
and optional finite regex expansion is not performed. `report.json` phrase
rules, phrase overlaps, and phrase merges are also included. Candidates are
deduplicated and sorted after lowercasing, converting curly quotes to straight
quotes, and collapsing whitespace. Source files were read without modification;
their hashes identify the snapshot despite concurrent calibration work.

## Tokenization and counting

'''
 text+=(OUT/'tokenization-notes.md').read_text() if (OUT/'tokenization-notes.md').exists() else 'Tokenization verification pending.\n'
 text+='''
Only untagged n-grams contribute: POS-tagged variants (`word_VERB`, etc.) and
standalone POS tokens are excluded. Counts for every observed capitalization
variant of a target are summed. Shard selection recursively intersects all
uppercase/lowercase spellings with the lexical ranges advertised by the export
indexes; it does not assume lowercase, title case, and uppercase exhaust casing.
Rows in v3 have the form `ngram<TAB>year,match_count,volume_count<TAB>...`.
Only 2000–2019 triplets contribute.

`matchCount` sums occurrences. `volumeCount` sums the supplied yearly book
counts over years and case variants: it is **not** a distinct-book count across
years or variants, since one book can contain several capitalizations.
`ratePerMillionTokens = matchCount / sum(totalcounts-n[2000:2019].match_count)
* 1e6`, with the denominator for the same n. No denominator is borrowed from
another corpus version. Per-year evidence remains in `progress.json`.

`coverage: exact` means the complete lookup in the released n-gram dataset was
performed, not that the source corpus is uncensored. Missing released entries
are represented as 0, which is **not proof of literal absence in all books**.
The index describes a historical corpus-wide frequency threshold (over 40
occurrences) for earlier releases; the precise v3 filtering threshold is not
independently established here. Treat missing rows as potentially censored.
Unavailable measurements have null counts and rates, never zero. For phrases
longer than five tokens, a bound would be the minimum count over every contiguous
5-gram window, using the 5-gram denominator; no bound is supplied without 5-gram
coverage. `n` always records the phrase's full mapped token length.

## Transfer planning and coverage

All quantities below use decimal GB. Case variants are included in the selected
shards. `manifest.json` contains the full required shard list (including
unprocessed shards), exact sizes, ETags, URLs and lexical ranges, for every n.

| n | Selected / all shards | Selected GB | Entire n GB | Outcome |
|---|---:|---:|---:|---|
'''
 for n in range(1,6):
  s=manifest[str(n)];text+=f"| {n} | {s['neededShardCount']} / {s['allShardCount']} | {s['neededBytes']/1e9:.6f} | {s['allBytes']/1e9:.6f} | {'processed' if n in done else 'unavailable: stop at n=2 budget limit'} |\n"
 text+=f"\nCandidate total: **{len(rows):,}**. Complete shard metadata is in [manifest.json](manifest.json).\n\n"
 text+=f"Processed gzip transfer: **{state['compressedBytes']:,} bytes** ({state['compressedBytes']/1e9:.6f} GB). "
 text+=f"Tokenization verification read another **{probe_bytes:,} bytes**, and the initial range probe read {range_bytes:,} bytes. Data bodies total **{summary['measuredDataBodyBytes']:,} bytes**. "
 text+=f"Export indexes, bucket listings, totalcounts, and metadata probes add approximately 20 MB, for approximately **{(summary['measuredDataBodyBytes']+20_000_000)/1e9:.2f} GB total**. "
 text+='This is application-level body accounting; socket buffering on early-closed probes and HTTP headers can add a small overhead. The initial planning step did not meter every metadata response exactly. Peak disk consists of indexes and result metadata; no shard was materialized. Tokenizer probes supply evidence only and do not establish complete 2-gram candidate coverage.\n\n'
 text+='| Mapped token length n | Exact candidates | Upper-bound candidates | Unavailable candidates |\n|---|---:|---:|---:|\n'
 for n,c in coverage.items():text+=f"| {n} | {c.get('exact',0)} | {c.get('upper-bound',0)} | {c.get('unavailable',0)} |\n"
 text+=f"\nAmong measured candidates, **{summary['above1PerMillion']:,}** exceed 1 per million tokens and **{summary['above10PerMillion']:,}** exceed 10 per million tokens. Unavailable rates are excluded. [validation.json](validation.json) records the independent candidate-array and count audits.\n"
 text+='\n### Processed shard audit\n\n| Shard URL | Compressed bytes | ETag | SHA-256 |\n|---|---:|---|---|\n'
 for s in state['processed']:text+=f"| [{s['name']}]({s['url']}) | {s['size']} | `{s['etag']}` | `{s['sha256']}` |\n"
 text+='\n### Additional tokenization reads\n\n| Shard URL | Full shard bytes | Bytes read | ETag | Complete read |\n|---|---:|---:|---|---|\n'
 for s in probes:text+=f"| [{s['name']}]({s['url']}) | {s['size']} | {s['bytesRead']} | `{s['etag']}` | {s['completeShard']} |\n"
 text+='\n`tokenization-probes.json` contains the literal observed n-grams and their year/count evidence; partial reads are explicitly identified. The negative-contraction follow-up read the same shard a second time; both transfers are counted above.\n'
 for n,d in state['denominators'].items():text+=f"\n`totalcounts-{n}` SHA-256: `{d['sha256']}`; summed 2000–2019 match-count denominator: **{d['matchCount']:,}**.\n"
 text+='''
## Limits of the prior

- Books are edited, published prose, not representative social posts. Fiction,
  academic prose, technical vocabulary, quoted dialogue, and publishing changes
  affect rates. A common book phrase is not automatically a weak AI tell in
  every genre; a rare book phrase is not automatically an AI tell.
- Data ends in 2019. These are pre-ChatGPT book frequencies, not present-day
  human frequencies, and publication year can differ from composition year.
- OCR errors, scanning artifacts, tokenization, corpus selection, thresholding,
  and book metadata errors all affect rare-word estimates.
- Unavailable multiword phrases must not receive zero-frequency priors. The
  transfer cap prevents a complete 2-gram pass, and the requested priority order
  therefore also prevents processing 3–5-grams.
'''
 (OUT/'README.md').write_text(text)
 print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__=='__main__':
 if sys.argv[1]=='plan':plan()
 elif sys.argv[1]=='run':run()
 elif sys.argv[1]=='finish':finish()
