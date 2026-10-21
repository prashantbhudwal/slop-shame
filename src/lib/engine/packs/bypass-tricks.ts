import { structureOf } from '../context';
import type { RulePack } from '../rule-types';
import { ATTRIBUTION, custom } from '../rules';
const c = 'bypass-tricks';
export const bypassTricks: RulePack = {
  id: c, name: 'The invisible ink department', description: 'Mixed-script lookalikes and repeated invisible letters inside Latin words.', attribution: ATTRIBUTION,
  rules: [
    custom(c, 'homoglyphs', 'The alphabet is wearing a fake moustache', 3, (ctx) => {
      const words = structureOf(ctx).mixedScriptWords;
      return words.length ? { matches: words.slice(0, 3), scale: Math.min(1.8, Math.sqrt(words.length)) } : null;
    }),
    custom(c, 'zero-width', 'Invisible ink inside ordinary letters', 3, (ctx) => {
      const count = structureOf(ctx).zeroWidthInWords;
      return count >= 3 ? { matches: [ctx.input.text.slice(0, 160)], scale: Math.min(1.8, Math.sqrt(count / 3)) } : null;
    }),
  ].map((rule) => ({ ...rule, evidence: 'style' as const })),
};
