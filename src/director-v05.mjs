// v0.5: local, authored, seekable 2D actor rigs. Never accepts raw SVG or code.
export const CHARACTER_ACTIONS=Object.freeze(['wave','walk','nod','cheer']);
export const TRANSITION_KINDS=Object.freeze(['fade','wipe-left','iris']);
const rec=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const hex=x=>typeof x==='string'&&/^#[0-9a-fA-F]{6}$/.test(x);
const between=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
const f=n=>Number(n).toFixed(2);
const fields=(o,allowed,at,errors)=>{for(const key of Object.keys(o))if(!allowed.includes(key))errors.push(at+': unknown property '+key);};
function span(n,a,b,at,errors){if(!between(n,a,b))errors.push(at+': expected finite number in ['+a+', '+b+']');}
export function validateCharacter(o,at,errors){
 fields(o,['id','type','x','y','parent','layer','initial','shadow','size','skin','shirt','pants','hair'],at,errors);
 const range=o.parent?[-450,450]:[0,900];
 span(o.x,...range,at+'.x',errors);span(o.y,...range,at+'.y',errors);
 span(o.size,80,420,at+'.size',errors);
 for(const key of ['skin','shirt','pants','hair'])
  if(!hex(o[key]))errors.push(at+'.'+key+': expected #RRGGBB');
}
export function validatePerformances(performances,objects,where,errors){
 if(performances===undefined)return;
 if(!Array.isArray(performances)||performances.length>24){
  errors.push(where+': expected 0–24 actor performances');return;
 }
 const map=new Map(objects.filter(o=>o&&typeof o.id==='string').map(o=>[o.id,o]));
 const spans=new Map();
 performances.forEach((a,i)=>{
  const at=where+'['+i+']';
  if(!rec(a)){errors.push(at+': expected object');return;}
  fields(a,['actor','action','at','duration'],at,errors);
  if(map.get(a.actor)?.type!=='character')errors.push(at+'.actor: expected a character ID');
  if(!CHARACTER_ACTIONS.includes(a.action))errors.push(at+'.action: unsupported action');
  span(a.at,0,1,at+'.at',errors);span(a.duration,.05,1,at+'.duration',errors);
  if(typeof a.at==='number'&&typeof a.duration==='number'&&a.at+a.duration>1.000001)errors.push(at+': exceeds scene duration');
  if(typeof a.actor==='string'&&between(a.at,0,1)&&between(a.duration,.05,1)){
   const existing=spans.get(a.actor)||[];
   if(existing.some(s=>a.at<s[1]-1e-8&&a.at+a.duration>s[0]+1e-8))
    errors.push(at+': overlapping performance for '+a.actor);
   existing.push([a.at,a.at+a.duration]);spans.set(a.actor,existing);
  }
 });
}
export function validateTransition(t,where,errors,first=false){
 if(t===undefined)return;
 if(!rec(t)){errors.push(where+': expected object');return;}
 fields(t,['kind','color','duration'],where,errors);
 if(!TRANSITION_KINDS.includes(t.kind))errors.push(where+'.kind: unsupported transition kind');
 if(!hex(t.color))errors.push(where+'.color: expected #RRGGBB');
 span(t.duration,.2,1.2,where+'.duration',errors);
 if(first)errors.push(where+': first scene cannot have incoming transition');
}
export function transitionColor(t){return hex(t?.color)?t.color:'#121722';}
export function renderTransitionOverlay(i,role,color){
 if(!['in','out'].includes(role))throw new Error('Invalid transition overlay role');
 return '<div class="scene-transition" id="transition-'+role+'-'+i+'" aria-hidden="true" style="background:'+transitionColor({color})+'"></div>';
}
export function renderCharacter(o,index,shadow=''){
 const id='directed-'+index+'-'+o.id,part=name=>id+'-'+name;
 const skin=o.skin,shirt=o.shirt,pants=o.pants,hair=o.hair;
 const head='<g transform="translate(0 -80)"><g id="'+part('head')+'">'+
  '<rect x="-11" y="35" width="22" height="22" rx="8" fill="'+skin+'"/>'+
  '<ellipse cx="0" cy="0" rx="51" ry="57" fill="'+skin+'"/>'+
  '<path d="M-49 -9 Q-49 -62 0 -65 Q52 -66 54 -9 Q31 -32 18 -29 Q-15 -28 -35 -10 Z" fill="'+hair+'"/>'+
  '<circle cx="-17" cy="4" r="4.8" fill="#1C2633"/><circle cx="17" cy="4" r="4.8" fill="#1C2633"/>'+
  '<path d="M-12 27 Q0 36 12 27" fill="none" stroke="#8D5149" stroke-width="4" stroke-linecap="round"/>'+
 '</g></g>';
 const leftArm='<g transform="translate(-49 -14)"><g id="'+part('arm-left')+'">'+
  '<path d="M0 0 Q-18 32 -32 81" fill="none" stroke="'+shirt+'" stroke-width="28" stroke-linecap="round"/>'+
  '<circle cx="-32" cy="84" r="14" fill="'+skin+'"/></g></g>';
 const rightArm='<g transform="translate(49 -14)"><g id="'+part('arm-right')+'">'+
  '<path d="M0 0 Q17 32 31 81" fill="none" stroke="'+shirt+'" stroke-width="28" stroke-linecap="round"/>'+
  '<circle cx="31" cy="84" r="14" fill="'+skin+'"/></g></g>';
 const leftLeg='<g transform="translate(-25 88)"><g id="'+part('leg-left')+'">'+
  '<path d="M0 0 L-5 71" fill="none" stroke="'+pants+'" stroke-width="32" stroke-linecap="round"/>'+
  '<ellipse cx="-8" cy="73" rx="29" ry="13" fill="#202638"/></g></g>';
 const rightLeg='<g transform="translate(25 88)"><g id="'+part('leg-right')+'">'+
  '<path d="M0 0 L5 71" fill="none" stroke="'+pants+'" stroke-width="32" stroke-linecap="round"/>'+
  '<ellipse cx="8" cy="73" rx="29" ry="13" fill="#202638"/></g></g>';
 const torso='<path d="M-48 -16 Q-56 0 -44 90 L44 90 Q56 0 48 -16 Q20 -31 0 -23 Q-20 -31 -48 -16 Z" fill="'+shirt+'"/>'+
 '<path d="M-33 70 L34 70" stroke="#FFFFFF" stroke-opacity=".14" stroke-width="5"/>';
 // Deliberate painter order: rear legs, torso, head, forward swinging arms.
 return '<g transform="translate('+f(o.x)+' '+f(o.y)+')"><g id="'+id+'"'+shadow+'><g transform="scale('+f(o.size/300)+')">'+
  leftLeg+rightLeg+torso+head+leftArm+rightArm+'</g></g></g>';
}
