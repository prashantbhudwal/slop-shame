# kobak

- URL: https://github.com/berenslab/llm-excess-vocab
- Commit: `53db991afc251782106cd817a1c3fa47a4d41781`
- Fetch date: 2026-10-19 (UTC)
- SPDX: `MIT`
- License evidence: pinned upstream [LICENSE](https://github.com/berenslab/llm-excess-vocab/blob/53db991afc251782106cd817a1c3fa47a4d41781/LICENSE); full unmodified text in LICENSE.
- NOTICE: absent (HTTP 404 at pinned root NOTICE)
- Use: Unmodified source inputs; generated TS is a filtered, normalized and reweighted derivative.

| Pinned upstream file | SHA-256 |
| --- | --- |
| [LICENSE](https://github.com/berenslab/llm-excess-vocab/blob/53db991afc251782106cd817a1c3fa47a4d41781/LICENSE) | d172c5874bfc07772617aceebf5b5e9165e649a179bea81a3d1c43ba46c74ff5 |
| [results/excess_words.csv](https://github.com/berenslab/llm-excess-vocab/blob/53db991afc251782106cd817a1c3fa47a4d41781/results/excess_words.csv) | f5786f3cc83f9578043aaecf2774c6200cb68b5e774afc3afe40af4eb0cf8285 |
| [results/figures_data/figure1.csv](https://github.com/berenslab/llm-excess-vocab/blob/53db991afc251782106cd817a1c3fa47a4d41781/results/figures_data/figure1.csv) | 174e4ef12a5bea882efd2e0a2bd23661199a38fdb80eaeae80b4ac488f88596b |
| [README.md](https://github.com/berenslab/llm-excess-vocab/blob/53db991afc251782106cd817a1c3fa47a4d41781/README.md) | 9d526398152c6249b134c4d27a1d4bce0bd9d56ca455644663b2b3bc5d971d8a |

## Derived count subset

style-counts.json retains counts for all 407 exactly-style words plus the yearly abstract totals. It is derived from [results/yearly-counts.csv.gz](https://github.com/berenslab/llm-excess-vocab/blob/53db991afc251782106cd817a1c3fa47a4d41781/results/yearly-counts.csv.gz) (SHA-256 e42e37c9ad5abc4e098e0ea02558399b8557d85332bf350942c6cb9bda9d9d93); the full matrix is never persisted by the pipeline. Derived SHA-256: 9fef77e5f1b37538b57f561aee496eedb5358e2106ba9587823624cd642d8334. Delete style-counts.json and rerun update.mjs to reproduce the subset in memory. The source CSV remains unmodified, including content words, for auditability; content words never become rules.

The fold ratio reproduces the smoothing/projection in scripts/03-figures.ipynb at the same commit: p_y=(count_y+1)/(total_y+1), q=p2022+2*max(0,p2022-p2021), r=p2024/q. The paper is Kobak et al., Science Advances 11, eadt3813 (2025), https://doi.org/10.1126/sciadv.adt3813.
