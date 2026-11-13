// Hierarchical illustration layout: safe, bounded parent groups and stable SVG draw order.
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const number = n => typeof n === 'number' && Number.isFinite(n);
const escNum = n => Number(n).toFixed(2);
export function validateHierarchy(objects, root, errors) {
  const map=new Map(objects.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
  for (const [i,o] of objects.entries()) {
    if(!o || typeof o!=='object')continue;
    const where=root+'.objects['+i+']';
    if (own(o,'layer') && (!Number.isInteger(o.layer)||o.layer < -20||o.layer >20))
      errors.push(where+'.layer: expected integer from -20 to 20');
    if (own(o,'parent') && (typeof o.parent!=='string'||map.get(o.parent)?.type!=='group'))
      errors.push(where+'.parent: must refer to an existing group');
    if (o.parent===o.id)errors.push(where+'.parent: group cannot parent itself');
    if (o.type==='line') {
      const ends=[map.get(o.from),map.get(o.to)];
      for (const end of ends) if(end && ['line','group'].includes(end.type))
        errors.push(where+': line endpoint cannot be line or group');
      for (const end of ends) if(end && (end.parent??null)!==(o.parent??null))
        errors.push(where+': line and endpoint must share the same parent group');
    }
    if (o.type!=='line' && own(o,'x') && own(o,'y')) {
      const range=o.parent?[-450,450]:[0,900];
      for(const k of ['x','y'])if(!number(o[k])||o[k]<range[0]||o[k]>range[1])
        errors.push(where+'.'+k+': expected coordinate in ['+range.join(', ')+']');
    }
  }
  for(const o of objects){
    if(!o || typeof o.id!=='string')continue;
    const seen=new Set([o.id]); let cursor=o,depth=0;
    while(cursor?.parent) {
      if(seen.has(cursor.parent)){errors.push(root+'.objects: circular group dependency at '+o.id);break;}
      seen.add(cursor.parent);
      cursor=map.get(cursor.parent); depth++;
      if(depth>4){errors.push(root+'.objects: maximum group nesting depth is four');break;}
      if(!cursor || cursor.type!=='group')break;
    }
  }
}
export function renderHierarchy(objects,index,renderLeaf){
 const map=new Map();
 for (const [i,o] of objects.entries()) {
   const parent=o.parent??'';
   if(!map.has(parent))map.set(parent,[]);
   map.get(parent).push({o,i});
 }
 const renderLevel=parent=>(map.get(parent)||[])
  .sort((a,b)=>((a.o.layer??0)-(b.o.layer??0))||
    (a.o.type==='line'?-1:b.o.type==='line'?1:0)||
    (a.i-b.i))
  .map(({o})=>{
    if(o.type!=='group')return renderLeaf(o,index);
    const name='directed-'+index+'-'+o.id,opacity=escNum(o.initial?.opacity??1);
    return '<g transform="translate('+escNum(o.x)+' '+escNum(o.y)+')"><g id="'+name+'" style="opacity:'+opacity+'">'+renderLevel(o.id)+'</g></g>';
  }).join('');
 return renderLevel('');
}
