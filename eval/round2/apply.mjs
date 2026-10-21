// Apply the selected weights directly to first-party source, preserving rules.
import ts from 'typescript';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {ROOT,OUT,json} from './common.mjs';
const best=json(resolve(OUT,'best.json')),changed=[];
for(const name of readdirSync(resolve(ROOT,'src/lib/engine/packs')).filter(f=>f.endsWith('.ts'))) {
 const path=resolve(ROOT,'src/lib/engine/packs',name),source=readFileSync(path,'utf8'),ast=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true);
 let category;const edits=[];
 function visit(n) {
  if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='c'&&n.initializer&&ts.isStringLiteral(n.initializer))category=n.initializer.text;
  if(ts.isCallExpression(n)&&['phrase','custom'].includes(n.expression.getText(ast))&&n.arguments.length>=4&&ts.isStringLiteral(n.arguments[1])&&ts.isNumericLiteral(n.arguments[3])) {
   const id=category+'.'+n.arguments[1].text,w=best.weights[id];if(w!==undefined&&Number(n.arguments[3].text)!==w)edits.push([n.arguments[3].getStart(ast),n.arguments[3].end,String(w),id,Number(n.arguments[3].text)]);
  }
  if(ts.isObjectLiteralExpression(n)) {
   const prop=name=>n.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(ast)===name)?.initializer;
   const id=prop('id'),weight=prop('weight');
   if(id&&ts.isStringLiteral(id)&&weight&&ts.isNumericLiteral(weight)&&best.weights[id.text]!==undefined&&Number(weight.text)!==best.weights[id.text])edits.push([weight.getStart(ast),weight.end,String(best.weights[id.text]),id.text,Number(weight.text)]);
  }
  ts.forEachChild(n,visit);
 }
 visit(ast);let output=source;
 for(const [a,b,w,id,old]of edits.sort((a,b)=>b[0]-a[0])){output=output.slice(0,a)+w+output.slice(b);changed.push({id,old,weight:Number(w)});}
 if(output!==source)writeFileSync(path,output);
}
const path=resolve(ROOT,'src/lib/engine/score.ts');let source=readFileSync(path,'utf8');
source=source.replace(/export const SCORING_POLICY: ScoringPolicy = [^;]+;/,'export const SCORING_POLICY: ScoringPolicy = '+JSON.stringify(best.policy)+';');writeFileSync(path,source);
writeFileSync(resolve(OUT,'applied.json'),JSON.stringify({searchId:best.id,policy:best.policy,changed},null,2)+'\n');
console.log(changed);
