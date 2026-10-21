/** Parse generated Markdown rows without treating its column delimiter as data.
 * legacySeparator exists solely to reproduce the already-frozen v1 experiment.
 */
export function parseDrops(markdown,{legacySeparator=false}={}) {
 const rows=[];
 for(const line of markdown.split('\n')) {
  if(!line.startsWith('| ')||line.startsWith('| Source'))continue;
  const fields=line.slice(2,-2).split(' | ');
  if(fields.length!==3)throw Error('Unparsed dictionary drop row');
  if(fields.every(value=>/^:?-{3,}:?$/.test(value))&&!legacySeparator)continue;
  const [ref,raw,reason]=fields;
  rows.push({ref,value:raw.replaceAll('\\|','|'),reason});
 }
 return rows;
}
