// ClaudeCreate procedural illustration primitives v0.2.
// Data-only numeric paths and curated local symbols; never execute or trust raw SVG.
export const ART_TYPES = Object.freeze(['ellipse','polygon','path','icon']);
export const ICON_NAMES = Object.freeze(['lightbulb','person','globe','leaf','book','rocket','factory','computer']);
const sym = Object.freeze({
 lightbulb:'<path d="M34 65 Q18 50 28 30 Q36 12 50 12 Q69 12 75 31 Q81 51 65 65 M39 68 H61 M41 78 H59 M44 86 H56"/>',
 person:'<circle cx="50" cy="24" r="14"/><path d="M23 88 V67 Q23 45 45 45 H55 Q77 45 77 67 V88 M35 87 V64 M65 87 V64"/>',
 globe:'<circle cx="50" cy="50" r="38"/><path d="M12 50 H88 M50 12 V88 M22 28 Q50 45 78 28 M22 72 Q50 55 78 72 M50 12 Q22 49 50 88 M50 12 Q78 49 50 88"/>',
 leaf:'<path d="M16 82 Q10 33 45 18 Q68 9 85 13 Q89 51 64 72 Q42 92 16 82 Z M17 82 Q47 51 74 30 M43 60 L37 38 M54 48 L76 49"/>',
 book:'<path d="M10 18 Q33 10 50 22 Q67 10 90 18 V79 Q67 70 50 82 Q33 70 10 79 Z M50 22 V82 M19 31 Q31 29 42 35 M58 35 Q71 29 81 31 M19 46 Q32 43 42 49 M58 49 Q69 43 81 46"/>',
 rocket:'<path d="M48 11 Q69 28 69 52 L61 70 H37 L29 52 Q29 28 48 11 Z M29 47 L13 58 L16 79 L37 70 M69 47 L85 58 L81 79 L61 70 M40 78 Q37 90 47 97 Q58 91 55 78 M48 40 A9 9 0 1 0 48 58 A9 9 0 1 0 48 40"/>',
 factory:'<path d="M10 86 V55 L31 68 V47 L51 60 V36 H65 V17 H80 V86 Z M65 36 H80 M23 76 H31 M42 76 H50 M61 76 H69"/>',
 computer:'<rect x="12" y="16" width="76" height="54" rx="5"/><path d="M50 70 V84 M30 85 H70 M27 35 L40 49 L27 59 M47 59 H67"/>'
});
const rec = v => v!==null && typeof v==='object' && !Array.isArray(v);
const finite = (v,a,b) => typeof v==='number' && Number.isFinite(v) && v>=a && v<=b;
const hex = v => typeof v==='string' && /^#[0-9a-fA-F]{6}$/.test(v);
const f = n => Number(n).toFixed(2);
const escape = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allowed=(o,fields,p,errors)=>{for(const key of Object.keys(o))if(!fields.includes(key))errors.push(p+': unknown property '+key);};
const span=(v,a,b,p,errors)=>{if(!finite(v,a,b))errors.push(p+': expected finite number in ['+a+', '+b+']');};
const color=(v,p,errors,none=false)=>{if(!hex(v)&&!(none&&v==='none'))errors.push(p+': expected #RRGGBB'+(none?' or none':''));};
export function validateGradient(o,p,errors){
 if(o.gradient===undefined)return;
 const g=o.gradient;
 if(!rec(g)){errors.push(p+'.gradient: expected object');return;}
 allowed(g,['start','end','direction'],p+'.gradient',errors);
 color(g.start,p+'.gradient.start',errors);
 color(g.end,p+'.gradient.end',errors);
 if(!['vertical','horizontal','diagonal'].includes(g.direction))errors.push(p+'.gradient.direction: unsupported direction');
 if(o.fill==='none')errors.push(p+'.gradient: no gradient when fill is none');
}
export function validateArtObject(o,p,errors){
 const fields={
  ellipse:['x','y','rx','ry','fill','gradient','stroke','strokeWidth'],
  polygon:['x','y','points','fill','gradient','stroke','strokeWidth'],
  path:['x','y','commands','fill','gradient','stroke','strokeWidth'],
  icon:['x','y','size','name','stroke','strokeWidth']
 }[o.type];
 allowed(o,['id','type','initial',...fields],p,errors);
 span(o.x,0,900,p+'.x',errors);span(o.y,0,900,p+'.y',errors);
 if(o.type==='icon'){
  if(!ICON_NAMES.includes(o.name))errors.push(p+'.name: unsupported icon');
  span(o.size,20,450,p+'.size',errors);
  color(o.stroke,p+'.stroke',errors);
  span(o.strokeWidth??5,1,12,p+'.strokeWidth',errors);
  return;
 }
 color(o.fill,p+'.fill',errors,true);
 if(o.stroke!==undefined)color(o.stroke,p+'.stroke',errors);
 if(o.strokeWidth!==undefined)span(o.strokeWidth,1,30,p+'.strokeWidth',errors);
 if(o.fill==='none'&&!hex(o.stroke))errors.push(p+': an unfilled shape requires stroke');
 validateGradient(o,p,errors);
 if(o.type==='ellipse'){span(o.rx,1,450,p+'.rx',errors);span(o.ry,1,450,p+'.ry',errors);}
 if(o.type==='polygon'){
  if(!Array.isArray(o.points)||o.points.length<3||o.points.length>32)errors.push(p+'.points: expected 3–32 vertices');
  else o.points.forEach((pt,i)=>{const q=p+'.points['+i+']';if(!rec(pt)){errors.push(q+': expected object');return;}allowed(pt,['x','y'],q,errors);span(pt.x,-450,450,q+'.x',errors);span(pt.y,-450,450,q+'.y',errors);});
 }
 if(o.type==='path'){
  const cs=o.commands;
  if(!Array.isArray(cs)||cs.length<2||cs.length>48){errors.push(p+'.commands: expected 2–48 segments');return;}
  for(let i=0;i<cs.length;i++){
   const c=cs[i],q=p+'.commands['+i+']';
   if(!rec(c)){errors.push(q+': expected object');continue;}
   if(!['M','L','Q','C','Z'].includes(c.op)){errors.push(q+'.op: unsupported command');continue;}
   if((i===0&&c.op!=='M')||(i>0&&c.op==='M'))errors.push(q+': only first command can be M');
   if(c.op==='Z'&&i!==cs.length-1)errors.push(q+': close must be final');
   const names={M:['x','y'],L:['x','y'],Q:['cx','cy','x','y'],C:['c1x','c1y','c2x','c2y','x','y'],Z:[]}[c.op];
   allowed(c,['op',...names],q,errors);
   names.forEach(k=>span(c[k],-450,450,q+'.'+k,errors));
  }
  if(cs[1]?.op==='Z')errors.push(p+'.commands: path must contain a drawn segment');
 }
}
export function gradientDefs(o,index){
 if(!o.gradient)return '';
 const id='artgrad-'+index+'-'+o.id;
 const [x1,y1,x2,y2]={horizontal:[0,0,1,0],vertical:[0,0,0,1],diagonal:[0,0,1,1]}[o.gradient.direction]??[0,0,0,1];
 return '<linearGradient id="'+id+'" x1="'+x1*100+'%" y1="'+y1*100+'%" x2="'+x2*100+'%" y2="'+y2*100+'%"><stop offset="0%" stop-color="'+o.gradient.start+'"/><stop offset="100%" stop-color="'+o.gradient.end+'"/></linearGradient>';
}
export function artFill(o,index){return o.gradient?'url(#artgrad-'+index+'-'+o.id+')':o.fill;}
function pathD(commands){return commands.map(c=>{
 switch(c.op){
  case 'Z':return 'Z';
  case 'M':case 'L':return c.op+' '+f(c.x)+' '+f(c.y);
  case 'Q':return 'Q '+f(c.cx)+' '+f(c.cy)+' '+f(c.x)+' '+f(c.y);
  case 'C':return 'C '+f(c.c1x)+' '+f(c.c1y)+' '+f(c.c2x)+' '+f(c.c2y)+' '+f(c.x)+' '+f(c.y);
 }
}).join(' ');}
export function renderArtObject(o,index){
 const id='directed-'+index+'-'+o.id;
 const fill=artFill(o,index);
 const style='opacity:'+f(o.initial?.opacity??1);
 const stroke=o.stroke?' stroke="'+o.stroke+'" stroke-width="'+f(o.strokeWidth??5)+'" stroke-linejoin="round" stroke-linecap="round"':'';
 let child='';
 if(o.type==='ellipse')child='<ellipse rx="'+f(o.rx)+'" ry="'+f(o.ry)+'" fill="'+fill+'"'+stroke+'/>';
 if(o.type==='polygon')child='<polygon points="'+o.points.map(pt=>f(pt.x)+','+f(pt.y)).join(' ')+'" fill="'+fill+'"'+stroke+'/>';
 if(o.type==='path')child='<path d="'+pathD(o.commands)+'" fill="'+fill+'"'+stroke+'/>';
 if(o.type==='icon')child='<g transform="scale('+f(o.size/100)+') translate(-50 -50)" fill="none" stroke="'+o.stroke+'" stroke-width="'+f(o.strokeWidth??5)+'" stroke-linejoin="round" stroke-linecap="round">'+sym[o.name]+'</g>';
 return '<g transform="translate('+f(o.x)+' '+f(o.y)+')"><g id="'+id+'" style="'+style+'">'+child+'</g></g>';
}
