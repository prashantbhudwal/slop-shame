// Pinned curated dictionaries, restored literals and mined cues. Generated offline.
// MIT: ZeroSlop, Vale, Radar, Paech essays, Kobak; Apache-2.0: Paech sampler.
// Modifications: normalization, bounded regexes, per-entry weighting and compact encoding.
import {RUNTIME} from '../../runtime-data';
import type {RulePack, PhraseRule} from '../../rule-types';
const ids=RUNTIME[0] as string[],categories=RUNTIME[1] as PhraseRule['category'][];
export const dictionaries:RulePack={id:'dictionaries',name:'Curated low-effort tells',description:'Entry-level calibrated dictionaries; words alone cannot accuse.',attribution:'MIT / Apache-2.0; THIRD_PARTY_NOTICES.md and eval/v2/dictionary-entries.json.',rules:(RUNTIME[4] as [number,number,number,number,string,number][]).map(r=>({kind:'phrase',id:ids[r[0]]!,category:categories[r[1]]!,label:r[3]?'Dictionary construction: '+categories[r[1]]:'Dictionary tell: '+r[4],weight:r[2],repeat:'each',...(r[3]?{patterns:[r[4]]}:{phrases:[r[4]]}),...(r[5]?{position:r[5]===1?'opening' as const:'closing' as const}:{})}))};
