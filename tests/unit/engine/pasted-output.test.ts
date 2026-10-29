import { describe, expect, it } from 'vitest';
import { analyzePost, createEngine } from '../../../src/lib/engine';
import { pastedOutput } from '../../../src/lib/engine/packs/pasted-output';
import { buildContext } from '../../../src/lib/engine/context';
import { scoreSignals } from '../../../src/lib/engine/score';

const release='We shipped the update on Tuesday. The export now accepts quoted tabs and keeps the original filename. Marta checked the patch with three customer files and confirmed that the keyboard shortcut works in the search box. The next release will fix the remaining timeout.';
const rule = (suffix:string) => pastedOutput.rules.find(r=>r.id===`pasted-output.${suffix}`)!;
const examples:Record<string,string>={
 'template-labels':'Hook: Your team deserves better.\nCTA: Ask the audience to comment.',
 'unfilled-slot':'Our new product at [Company] is ready. See [link].',
 'markdown-bold':'**One clear takeaway**',
 'markdown-heading':'### Lessons from the launch',
 'asterisk-list':'* First item\n* Second item\n* Third item',
 'labeled-list':'1. Clarity: Write down the goal.\n2. Ownership: Give the task a name.\n3. Feedback: Ask before the deadline.',
 'closing-question':'What’s one habit you would add? #Leadership #Growth',
 'audience-callout':'HR leaders: What’s one habit you would add?',
 'aphorism-tail':'Stay curious and trust the process.',
 'imperative-triplet':'Listen deeply. Give credit. Build trust.',
 'fragment-triplet':'Clear priorities. Written decisions. Thoughtful documentation.',
 'repeated-openings':'More meetings do not fix unclear priorities.\nMore channels do not fix a missing audience.\nMore content does not fix a weak message.',
 'listicle-hook':'Here are five simple daily habits that help a team.',
 'story-turn':'The turning point came when I stopped adding meetings.',
 'lesson-formula':"But here's what I've actually found: clarity helps.",
 'motivational-stock':'Keep showing up. Keep learning. Let the results compound.',
 'takeaway-label':'My takeaway: write down the next step.',
 'save-cta':'Bookmark this for your next planning meeting.',
 'keyword-request':'Message me “PLAN” and I will send the template.',
 'stat-hook':'82% of teams are missing the point.',
 'possible-draft':"Here's a possible LinkedIn post for your team:",
 'assistant-offer':"Let me know if you'd like a shorter version.",
 'live-search-disclaimer':"I can't search live results from the web.",
 'writing-advice':'Start with a compelling hook. Close with a clear call to action.',
 'sure-opener':'Sure, this is the requested response.',
 'title-label':'Title: A practical lesson',
};
describe('round 2 visible draft and formula tells',()=>{
 it.each(Object.entries(examples))('shows exact evidence for %s',(suffix,text)=>{
   const engine=createEngine([{...pastedOutput,rules:[rule(suffix)]}]);
   const report=engine.analyze({text});
   expect(report.signals.some(signal=>signal.ruleId===rule(suffix).id)).toBe(true);
   expect(report.signals.flatMap(s=>s.matches).every(match=>buildContext({text}).text.includes(match))).toBe(true);
 });
 it.each(['[Company]','[Name]','[link]','{name}','<insert company>','0 examples'])('retains strong unfinished-slot evidence: %s',slot=>{
   const report=analyzePost({text:release+'\n'+slot});
   expect(report.score).toBeGreaterThanOrEqual(40);
   expect(report.signals.flatMap(s=>s.matches)).toContain(slot);
 });
 it.each(['template-labels','possible-draft','live-search-disclaimer'])('gives explicit %s residue the fingerprint floor',suffix=>{
   expect(analyzePost({text:examples[suffix]+'\n'+release}).score).toBeGreaterThanOrEqual(80);
 });
 it.each(['template-labels','unfilled-slot','markdown-bold','markdown-heading','possible-draft','live-search-disclaimer','writing-advice'])('protects quoted and fenced %s examples',suffix=>{
   const engine=createEngine([{...pastedOutput,rules:[rule(suffix)]}]);
   for(const text of [`“${examples[suffix]}”\n${release}`,`\`\`\`\n${examples[suffix]}\n\`\`\`\n${release}`])expect(engine.analyze({text}).score).toBe(0);
 });
 it('does not borrow a framework anchor from quoted examples',()=>{
   const report=createEngine([pastedOutput]).analyze({text:'Before: A recorded observation.\n“After: A quoted example.\nBridge: A quoted example.”\n'+release});
   expect(report.signals.some(s=>s.ruleId==='pasted-output.template-labels')).toBe(false);
 });
 it('retains a direct placeholder after many protected copies',()=>{
   const text=Array(5).fill('`[Company]`').join('\n')+'\n[Company]';
   const report=createEngine([pastedOutput]).analyze({text});
   expect(report.signals.flatMap(s=>s.matches)).toEqual(['[Company]']);
 });
 it('keeps a question and an ordinary list below the threshold',()=>{
   for(const text of [release+'\nWhat would you add?',release+'\n1. Check the disk.\n2. Check the cable.\n3. Check the port.']) {
     expect(analyzePost({text}).score).toBeLessThan(40);
     expect(analyzePost({text}).shameable).toBe(false);
   }
 });
 it('keeps two ordinary social formulas below 40',()=>{
   for(const text of [release+'\nHR leaders: What would you add?',release+'\nThe turning point came when we wrote down the owner.\nWhat would you add?'])expect(analyzePost({text}).score).toBeLessThan(40);
 });
 it('does not turn a service offer or a code header into a fingerprint',()=>{
   for(const text of ["Let me know if you'd like to book a table.", '### System\nThe ventilation needs an inspection.', 'Headline: The local shop opens today.'])expect(analyzePost({text:text+'\n'+release}).score).toBeLessThan(40);
 });
});
