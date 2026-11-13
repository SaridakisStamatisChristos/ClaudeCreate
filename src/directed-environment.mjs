// v0.4 environmental art direction. No random calls at render-time, external images, or scripts.
const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const hex=v=>typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v);
const f=n=>Number(n).toFixed(2);
const attrs=(o,allowed,p,errors)=>{for(const k of Object.keys(o))if(!allowed.includes(k))errors.push(p+': unknown property '+k);};
const valid=(v,lo,hi,p,errors)=>{if(!finite(v,lo,hi))errors.push(p+': expected finite number in ['+lo+', '+hi+']');};
export const PARTICLE_TYPES=Object.freeze(['stars','fireflies','mist','rain']);
export function validateEnvironment(env,where,errors){
 if(env===undefined)return;
 if(!rec(env)){errors.push(where+': expected object');return;}
 attrs(env,['sky','particles'],where,errors);
 if(env.sky!==undefined){
  const sky=env.sky,p=where+'.sky';
  if(!rec(sky))errors.push(p+': expected object');
  else{
   attrs(sky,['top','bottom'],p,errors);
   if(!hex(sky.top))errors.push(p+'.top: expected #RRGGBB');
   if(!hex(sky.bottom))errors.push(p+'.bottom: expected #RRGGBB');
  }
 }
 if(env.particles!==undefined){
  const v=env.particles,p=where+'.particles';
  if(!rec(v)){errors.push(p+': expected object');return;}
  attrs(v,['type','count','seed','color','opacity','driftX','driftY'],p,errors);
  if(!PARTICLE_TYPES.includes(v.type))errors.push(p+'.type: invalid particle type');
  if(!Number.isInteger(v.count)||v.count<1||v.count>60)errors.push(p+'.count: expected integer in [1,60]');
  if(!Number.isInteger(v.seed)||v.seed<0||v.seed>999999)errors.push(p+'.seed: expected integer in [0,999999]');
  if(!hex(v.color))errors.push(p+'.color: expected #RRGGBB');
  valid(v.opacity,.05,.8,p+'.opacity',errors);
  valid(v.driftX,-160,160,p+'.driftX',errors);
  valid(v.driftY,-160,160,p+'.driftY',errors);
 }
}
export function validateShadow(shadow,where,errors){
 if(shadow===undefined)return;
 if(!rec(shadow)){errors.push(where+'.shadow: expected object');return;}
 attrs(shadow,['color','blur','dx','dy','opacity'],where+'.shadow',errors);
 if(!hex(shadow.color))errors.push(where+'.shadow.color: expected #RRGGBB');
 valid(shadow.blur,0,22,where+'.shadow.blur',errors);
 valid(shadow.dx,-32,32,where+'.shadow.dx',errors);
 valid(shadow.dy,-32,32,where+'.shadow.dy',errors);
 valid(shadow.opacity,.05,.8,where+'.shadow.opacity',errors);
}
export function shadowRef(o,index){
 return o.shadow?' filter="url(#directed-shadow-'+index+'-'+o.id+')"':'';
}
export function renderShadowDefs(objects,index){
 return objects.filter(o=>o.shadow).map(o=>{
  const s=o.shadow;
  return '<filter id="directed-shadow-'+index+'-'+o.id+'" x="-65%" y="-65%" width="230%" height="230%" color-interpolation-filters="sRGB"><feDropShadow dx="'+f(s.dx)+'" dy="'+f(s.dy)+'" stdDeviation="'+f(s.blur)+'" flood-color="'+s.color+'" flood-opacity="'+f(s.opacity)+'"/></filter>';
 }).join('');
}
// Deterministic PRNG intentionally independent of browser or JS Math.random state.
function generator(seed){
 let s=(seed+0x9e3779b9)>>>0;
 return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
}
export function renderEnvironment(environment,index){
 if(!environment?.particles)return {back:'',front:''};
 const p=environment.particles,rand=generator(p.seed),back=[],front=[];
 for(let i=0;i<p.count;i++){
  const x=40+rand()*820,y=40+rand()*820,level=rand(),r=rand();
  const opacity=f(p.opacity*(.43+.57*level));
  let child='';
  switch(p.type){
   case 'stars':child='<circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+f(1.5+r*3.1)+'" fill="'+p.color+'" opacity="'+opacity+'"/>';break;
   case 'fireflies':child='<circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+f(4+r*5)+'" fill="'+p.color+'" opacity="'+opacity+'"/><circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+f(13+r*8)+'" fill="'+p.color+'" opacity="'+f(p.opacity*.11)+'"/>';break;
   case 'mist':child='<ellipse cx="'+f(x)+'" cy="'+f(y)+'" rx="'+f(35+r*75)+'" ry="'+f(15+level*35)+'" fill="'+p.color+'" opacity="'+f(p.opacity*.32)+'"/>';break;
   case 'rain':child='<line x1="'+f(x)+'" y1="'+f(y)+'" x2="'+f(x-10-r*8)+'" y2="'+f(y+27+level*24)+'" stroke="'+p.color+'" stroke-width="'+f(1.5+r*2)+'" opacity="'+opacity+'" stroke-linecap="round"/>';break;
  }
  (i%4===0?front:back).push(child);
 }
 const id='directed-atmosphere-'+index;
 return {
  back:'<g id="'+id+'-back" pointer-events="none">'+back.join('')+'</g>',
  front:'<g id="'+id+'-front" pointer-events="none">'+front.join('')+'</g>'
 };
}
export function environmentCSS(p){
 const a=p.environment?.sky;
 if(a&&hex(a.top)&&hex(a.bottom))return 'background:linear-gradient(180deg,'+a.top+','+a.bottom+')';
 return 'background:'+(hex(p.background)?p.background:'#111318');
}
