import type { EvidenceKind } from './rule-types';
import type { SlopCategory } from './types';

export interface EvidenceRule {
  family: string;
  mode: 'word' | 'post';
  weight: number;
  rate: number | readonly [number, number, number];
  gun: boolean;
  tier?: 'gun' | 'habit' | 'vocabulary';
  dictionary?: boolean;
  /** One representative for correlated descriptions of the same construction. */
  bundle?: string;
  priority?: number;
  disabled?: string;
}
export const MIN_THRESHOLD = 2.5;
export const HABIT_CAP = 1.5;
export const GUN_CAP = 12;
const LIST = new Set(['template-phrases.labeled-fields','formatting.section-outline','formatting.emoji-bullets','formatting.bullet-np-list','formatting.title-case-header','pasted-output.asterisk-list','pasted-output.labeled-list','pasted-output.listicle-hook','pasted-output.title-label']);
const ENGAGEMENT = new Set(['engagement-bait.repost-follow','engagement-bait.reader-question','engagement-bait.social-closer','engagement-bait.keyword-closer','pasted-output.closing-question','pasted-output.audience-callout','pasted-output.save-cta','pasted-output.keyword-request']);
export const LAYOUT_RULES = new Set(['template-phrases.labeled-fields','formatting.section-outline','formatting.emoji-bullets','formatting.bullet-np-list','formatting.title-case-header','robotic-rhythm.cross-para-burstiness','pasted-output.markdown-heading','pasted-output.asterisk-list','pasted-output.labeled-list','pasted-output.imperative-triplet','pasted-output.fragment-triplet','pasted-output.repeated-openings','pasted-output.audience-callout','pasted-output.template-labels']);
/** Platform conventions absent from essay negatives never receive learned growth. */
export function platformHabit(id: string): boolean {
  return LIST.has(id) || ENGAGEMENT.has(id) || ['formatting.emoji-density','formatting.hashtag-stuff','formatting.unicode-bold','pasted-output.aphorism-tail','pasted-output.story-turn','pasted-output.lesson-formula','pasted-output.motivational-stock','pasted-output.takeaway-label','pasted-output.stat-hook'].includes(id);
}
export function ruleSchema(id: string, category: SlopCategory, weight: number, kind: EvidenceKind, once: boolean): EvidenceRule {
  let family: string = category;
  let bundle: string | undefined;
  let priority = 0;
  if (LIST.has(id)) { family='list-structure'; bundle='list'; priority=id==='pasted-output.listicle-hook'?30:id==='pasted-output.labeled-list'?20:10; }
  if (ENGAGEMENT.has(id)) { family='engagement'; bundle='cta'; priority=id==='pasted-output.closing-question'?30:10; }
  if (category==='formatting' || category==='robotic-rhythm' || category==='bypass-tricks') family = LIST.has(id) ? 'list-structure' : 'presentation';
  if (id.startsWith('pasted-output.') && ['aphorism-tail','story-turn','lesson-formula','motivational-stock','takeaway-label'].some(x=>id.endsWith('.'+x))) family='stock-story';
  const gun=kind==='fingerprint'||['pasted-output.unfilled-slot','pasted-output.markdown-bold','pasted-output.markdown-heading'].includes(id);
  if(gun)family='artifact';
  if (['pasted-output.imperative-triplet','pasted-output.fragment-triplet','pasted-output.repeated-openings','robotic-rhythm.uniformity','robotic-rhythm.parallel-pair'].includes(id)) {bundle='cadence';priority=id==='pasted-output.imperative-triplet'?20:10;}
  return {family,mode:once?'post':'word',weight:weight*.7,rate:once?[.01,.01,.01]:.0001,gun,bundle,priority};
}
