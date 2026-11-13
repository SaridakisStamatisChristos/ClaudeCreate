// Declarative SVG scene primitives. Model-authored scene data is never executable code.
import { ART_TYPES, validateArtObject, validateGradient, renderArtObject, gradientDefs, artFill } from './directed-art.mjs';
export const DIRECTED_TYPES = Object.freeze(['circle','rect','text','line',...ART_TYPES]);
export const DIRECTED_EASES = Object.freeze(['none','power1.out','power2.out','power2.inOut','back.out(1.4)']);
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const number = (x,min,max) => typeof x === 'number' && Number.isFinite(x) && x>=min && x<=max;
const idOK = x => typeof x === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(x) && x!=='camera';
const hex = x => typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x);
const esc = x => String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f = x => Number(x).toFixed(2);
function keys(o,allowed,p,errors) { for (const key of Object.keys(o)) if(!allowed.includes(key)) errors.push(p+': unknown property '+key); }
function span(v,min,max,p,errors) { if(!number(v,min,max)) errors.push(p+': expected finite number in ['+min+', '+max+']'); }
function state(s,p,errors,type) {
 if(!isObj(s)){errors.push(p+': expected object');return;}
 keys(s,['opacity','scale','x','y','rotation','draw'],p,errors);
 for(const [key,v] of Object.entries(s)){
  if(key==='draw' && !['line','path'].includes(type)) errors.push(p+'.draw: only lines or stroked paths support draw');
  const [min,max] = key==='opacity'||key==='draw'?[0,1]:key==='scale'?[0,4]:key==='rotation'?[-360,360]:[-900,900];
  span(v,min,max,p+'.'+key,errors);
 }
}
export function validateDirectedProps(p,scenePath,errors){
 const root=scenePath+'.props';
 if(!isObj(p)){errors.push(root+': expected object');return;}
 keys(p,['background','objects','animations','camera'],root,errors);
 if(!hex(p.background))errors.push(root+'.background: expected #RRGGBB');
 if(!Array.isArray(p.objects)||p.objects.length<1||p.objects.length>64){errors.push(root+'.objects: expected 1–64 objects');return;}
 const objects=new Map();
 p.objects.forEach((o,i)=>{
  const path=root+'.objects['+i+']';
  if(!isObj(o)){errors.push(path+': expected object');return;}
  if(!idOK(o.id))errors.push(path+'.id: invalid identifier');
  else if(objects.has(o.id))errors.push(path+'.id: duplicate '+o.id);
  else objects.set(o.id,o);
  if(!DIRECTED_TYPES.includes(o.type)){errors.push(path+'.type: unknown primitive');return;}
  if(ART_TYPES.includes(o.type)){
   validateArtObject(o,path,errors);
   if(o.initial!==undefined)state(o.initial,path+'.initial',errors,o.type);
   return;
  }
  const fields=o.type==='line'?['from','to','stroke','strokeWidth']:o.type==='circle'?['x','y','radius','fill']:o.type==='rect'?['x','y','width','height','radius','fill']:['x','y','text','fontSize','fill'];
  keys(o,['id','type','initial',...fields,...(['circle','rect'].includes(o.type)?['gradient']:[])],path,errors);
  if(o.type==='line'){
   if(typeof o.from!=='string'||typeof o.to!=='string')errors.push(path+': line endpoints must be IDs');
   if(!hex(o.stroke))errors.push(path+'.stroke: expected #RRGGBB');
   span(o.strokeWidth,1,30,path+'.strokeWidth',errors);
  }else{
   span(o.x,0,900,path+'.x',errors);span(o.y,0,900,path+'.y',errors);
   if(!hex(o.fill))errors.push(path+'.fill: expected #RRGGBB');
   if(['circle','rect'].includes(o.type))validateGradient(o,path,errors);
   if(o.type==='circle')span(o.radius,1,250,path+'.radius',errors);
   if(o.type==='rect'){
    span(o.width,1,900,path+'.width',errors);span(o.height,1,900,path+'.height',errors);
    if(o.radius!==undefined)span(o.radius,0,100,path+'.radius',errors);
   }
   if(o.type==='text'){
    if(typeof o.text!=='string'||o.text.length<1||o.text.length>160)errors.push(path+'.text: expected 1–160 chars');
    span(o.fontSize,12,160,path+'.fontSize',errors);
   }
  }
  if(o.initial!==undefined)state(o.initial,path+'.initial',errors,o.type);
 });
 for(const [id,o] of objects)if(o.type==='line'){
  for(const end of ['from','to'])if(!objects.has(o[end])||objects.get(o[end])?.type==='line')errors.push(root+'.objects '+id+': invalid '+end+' endpoint');
  if(o.from===o.to)errors.push(root+'.objects '+id+': self-edge');
 }
 if(p.camera!==undefined)state(p.camera,root+'.camera',errors,'camera');
 if(!Array.isArray(p.animations)||p.animations.length>128){errors.push(root+'.animations: expected up to 128 animations');return;}
 const occupied=new Map();
 p.animations.forEach((a,j)=>{
  const path=root+'.animations['+j+']';
  if(!isObj(a)){errors.push(path+': expected object');return;}
  keys(a,['target','property','at','duration','from','to','ease'],path,errors);
  const o=objects.get(a.target);
  if(a.target!=='camera'&&!o)errors.push(path+'.target: unknown '+a.target);
  if(!['opacity','scale','x','y','rotation','draw'].includes(a.property))errors.push(path+'.property: unsupported property');
  if(a.property==='draw'&&!(o?.type==='line'||(o?.type==='path'&&o.stroke)))errors.push(path+'.property: draw requires line or stroked path');
  span(a.at,0,1,path+'.at',errors);span(a.duration,.001,1,path+'.duration',errors);
  if(typeof a.at==='number'&&typeof a.duration==='number'&&a.at+a.duration>1.000001)errors.push(path+': exceeds scene duration');
  if(['opacity','scale','x','y','rotation','draw'].includes(a.property)){
   state({[a.property]:a.from},path+'.from',errors,a.target==='camera'?'camera':o?.type);
   state({[a.property]:a.to},path+'.to',errors,a.target==='camera'?'camera':o?.type);
  }
  if(!DIRECTED_EASES.includes(a.ease))errors.push(path+'.ease: unsupported ease');
  if(typeof a.target==='string'&&typeof a.property==='string'&&Number.isFinite(a.at)&&Number.isFinite(a.duration)){
   const key=a.target+':'+a.property,items=occupied.get(key)||[];
   if(items.some(r=>a.at<r[1]-1e-8&&a.at+a.duration>r[0]+1e-8))errors.push(path+': overlapping '+key);
   items.push([a.at,a.at+a.duration]);occupied.set(key,items);
  }
 });
}
export function renderDirected(scene,index){
 const p=scene.props,byId=new Map(p.objects.map(o=>[o.id,o]));
 const list=[...p.objects.filter(o=>o.type==='line'),...p.objects.filter(o=>o.type!=='line')];
 const defs=p.objects.map(o=>gradientDefs(o,index)).filter(Boolean).join('');
 const shapes=list.map(o=>{
  const name='directed-'+index+'-'+o.id,style='opacity:'+f(o.initial?.opacity??1);
  if(ART_TYPES.includes(o.type))return renderArtObject(o,index);
  if(o.type==='line'){
   const a=byId.get(o.from),b=byId.get(o.to),length=Math.hypot(a.x-b.x,a.y-b.y);
   return '<g id="'+name+'" style="'+style+'"><line x1="'+f(a.x)+'" y1="'+f(a.y)+'" x2="'+f(b.x)+'" y2="'+f(b.y)+'" stroke="'+o.stroke+'" stroke-width="'+f(o.strokeWidth)+'" stroke-linecap="round" stroke-dasharray="'+f(length)+'" stroke-dashoffset="'+f(length*(1-(o.initial?.draw??1)))+'"/></g>';
  }
  let shape;
  if(o.type==='circle')shape='<circle r="'+f(o.radius)+'" fill="'+artFill(o,index)+'"/>';
  else if(o.type==='rect')shape='<rect x="'+f(-o.width/2)+'" y="'+f(-o.height/2)+'" width="'+f(o.width)+'" height="'+f(o.height)+'" rx="'+f(o.radius??0)+'" fill="'+artFill(o,index)+'"/>';
  else shape='<text x="0" y="0" font-size="'+f(o.fontSize)+'" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-weight="700" fill="'+o.fill+'">'+esc(o.text)+'</text>';
  return '<g transform="translate('+f(o.x)+' '+f(o.y)+')"><g id="'+name+'" style="'+style+'">'+shape+'</g></g>';
 }).join('');
 return '<svg class="directed-svg" viewBox="0 0 900 900" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+esc(scene.say)+'"><rect width="900" height="900" fill="'+p.background+'"/><defs>'+defs+'</defs><g id="directed-camera-'+index+'">'+shapes+'</g></svg>';
}
