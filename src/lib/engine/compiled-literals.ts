// Exact offline token Aho-Corasick table. Reconstructed once from compact data.
import {RUNTIME} from './runtime-data';
const ids=RUNTIME[0] as string[],tokens=RUNTIME[6] as string[];
const signatures:Record<string,string>=Object.fromEntries((RUNTIME[8] as [number,string][]).map(([i,s])=>[ids[i],s]));
for(const row of RUNTIME[4] as [number,number,number,number,string,number][])if(!row[3])signatures[ids[row[0]]!]=row[4];
export const LITERAL_SIGNATURES:Readonly<Record<string,string>>=signatures;
export const LITERAL_NODES:readonly {next:Record<string,number>;fail:number;outputs:{rule:string;length:number}[]}[]=(RUNTIME[7] as [number[],number,number[]][]).map(([edges,fail,out])=>{const next:Record<string,number>=Object.create(null);for(let i=0;i<edges.length;i+=2)next[tokens[edges[i]!]!]=edges[i+1]!;const outputs=[];for(let i=0;i<out.length;i+=2)outputs.push({rule:ids[out[i]!]!,length:out[i+1]!});return{next,fail,outputs};});
