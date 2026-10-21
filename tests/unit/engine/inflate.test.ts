import{describe,expect,it}from'vitest';
import{deflateRawSync,constants}from'node:zlib';
import{inflateJson}from'../../../src/lib/engine/inflate';
describe('local packed scorecard tables',()=>{
 it.each([{level:0},{level:9},{level:9,strategy:constants.Z_FIXED}])('decodes independent zlib streams %j',options=>{
  for(const value of [{},['as an AI','quoted “text”','🚀'],{data:'Abc 0123456789 '.repeat(20000)}]){
   const raw=Buffer.from(JSON.stringify(value));const packed=deflateRawSync(raw,options);expect(inflateJson(packed.toString('base64'),raw.length)).toEqual(value);
  }
 });
 it('rejects a truncated table and a wrong declared size',()=>{const raw=Buffer.from(JSON.stringify({data:'the same phrase '.repeat(1000)}));const packed=deflateRawSync(raw);expect(()=>inflateJson(packed.subarray(0,5).toString('base64'),raw.length)).toThrow();expect(()=>inflateJson(packed.toString('base64'),raw.length-1)).toThrow();});
});
