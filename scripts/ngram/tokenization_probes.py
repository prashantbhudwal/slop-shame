#!/usr/bin/env python3
"""Checkpointed official-shard tokenizer probes; these do not establish coverage."""
import sys
sys.dont_write_bytecode=True
import bisect,gzip,html,io,json,os,re,time,urllib.request
import baseline as b
os.nice(10)
path=b.OUT/'tokenization-probes.json'
results=json.loads(path.read_text()) if path.exists() else []
controls={2:["it 's","do n't",'state -'],3:["don ' t"],5:['state - of - the','of - the - art']}
manifest=json.loads((b.OUT/'manifest.json').read_text());plan=[]
for n,queries in controls.items():
 links=[(u.replace('http:','https:'),html.unescape(v)) for u,v in re.findall(r'<a href="([^"]+\.gz)">(.*?)</a>',(b.OUT/f'eng-{n}-ngrams_exports.html').read_text())]
 starts=[v for _,v in links];groups={}
 for q in queries:
  if any(int(r['name'][0])==n and any(s['normalized']==q and s['matchCount']>0 for s in r['samples'].values()) for r in results):continue
  i=bisect.bisect_right(starts,q)-1;groups.setdefault(i,set()).add(q)
 known={r['url']:r for r in manifest[str(n)]['shards']}
 for i,targets in sorted(groups.items()):
  url=links[i][0];meta=known.get(url)
  if meta is None:
   with urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=90) as r:meta={'url':url,'size':int(r.headers['Content-Length']),'etag':r.headers['ETag'],'name':url.rsplit('/',1)[1]}
  plan.append({**meta,'targets':sorted(targets)})
b.save('tokenization-probe-plan.json',plan)
used=json.loads((b.OUT/'progress.json').read_text())['compressedBytes']+sum(r['bytesRead'] for r in results)
assert used+sum(r['size'] for r in plan)+30_000_000<b.LIMIT
for row in plan:
 print('PROBE',row['name'],row['targets'],flush=True);samples={};started=time.monotonic()
 with urllib.request.urlopen(row['url'],timeout=120) as response:
  assert response.status==200
  meter=b.Meter(response)
  with io.BufferedReader(meter,buffer_size=2**20) as buf,gzip.GzipFile(fileobj=buf) as data:
   for line in data:
    raw,_,rest=line.partition(b'\t')
    if b'_' in raw:continue
    norm=raw.decode().translate(b.QUOTES).lower()
    if norm not in row['targets']:continue
    m,v,years=b.sum_years(rest.rstrip(b'\n').split(b'\t'))
    samples[raw.decode()]={'normalized':norm,'matchCount':m,'volumeCount':v,'years':years}
    if all(any(s['normalized']==q and s['matchCount']>0 for s in samples.values()) for q in row['targets']):break
  result={**row,'bytesRead':meter.count,'completeShard':meter.count==row['size'],'samples':samples,'seconds':round(time.monotonic()-started,1)}
  if result['completeShard']:result['sha256']=meter.sha.hexdigest()
 results.append(result);b.save('tokenization-probes.json',results)
 print('PROBE DONE',row['name'],meter.count,'bytes',{k:{x:y for x,y in v.items() if x!='years'} for k,v in samples.items()},flush=True)
