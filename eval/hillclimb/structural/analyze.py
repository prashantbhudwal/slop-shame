#!/usr/bin/env python3
"""Train-only threshold selection, then frozen dev validation. No test paths."""
import argparse
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / 'data/eval/raw/hillclimb'
OUT = ROOT / 'eval/hillclimb/structural'
FORMAL = {'abstracts', 'wiki', 'news'}
CASUAL = {'reddit', 'reviews'}

def save(path, obj):
    path.write_text(json.dumps(obj, indent=2, allow_nan=False) + '\n')

def load(split, prefix='structural'):
    assert split in ('train', 'dev')
    rows = [json.loads(line) for line in (CACHE / f'{prefix}-values-{split}.jsonl').open()]
    names = list(rows[0]['features'])
    x = np.array([[r['features'][k] if r['features'][k] is not None else np.nan for k in names] for r in rows])
    return rows, names, x, np.array([r['label'] == 'ai' for r in rows]), np.array([r['domain'] for r in rows]), np.array([r['model'] for r in rows])

def auc(score, ai):
    if not ai.any() or ai.all(): return None
    order = np.argsort(score, kind='stable')
    scores, ys = score[order], ai[order]
    starts = np.r_[0, np.flatnonzero(scores[1:] != scores[:-1]) + 1]
    ends = np.r_[starts[1:], len(ys)]
    c = np.r_[0, np.cumsum(ys)]
    a = c[ends] - c[starts]
    h = ends - starts - a
    lower = np.cumsum(h) - h
    return float(np.sum(a * (lower + h / 2)) / (ai.sum() * (~ai).sum()))

def score_values(values, direction):
    return np.where(np.isfinite(values), direction * values, -np.inf)

def threshold_search(values, ai, domains, direction, constrained, min_recall=.005, positive_only=False):
    score = score_values(values, direction)
    cuts = np.unique(score[np.isfinite(score)])
    if positive_only: cuts = cuts[cuts > 0]
    if not len(cuts): return None
    def rates(mask):
        arr = np.sort(score[mask])
        return (len(arr) - np.searchsorted(arr, cuts, side='left')) / len(arr)
    fp, tp = rates(~ai), rates(ai)
    macro = np.zeros(len(cuts))
    valid = np.ones(len(cuts), dtype=bool)
    for d in np.unique(domains):
        f, t = rates((~ai) & (domains == d)), rates(ai & (domains == d))
        macro += (t - f) / len(np.unique(domains))
        if constrained: valid &= f <= .025 + 1e-12
    if constrained: valid &= (fp <= .01 + 1e-12) & (tp >= min_recall)
    if not valid.any(): return None
    # Macro-domain Youden; ties prefer fewer human hits then a stricter cut.
    indices = np.flatnonzero(valid)
    best = max(indices, key=lambda i: (macro[i], -fp[i], cuts[i]))
    return {'direction': direction, 'threshold': float(direction * cuts[best]), 'macro_youden': float(macro[best]), 'recall': float(tp[best]), 'fp_rate': float(fp[best])}

def evaluate(values, ai, domains, models, spec):
    direction, threshold = spec['direction'], spec['threshold']
    score = score_values(values, direction)
    hit = score >= direction * threshold
    def group(mask):
        a, h = mask & ai, mask & ~ai
        observed = mask & np.isfinite(values)
        return {'human': int(h.sum()), 'ai': int(a.sum()), 'fp': int(hit[h].sum()), 'tp': int(hit[a].sum()),
                'fp_rate': float(hit[h].mean()) if h.any() else None,
                'recall': float(hit[a].mean()) if a.any() else None,
                'auroc': auc(score[mask], ai[mask]),
                'observed_auroc': auc(score[observed], ai[observed]),
                'observed_human': int((observed & ~ai).sum()), 'observed_ai': int((observed & ai).sum())}
    return {'overall': group(np.ones(len(ai), dtype=bool)),
            'domains': {d: group(domains == d) for d in sorted(set(domains))},
            # Each model is compared with all human rows; formal/casual are reported separately.
            'models': {m: group((models == m) | ~ai) for m in sorted(set(models[ai]))},
            'formal': group(np.isin(domains, list(FORMAL))), 'casual': group(np.isin(domains, list(CASUAL))),
            'eligible': int(np.isfinite(values).sum())}

