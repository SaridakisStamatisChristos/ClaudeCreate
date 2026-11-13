import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkScript} from '../src/spec.mjs';
import {buildHTML} from '../src/composition.mjs';
import {renderDirected} from '../src/directed.mjs';
import {renderEnvironment, environmentCSS} from '../src/directed-environment.mjs';
import {setupDirected} from '../src/directed-runtime.mjs';

const fixture=JSON.parse(await readFile(new URL('../examples/directed_atmosphere_city.json',import.meta.url),'utf8'));
const check=s=>checkScript(s,undefined,{targetSeconds:15});
const times=fixture.scenes.map((_,i)=>({start:i*2.3,duration:2.3,audioDuration:2,words:[]}));

test('all four art-directed environment variants validate, as do the unchanged old scenes',async()=>{
 const checked=check(fixture); assert.equal(checked.ok,true,checked.errors.join('\n'));
 assert.deepEqual(fixture.scenes.map(s=>s.props.environment.particles.type),['mist','fireflies','stars','rain']);
 for(const file of ['directed_compound_city.json','directed_network.json','directed_illustrated.json']){
  const old=JSON.parse(await readFile(new URL('../examples/'+file,import.meta.url),'utf8'));
  const result=check(old);assert.equal(result.ok,true,result.errors.join(';'));
 }
});
test('environment rendering uses deterministic seeded shapes with no fetching or evaluation',()=>{
 for(const [i,s] of fixture.scenes.entries()){
  const first=renderDirected(s,i),second=renderDirected(s,i);
  assert.equal(first,second);
  assert.match(first,new RegExp('id="directed-atmosphere-'+i+'-back"'));
  assert.match(first,new RegExp('id="directed-atmosphere-'+i+'-front"'));
  assert.ok(first.includes('directed-shadow-'+i+'-'));
  assert.doesNotMatch(first,/<(script|foreignObject|image)\b/i);
  assert.doesNotMatch(first,/\s(?:href|onload|onclick)=/i);
  if(s.props.environment.sky)assert.doesNotMatch(first,/<rect width="900" height="900" fill="/);
  const without=structuredClone(s.props.environment);
  without.particles.seed+=1;
  assert.notEqual(renderEnvironment(without,i).back,renderEnvironment(s.props.environment,i).back);
 }
});
test('full-height sky gradients use only bounded color values',()=>{
 const html=buildHTML(fixture,times,{draft:true});
 assert.match(html,/style="background:linear-gradient\(180deg,#0A1931,#C58687\)"/);
 assert.match(html,/style="background:linear-gradient\(180deg,#050E24,#1B3F5E\)"/);
 const invalid=structuredClone(fixture);
 invalid.scenes[0].props.environment.sky.top='red";onload="alert(1)';
 const safe=buildHTML(invalid,times,{draft:true});
 assert.match(safe,/style="background:#111F37"/);
 assert.ok(!safe.includes('onload="alert(1)'));
 assert.equal(environmentCSS({background:'#213456'}),'background:#213456');
});
test('bad particle configurations and shadow filters fail validation rather than being normalized silently',()=>{
 const bad=structuredClone(fixture);
 const p=bad.scenes[0].props.environment.particles;
 p.color='javascript:evil';
 p.count=5000;p.seed=-5;p.opacity=12;p.driftX=2000;
 p.callback='danger';
 const shadow=bad.scenes[0].props.objects.find(o=>o.id==='street').shadow;
 shadow.color='url(#x)';shadow.blur=999;shadow.extra='inject';
 const errors=check(bad).errors.join('\n');
 assert.match(errors,/expected #RRGGBB/);
 assert.match(errors,/expected integer in \[1,60\]/);
 assert.match(errors,/expected integer in \[0,999999\]/);
 assert.match(errors,/expected finite number/);
 assert.match(errors,/unknown property callback/);
 assert.match(errors,/unknown property extra/);
});
test('the scene exposes precisely two seekable motion groups for deterministic atmosphere drift',()=>{
 const old=globalThis.document;
 const nodes=new Map();
 const doc=id=>{
  if(!nodes.has(id))nodes.set(id,{id,querySelector:()=>({getAttribute:()=>null,getTotalLength:()=>100})});
  return nodes.get(id);
 };
 globalThis.document={getElementById:doc};
 const tweens=[],sets=[];
 try{
  setupDirected({fromTo:(...args)=>tweens.push(args)},fixture.scenes[0],0,3,4,{set:(...args)=>sets.push(args)});
  const atmospheric=tweens.filter(t=>t[0]?.id?.startsWith('directed-atmosphere-0-'));
  assert.equal(atmospheric.length,2);
  assert.deepEqual(atmospheric.map(t=>t[3]),[3,3]);
  assert.equal(atmospheric[0][2].x,85*.38);
  assert.equal(atmospheric[1][2].y,-24);
  assert.ok(atmospheric.every(t=>t[2].duration===4&&t[2].ease==='none'&&t[2].immediateRender===false));
  assert.ok(sets.length>5);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
test('shadows only appear on their bounded target shape, group and art object',()=>{
 const sky=renderDirected(fixture.scenes[0],0);
 assert.match(sky,/id="directed-0-street"[^>]+filter="url\(#directed-shadow-0-street\)"/);
 assert.match(sky,/id="directed-0-sun"[^>]+filter="url\(#directed-shadow-0-sun\)"/);
 assert.match(sky,/<feDropShadow dx="0\.00" dy="0\.00" stdDeviation="22\.00"/);
 assert.ok((sky.match(/<filter id="directed-shadow-/g)||[]).length===4);
});
