// Exact frozen scorecard decoded once; complete per-entry audit in eval/v2.
import {RUNTIME} from './runtime-data';
import type {EvidenceRule} from './scorecard-schema';
const ids=RUNTIME[0] as string[],families=RUNTIME[2] as string[],bundles=RUNTIME[3] as string[];
export const THRESHOLD=RUNTIME[12] as number;
export const SCORECARD:Readonly<Record<string,EvidenceRule>>=Object.fromEntries((RUNTIME[5] as [number,number,number,number|[number,number,number],number,number,number,string|null][]).map((r,i)=>[ids[i],{family:families[r[0]],mode:r[1]?'post':'word',weight:r[2],rate:r[3],gun:r[4]===2,tier:r[4]===2?'gun':r[4]===1?'vocabulary':'habit',dictionary:ids[i]!.startsWith('dictionaries.'),...(r[5]?{bundle:bundles[r[5]-1]}:{}),priority:r[6],...(r[7]?{disabled:r[7]}:{})}]));