def statistical_gate(m):
    o = m['overall']
    domains = sum(v['tp'] >= 5 and v['recall'] >= 3 * v['fp_rate'] for v in m['domains'].values())
    models = sum(v['tp'] >= 5 for v in m['models'].values())
    return (o['fp_rate'] <= .01 + 1e-12 and all(v['fp_rate'] <= .025 + 1e-12 for v in m['domains'].values())
            and o['recall'] >= max(.005, 3 * o['fp_rate']) and domains >= 2 and models >= 3)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['fit', 'validate'])
    parser.add_argument('--visible', action='store_true')
    parser.add_argument('--specifics', action='store_true')
    args = parser.parse_args()
    if args.specifics: args.visible = True
    prefix = 'specifics' if args.specifics else 'visible' if args.visible else ''
    rows, names, x, ai, domains, models = load('train' if args.mode == 'fit' else 'dev', prefix or 'structural')
    threshold_path = OUT / (prefix+'-thresholds.json' if prefix else 'thresholds.json')
    def feature_gate(m):
        if not args.visible: return statistical_gate(m)
        # Obvious smells may be rare and model-specific. Require human precision
        # and actual multi-domain support; broad AI recall is not the target.
        o = m['overall']
        return o['fp_rate'] <= .01 + 1e-12 and all(v['fp_rate'] <= .025 + 1e-12 for v in m['domains'].values()) and o['tp'] >= (20 if args.mode == 'fit' else 5) and o['recall'] >= 3 * o['fp_rate'] and sum(v['tp'] >= 2 for v in m['domains'].values()) >= 2
    if args.mode == 'fit':
        result = {'policy': 'Maximize macro-domain Youden on train, FPR <=1% overall and <=2.5% in every domain; recall >=0.5%. Validate unchanged on dev. Require 2 domains and 3 models with >=5 AI hits and >=3x human rate. Raw register/genre proxies are research-only.', 'features': {}}
        if args.visible: result['policy'] = 'Positive nameable smells: train macro-domain Youden, FPR <=1% overall and <=2.5% each domain, search recall >=0.05%. Require >=20 train / >=5 dev AI hits, support >=2 domains with >=2 hits, and >=3x overall human rate. No model-count requirement. Specificity absence alone is research-only. No external fitting.'
        # General register, punctuation and pronoun statistics are unsafe as standalone
        # rules even if a one-sided tail happens to satisfy this sample's FPR limits.
        allowed = {'sentence_cv', 'transition_share', 'transition_count',
                   'repeated_opener1', 'repeated_opener2', 'regular_run_cv6', 'summary_tail'}
        if args.visible: allowed = set(names)
        for j, name in enumerate(names):
            values = x[:, j]
            directions = (-1,) if name == 'specifics_rate' else (1,) if args.visible else (-1,) if name in {'sentence_cv', 'regular_run_cv6'} else (1, -1)
            candidates = [threshold_search(values, ai, domains, d, True, .0005 if args.visible else .005, args.visible and name != 'specifics_rate') for d in directions]
            candidates = [v for v in candidates if v]
            best = max(candidates, key=lambda v: (v['macro_youden'], -v['fp_rate'])) if candidates else None
            uncon = [threshold_search(values, ai, domains, d, False, positive_only=args.visible and name != 'specifics_rate') for d in ((-1,) if name == 'specifics_rate' else (1,) if args.visible else (1, -1))]
            uncon = [v for v in uncon if v]
            default_cut = {'visible_markdown_headers':1,'visible_markdown_bold':2,'visible_bold_headings':1,'visible_scaffold_list':2,'visible_bold_list':2,'visible_emoji_list':3,'visible_outline_list':3,'visible_unicode_bold':8,'visible_hashtag_wall':5,'visible_heavy_dash':3,'visible_closing_question':1,'visible_hook_lines_cta':1,'visible_repeated_triples':2}
            uncon = max(uncon, key=lambda v: (v['macro_youden'], -v['fp_rate'])) if uncon else {'direction':1,'threshold':default_cut.get(name,1),'macro_youden':0.,'recall':0.,'fp_rate':0.}
            chosen = best or uncon
            met = evaluate(values, ai, domains, models, chosen)
            # Select AUROC orientation only on train, separate from threshold direction.
            plus, minus = auc(score_values(values, 1), ai), auc(score_values(values, -1), ai)
            auc_direction = -1 if name == 'specifics_rate' else 1 if args.visible or plus >= minus else -1
            auc_met = evaluate(values, ai, domains, models, {**chosen, 'direction': auc_direction})
            candidate = name in allowed and best is not None and feature_gate(met)
            if chosen['direction'] == -1 and name not in {'sentence_cv', 'regular_run_cv6'}: candidate = False
            if args.specifics and name in {'specifics_rate','no_specifics_60'}: candidate = False # absence alone is not a positive tell
            result['features'][name] = {'threshold': chosen, 'unconstrained': uncon, 'auc_direction': auc_direction,
                'train': met, 'train_auc': auc_met, 'candidate': candidate,
                'decision': 'candidate' if candidate else 'research-only: register/genre proxy or insufficient cross-domain precision/support'}
        save(threshold_path, result)
        print('Frozen train candidates:', ', '.join(k for k,v in result['features'].items() if v['candidate']))
    else:
        result = json.loads(threshold_path.read_text())
        for j, name in enumerate(names):
            spec = result['features'][name]
            spec['dev'] = evaluate(x[:, j], ai, domains, models, spec['threshold'])
            spec['dev_auc'] = evaluate(x[:, j], ai, domains, models, {**spec['threshold'], 'direction': spec['auc_direction']})
            spec['validated'] = spec['candidate'] and feature_gate(spec['dev'])
            if spec['candidate'] and not spec['validated']: spec['decision'] = 'reject: frozen threshold failed dev precision/support gate'
            print(name, 'AUC', round(spec['train_auc']['overall']['auroc'],4), round(spec['dev_auc']['overall']['auroc'],4),
                  'threshold',spec['threshold']['direction'],round(spec['threshold']['threshold'],5),
                  'dev TP/FP',spec['dev']['overall']['tp'],spec['dev']['overall']['fp'], 'PASS' if spec['validated'] else '')
        save(OUT / (prefix+'-results.json' if prefix else 'results.json'), result)

if __name__ == '__main__': main()
