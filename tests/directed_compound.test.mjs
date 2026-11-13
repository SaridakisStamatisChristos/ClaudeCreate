import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkScript } from '../src/spec.mjs';
import { renderDirected } from '../src/directed.mjs';
import { setupDirected } from '../src/directed-runtime.mjs';
import { buildHTML } from '../src/composition.mjs';

const read=async name=>JSON.parse(await readFile(new URL('../examples/'+name,import.meta.url),'utf8'));
const script=await read('directed_compound_city.json');
const validate=s=>checkScript(s,undefined,{targetSeconds:15});
const scene=(i=0,s=script)=>s.scenes[i];
const find=(id,s)=>s.props.objects.find(x=>x.id===id);
test('compound city storyboard validates, preserving four distinct visual structures',()=>{
 const r=validate(script);
 assert.equal(r.ok,true,r.errors.join('\n'));
 assert.equal(script.scenes.length,4);
 const kinds=new Set(script.scenes.flatMap(s=>s.props.objects.map(o=>o.type)));
 for(const kind of ['group','rect','polygon','ellipse','line','path','circle','icon','text'])
  assert.ok(kinds.has(kind),kind);
 assert.equal(scene(1).props.animations.filter(a=>a.property==='pathProgress').length,1);
});
test('compound SVG nesting preserves parent positions and stable front-to-back layering',()=>{
 const svg=renderDirected(scene(0),0);
 assert.match(svg,/<g transform="translate\(450\.00 660\.00\)"><g id="directed-0-street"/);
 assert.match(svg,/<g transform="translate\(-210\.00 15\.00\)"><g id="directed-0-house1"/);
 const house=svg.indexOf('id="directed-0-house1"'),roof=svg.indexOf('id="directed-0-roof1"');
 assert.ok(house>=0&&roof>house,'higher layer roof follows the building');
 assert.ok(svg.indexOf('id="directed-0-nightSky"')<house);
 assert.equal((svg.match(/id="directed-0-street"/g)||[]).length,1);
});
test('path-follow animations use measured SVG curve length and local target anchors',()=>{
 const old=globalThis.document, elements=new Map();
 const mockShape={
   getAttribute:()=>null,getTotalLength:()=>600,
   getPointAtLength:d=>({x:-300+d,y:-175+d*.2})
 };
 const get=id=>{
  if(!elements.has(id))elements.set(id,{id,querySelector:()=>mockShape});
  return elements.get(id);
 };
 const sets=[], tweens=[];
 globalThis.document={getElementById:get};
 try {
  const directed=scene(1);
  setupDirected({fromTo:(...a)=>tweens.push(a)},directed,1,3,4,{set:(...a)=>sets.push(a)});
  const follow=tweens.find(args=>args[0]?.progress!==undefined);
  assert.ok(follow,'path-follow tween registered');
  assert.equal(follow[3],3+4*.12);
  assert.equal(follow[2].duration,4*.76);
  follow[0].progress=.5;
  follow[2].onUpdate();
  const last=sets.at(-1);
  assert.equal(last[0].id,'directed-1-spark');
  assert.equal(last[1].x,300);
  assert.equal(last[1].y,60);
 } finally {if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
test('invalid parents, cycles and unsupported layer values are rejected',()=>{
 const a=structuredClone(script);
 find('street',scene(0,a)).parent='roof1';
 find('roof1',scene(0,a)).parent='street';
 find('sun',scene(0,a)).layer=999;
 const e=validate(a).errors.join(' ');
 assert.match(e,/must refer to an existing group/);
 assert.match(e,/circular group dependency/);
 assert.match(e,/expected integer from -20 to 20/);
});
test('invalid path targets and coordinate conflicts cannot reach the renderer',()=>{
 const bad=structuredClone(script);
 const s=scene(1,bad);
 s.props.animations.find(a=>a.property==='pathProgress').path='missing';
 s.props.animations.push({target:'spark',property:'x',at:0,duration:.2,from:0,to:150,ease:'none'});
 const e=validate(bad).errors.join(' ');
 assert.match(e,/valid vector path ID/);
 assert.match(e,/cannot be combined with x\/y tweens/);
});
test('cross-parent path tracking and line connections fail instead of jumping coordinates',()=>{
 const bad=structuredClone(script);
 const s=scene(1,bad);
 find('spark',s).parent='backlight';
 find('powerPath',s).parent='solar';
 const e=validate(bad).errors.join(' ');
 assert.match(e,/must refer to an existing group/);
 assert.match(e,/same parent group/);
 const badLine=structuredClone(script);
 find('edgeLeft',scene(2,badLine)).parent='future';
 assert.match(validate(badLine).errors.join(' '),/parent group/);
});
test('group depth, extra code-like fields and duplicate motion tracks are rejected',()=>{
 const bad=structuredClone(script);
 const obj=scene(0,bad).props.objects;
 for(let i=1;i<=5;i++)obj.push({id:'nested'+i,type:'group',parent:i===1?'street':'nested'+(i-1),x:0,y:0,layer:1});
 obj.push({id:'injected',type:'icon',parent:'nested5',x:0,y:0,name:'person',size:80,stroke:'#FFFFFF',onclick:'alert(1)'});
 const s=scene(1,bad);
 s.props.animations.push({...s.props.animations.find(a=>a.property==='pathProgress'),at:0,duration:.08});
 const e=validate(bad).errors.join(' ');
 assert.match(e,/maximum group nesting depth/);
 assert.match(e,/unknown property onclick/);
 assert.match(e,/only one pathProgress segment/);
});
test('existing six-template pipeline and previous directed scripts remain valid',async()=>{
 const prev=await Promise.all(['dummy.json','directed_network.json','directed_illustrated.json'].map(read));
 for(const item of prev)assert.equal(validate(item).ok,true,validate(item).errors.join('; '));
 const times=script.scenes.map((_,i)=>({start:i*2.4,duration:2.4,audioDuration:2.2,words:[]}));
 const html=buildHTML(script,times,{draft:true});
 assert.match(html,/setupDirected\(tl,s,i,start,dur,gsap\)/);
 assert.match(html,/id="directed-1-powerPath"/);
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:\/\//);
});
