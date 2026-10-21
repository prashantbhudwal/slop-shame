// First-party visible tells from the blind reader panel, round 2.
// These describe unfinished drafts and repeated writing formulas, not authorship.
import { isProtectedSpan, structureOf } from '../context';
import type { PostContext, RuleHit, RulePack } from '../rule-types';

type Span = readonly [number, number];
const BOLD = /\*\*[^*\n]{2,120}\*\*|__[^_\n]{2,120}__/g;
const HEADER = /^#{2,6}[\t ]+\S/;
const STAR = /^\*[\t ]+\S/;
const LABEL = /^(?:(?:\d{1,2}[.)]|[-*•]|[\p{Extended_Pictographic}\uFE0F])+[\t ]*)?(?:\*\*)?[\p{L}][\p{L}\p{N} ,/&'-]{1,58}(?:\*\*)?:[\t ]+\S/u;
const LIST = /^(?:\d{1,2}[.)]|[-*•]|[\p{Extended_Pictographic}\uFE0F])[\t ]+\S/u;
const LABELS = /(?:^|(?<=[.!?\n]))[\t ]*(?:\*\*)?(Hook|CTA|Headline|Caption|The specific insight|Detail used|Before|After|Bridge|Attention|Interest|Desire|Action|Problem|Agitate|Solution)(?:\*\*)?[\t ]*:/gi;
const DIRECT_LABEL = /^(?:hook|cta|the specific insight|detail used)$/i;
const PLACEHOLDER = /\[(?:(?:your |insert |add )?(?:company(?: name)?|name|job title|role|product(?: name)?|project(?: name)?|audience|link(?: in comments)?|job link|registration link|event(?: name)?|date|time|location|industry|topic|benefit|key benefit|pain point|solve problem|area or mission)|insert[^\]\n]{1,60})\]|\{(?:name|company|role|link|topic)\}|<insert[\t ][^>\n]{1,60}>/gi;
const ZERO = /\b0[\t ]+(?:examples|tips|lessons|ways|habits|strategies)\b/gi;
const QUESTION = /^(?:(?:what|which|how|when|where|who|why)\b|agree\b|disagree\b|have you\b|do you\b|are you\b|would you\b|is (?:this|that|it)\b)/i;
const FOOTER = /^(?:#[\p{L}\p{M}\p{N}_]+\s*|[\p{Extended_Pictographic}\uFE0F]\s*)+$/u;
const IMPERATIVE = /^(?:listen|set|give|build|ask|stop|start|choose|learn|keep|share|lead|focus|make|offer|create|measure|treat|practice|show|write|take|stay|think|celebrate|seek|be)\b/i;
const PROSE_FRAGMENT = /^[A-Za-z][^:]*[a-z]/;
const REPEATED_OPENER = /^(?:more|less|one|no|not|every|they|you|we|i|our|your|the)$/;
const AUDIENCE = /^(?:(?:for[\t ]+(?:(?:all|the|my|fellow)[\t ]+)?)?[\p{L}][\p{L} &/-]{0,45}(?:leaders|founders|managers|teams|professionals|marketers|recruiters|owners|leads)[\t ]*[,:])/iu;
const APHORISM = /\b(?:keep showing up|consistency is key|progress (?:not|over) perfection|trust the process|one step at a time|stay curious|start small|stay consistent|keep learning|keep pushing|embrace the journey|work smarter|small (?:steps|actions|habits|changes)[^.!?\n]{0,35}(?:big|lasting|compound)|(?:the best|real) (?:leaders|leadership|growth|success)|(?:clarity|trust|consistency|culture|leadership) (?:is|starts|comes|beats)|(?:that'?s|this is) (?:how|where) (?:real|the real|growth|trust|leadership|progress)|(?:we'?re|we are) just getting started)\b/i;
interface Shape { bold: Span[]; headers: Span[]; stars: Span[]; labels: Span[]; scaffold: Span[]; placeholders: Span[]; question: Span[]; audience: Span[]; aphorism: Span[]; triplet: Span[]; fragments: Span[]; anaphora: Span[] }
const shapes = new WeakMap<PostContext, Shape>();
function shapeOf(ctx: PostContext): Shape {
  const cached=shapes.get(ctx); if(cached) return cached;
  const st=structureOf(ctx), shape:Shape={bold:[],headers:[],stars:[],labels:[],scaffold:[],placeholders:[],question:[],audience:[],aphorism:[],triplet:[],fragments:[],anaphora:[]};
  const active=(span:Span)=>!isProtectedSpan(st.protectedSpans,span);
  let cursor=0, lists=0;
  for(const line of ctx.lines) {
    const start=ctx.text.indexOf(line,cursor), end=start+line.length; cursor=end;
    const span:Span=[start,end]; if(!active(span)) continue;
    if(HEADER.test(line)) shape.headers.push(span);
    if(STAR.test(line)) shape.stars.push(span);
    if(LIST.test(line)) lists++;
    if(LIST.test(line)&&LABEL.test(line)) shape.labels.push(span);
    const audience=AUDIENCE.exec(line); if(audience) shape.audience.push([start,start+audience[0].length]);
  }
  // Exact markup spans prevent a quoted example from establishing the tell.
  for(const m of ctx.text.matchAll(BOLD)) {const span:Span=[m.index,m.index+m[0].length];if(active(span))shape.bold.push(span);}
  if(lists<3 || shape.labels.length<3) shape.labels=[];
  const labels: {name:string;span:Span}[]=[];
  for(const m of st.straight.matchAll(LABELS)) {
    const start=m.index+m[0].indexOf(m[1]!); const span:Span=[start,m.index+m[0].length];
    if(active(span))labels.push({name:m[1]!.toLowerCase(),span});
  }
  const names=new Set(labels.map(l=>l.name));
  const framework=[['before','after','bridge'],['attention','interest','desire','action'],['problem','agitate','solution']].some(group=>group.every(x=>names.has(x)));
  shape.scaffold=labels.filter(l=>DIRECT_LABEL.test(l.name)||framework||names.has('headline')&&names.has('caption')).map(l=>l.span);
  for(const re of [PLACEHOLDER,ZERO]) for(const m of st.straight.matchAll(re)) {const span:Span=[m.index,m.index+m[0].length];if(active(span))shape.placeholders.push(span);}
  let tail=-1;
  for(let i=ctx.sentences.length-1;i>=0;i--) if(st.sentenceSpans[i]![0]<st.bodyEnd&&!FOOTER.test(ctx.sentences[i]!)) {tail=i;break;}
  if(tail>=0) {
    const sentence=ctx.sentences[tail]!, span=st.sentenceSpans[tail]!;
    const colon=sentence.indexOf(':');
    if(sentence.endsWith('?')&&(QUESTION.test(sentence)||colon>=0&&QUESTION.test(sentence.slice(colon+1).trimStart()))&&active(span))shape.question.push(span);
    // One of the last two prose sentences, before an engagement question.
    const i=shape.question.length?tail-1:tail;
    if(i>=0 && st.sentenceWordCounts[i]!<=28 && APHORISM.test(ctx.sentences[i]!) && active(st.sentenceSpans[i]!))shape.aphorism.push(st.sentenceSpans[i]!);
  }
  if(!shape.question.length) shape.audience=[];
  let run:Span[]=[], fragments:Span[]=[], previous='', repeated:Span[]=[];
  let word=0;
  for(let i=0;i<ctx.sentences.length;i++) {
    const words=st.sentenceWordCounts[i]!, span=st.sentenceSpans[i]!;
    while(word<st.wordSpans.length&&st.wordSpans[word]![0]<span[0])word++;
    const opening=ctx.words[word]??'';
    if(words>=2&&words<=18&&REPEATED_OPENER.test(opening)&&active(span)) {
      if(opening===previous)repeated.push(span);else repeated=[span];
      if(repeated.length===3)shape.anaphora.push(...repeated);else if(repeated.length>3)shape.anaphora.push(span);
      previous=opening;
    }else {previous='';repeated=[];}
    if(words>=2&&words<=7&&IMPERATIVE.test(ctx.sentences[i]!)&&active(span)) {run.push(span);if(run.length===3)shape.triplet.push(...run);else if(run.length>3)shape.triplet.push(span);}
    else run=[];
    if(words>=2&&words<=5&&PROSE_FRAGMENT.test(ctx.sentences[i]!)&&active(span)) {fragments.push(span);if(fragments.length===3)shape.fragments.push(...fragments);else if(fragments.length>3)shape.fragments.push(span);}
    else fragments=[];
  }
  shapes.set(ctx,shape); return shape;
}
function hit(ctx:PostContext, spans:Span[]):RuleHit|null { return spans.length?{matches:spans.slice(0,3).map(([a,b])=>ctx.text.slice(a,b)),spans}:null; }
export const pastedOutput:RulePack={
 id:'pasted-output', name:'Visible draft residue and writing formulas', description:'Nameable unfinished-output artifacts and weak stock formulas; ordinary social writing needs several independent tells.',
 rules:[
  {kind:'custom',id:'pasted-output.template-labels',category:'chatbot-leak',label:'Hook: CTA: The prompt template shipped too',weight:12,evidence:'fingerprint',detect:ctx=>hit(ctx,shapeOf(ctx).scaffold)},
  {kind:'custom',id:'pasted-output.unfilled-slot',category:'chatbot-leak',label:'Hello [First Name], meet [Company]',weight:8,evidence:'phrase',detect:ctx=>hit(ctx,shapeOf(ctx).placeholders)},
  {kind:'custom',id:'pasted-output.markdown-bold',category:'formatting',label:'**Bold** move: pasting raw Markdown',weight:4.5,evidence:'phrase',detect:ctx=>hit(ctx,shapeOf(ctx).bold)},
  {kind:'custom',id:'pasted-output.markdown-heading',category:'formatting',label:'### Headings LinkedIn will never render',weight:4.5,evidence:'phrase',detect:ctx=>hit(ctx,shapeOf(ctx).headers)},
  {kind:'custom',id:'pasted-output.asterisk-list',category:'formatting',label:'* Asterisks * that * never * rendered',weight:2,evidence:'style',detect:ctx=>hit(ctx,shapeOf(ctx).stars.length>=3?shapeOf(ctx).stars:[])},
  {kind:'custom',id:'pasted-output.labeled-list',category:'formatting',label:'Every bullet wears the same name tag',weight:3,evidence:'style',detect:ctx=>hit(ctx,shapeOf(ctx).labels)},
  {kind:'custom',id:'pasted-output.closing-question',category:'engagement-bait',label:'Engagement homework in the last line',weight:3,evidence:'phrase',detect:ctx=>hit(ctx,shapeOf(ctx).question)},
  {kind:'custom',id:'pasted-output.audience-callout',category:'engagement-bait',label:'Paging all HR leaders: please reply',weight:2,evidence:'phrase',detect:ctx=>hit(ctx,shapeOf(ctx).audience)},
  {kind:'custom',id:'pasted-output.aphorism-tail',category:'template-phrases',label:'Ends on a fortune-cookie maxim',weight:1.5,evidence:'phrase',detect:ctx=>hit(ctx,shapeOf(ctx).aphorism)},
  {kind:'custom',id:'pasted-output.imperative-triplet',category:'robotic-rhythm',label:'Keep going. Keep growing. Keep pasting.',weight:2.25,evidence:'style',detect:ctx=>hit(ctx,shapeOf(ctx).triplet)},
  {kind:'custom',id:'pasted-output.fragment-triplet',category:'robotic-rhythm',label:'Short. Clipped. Suspicious.',weight:0.25,evidence:'style',detect:ctx=>hit(ctx,shapeOf(ctx).fragments)},
  {kind:'custom',id:'pasted-output.repeated-openings',category:'robotic-rhythm',label:'Same opener. Same opener. Same opener.',weight:1,evidence:'style',detect:ctx=>hit(ctx,shapeOf(ctx).anaphora)},
  {kind:'phrase',id:'pasted-output.listicle-hook',category:'template-phrases',label:'Here are 5 ways to sound like everyone',weight:2,repeat:'once',patterns:[String.raw`(?:^|(?<=[.!?\n]))[\t ]*(?:here (?:are|is)[\t ]+(?:(?:my|the|top)[\t ]+)?|here'?s[\t ]+)?(?:[1-9]|10|three|four|five|six|seven|eight|nine|ten)[\t ]+(?:(?:simple|practical|key|powerful|essential|hard-won|quick|daily|real)[\t ]+){0,3}(?:ways|habits|lessons|rules|tips|steps|things|strategies|principles|reasons|tools|actions)\b`,String.raw`\bhere (?:are|is)[\t ]+(?:(?:the|my|top)[\t ]+){0,2}(?:[1-9]|10|three|four|five|six|seven|eight|nine|ten)[\t ]+(?:[a-z-]{2,18}[\t ]+){0,3}(?:ways|habits|lessons|rules|tips|steps|things|strategies|principles|reasons|tools)\b`]},
  {kind:'phrase',id:'pasted-output.story-turn',category:'template-phrases',label:'And then… the turning point came',weight:3,repeat:'once',phrases:['the turning point came when','that is when everything changed',"that's when everything changed",'the counterintuitive truth','three hard-won principles followed']},
  {kind:'phrase',id:'pasted-output.lesson-formula',category:'template-phrases',label:'Here\'s what nobody tells you (everyone does)',weight:2,repeat:'once',phrases:["here's what i've actually found",'the counterintuitive move','the biggest shift came when',"one lesson i'm carrying with me",'stupidly simple','to replicate it:','my journey into'],patterns:[String.raw`\b(?:the lesson|my takeaway|the takeaway|the operational lesson)[\t ]+for[\t ]+[a-z &-]{2,65}:`]},
  {kind:'phrase',id:'pasted-output.motivational-stock',category:'template-phrases',label:'Motivational poster, transcribed',weight:3,repeat:'sqrt',phrases:['keep showing up','keep learning','your future self will thank you','the future belongs to','rejection is simply redirection','consistency beats intensity','small improvements compound','small, consistent steps','let the results compound','trust the process','progress over perfection','progress, not perfection','take the first step','one step at a time','staircase to take the first step','do the heavy lifting','let compound interest','a small reminder for anyone','a good reminder for today']},
  {kind:'phrase',id:'pasted-output.takeaway-label',category:'template-phrases',label:'The moral, labelled for convenience',weight:1.5,repeat:'once',patterns:[String.raw`(?:^|(?<=[.!?\n]))[\t ]*(?:my (?:practical )?(?:takeaway|reflection)|the (?:operational )?(?:lesson|takeaway)(?: for [a-z &-]{2,65})?|here(?:'s| is) (?:the|my) (?:lesson|takeaway))[\t ]*:`]},
  {kind:'phrase',id:'pasted-output.save-cta',category:'engagement-bait',label:'Save this. Bookmark this. DM me.',weight:1.5,repeat:'once',patterns:[String.raw`\b(?:save|bookmark)[\t ]+(?:this|the post)\b`,String.raw`\b(?:dm|message)[\t ]+me[\t ]+(?:for|to|if|and|the|a)\b`]},
  {kind:'phrase',id:'pasted-output.keyword-request',category:'engagement-bait',label:'Comment "PLAN" and I\'ll send it',weight:3,repeat:'once',patterns:[String.raw`\b(?:comment|drop|reply|dm me|message me)[\t ]+['"][^'"\n]{1,24}['"]`]},
  {kind:'phrase',id:'pasted-output.stat-hook',category:'hedging',label:'Opens with a statistic of mysterious origin',weight:3,evidence:'phrase',position:'opening',patterns:[String.raw`^[\t ]*\d{1,2}(?:\.\d)?%[\t ]+of\b`]},
  {kind:'phrase',id:'pasted-output.possible-draft',category:'chatbot-leak',label:'"Here\'s a possible post" made it into the post',weight:12,evidence:'fingerprint',patterns:[String.raw`^[\t \n]*(?:(?:sure|certainly|absolutely)[,!][\t ]*)?here'?s[\t ]+(?:a[\t ]+)?possible[\t ]+(?:linkedin[\t ]+)?(?:post|draft|caption|version)\b`,String.raw`^[\t \n]*(?:(?:sure|certainly|absolutely)[,!][\t ]*)?here(?:'s| is)[\t ]+(?:a|your|the)[\t ]+linkedin[\t ]+post\b`]},
  {kind:'phrase',id:'pasted-output.assistant-offer',category:'chatbot-leak',label:'The chatbot offered edits. Nobody said no.',weight:4,evidence:'phrase',position:'closing',patterns:[String.raw`(?:^|(?<=[.!?\n]))[\t ]*(?:let me know if you'?d like[\t ]+(?:(?:me[\t ]+to[\t ]+)?(?:revise|rewrite|adjust|expand|shorten|customi[sz]e|tweak)|a[\t ]+(?:shorter|longer|different|revised)[\t ]+(?:version|draft))|feel free to (?:adjust|customi[sz]e|tweak)[\t ]+(?:this|the)[\t ]+(?:post|draft|caption))\b`]},
  {kind:'phrase',id:'pasted-output.live-search-disclaimer',category:'chatbot-leak',label:'Even the chatbot couldn\'t browse LinkedIn',weight:12,evidence:'fingerprint',patterns:[String.raw`(?:^|(?<=[.!?\n]))[\t ]*i (?:can'?t|cannot)[\t ]+(?:search|browse|access)[\t ]+(?:live|the (?:web|internet))\b`]},
  {kind:'phrase',id:'pasted-output.writing-advice',category:'chatbot-leak',label:'Pasted the writing tips instead of the post',weight:8,evidence:'phrase',patterns:[String.raw`\b(?:start|open)[\t ]+with[\t ]+(?:a|an)[\t ]+(?:strong|compelling|attention-grabbing|engaging)[\t ]+hook\b`,String.raw`\b(?:end|close)[\t ]+with[\t ]+(?:a|an)[\t ]+(?:clear[\t ]+)?(?:call to action|engagement question)\b`,String.raw`\bhooks tend to land when\b`,String.raw`\ba reusable (?:post |hook )?structure is[\t ]*:`]},
  {kind:'phrase',id:'pasted-output.sure-opener',category:'chatbot-leak',label:'"Sure!" (the chatbot was happy to help)',weight:2,evidence:'style',patterns:[String.raw`^[\t \n]*sure[,!]`]},
  {kind:'phrase',id:'pasted-output.title-label',category:'chatbot-leak',label:'Title: Forgot to delete the title field',weight:2,evidence:'style',patterns:[String.raw`^[\t \n]*title[\t ]*:`]},
 ],
};
