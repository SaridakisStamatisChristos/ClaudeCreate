import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkScript} from '../src/spec.mjs';
import {renderDirected} from '../src/directed.mjs';
import {buildHTML} from '../src/composition.mjs';
import {setupPerformances,setupSceneTransitions} from '../src/director-runtime.mjs';

const fixture=JSON.parse(await readFile(new URL('../examples/directed_story_v05.json',import.meta.url),'utf8'));
const timeline=fixture.scenes.map((_,i)=>({start:i*2.5,duration:2.5,audioDuration:2.25,words:[]}));
const validate=(s)=>checkScript(s,undefined,{targetSeconds:15});
const tested=(s=fixture)=>validate(s).errors.join('\n');

test('v0.5 story validates with original scenes and three distinct transitions',()=>{
 assert.equal(validate(fixture).ok,true,tested());
 assert.equal(fixture.scenes.length,4);
 assert.deepEqual(fixture.scenes.map(s=>s.transition?.kind??'none'),['none','fade','wipe-left','iris']);
 assert.equal(fixture.scenes.flatMap(s=>s.props.objects).filter(o=>o.type==='character').length,5);
 assert.equal(fixture.scenes.flatMap(s=>s.props.performances).length,5);
});
test('avatar renders head, eyes, mouth, torso, articulated arms and independently pivoted legs',()=>{
 const html=renderDirected(fixture.scenes[0],0);
 assert.match(html,/id="directed-0-explorer"/);
 for(const part of ['head','arm-left','arm-right','leg-left','leg-right'])
  assert.match(html,new RegExp('id="directed-0-explorer-'+part+'"'));
 assert.match(html,/Q0 36 12 27/);
 const character=fixture.scenes[0].props.objects.find(o=>o.id==='explorer');
 assert.ok(html.includes('scale('+(character.size/300).toFixed(2)+')'));
 assert.doesNotMatch(html,/<script|foreignObject|onload=/);
});
test('scene boundaries contain matched two-sided overlays with no overlay on first arrival',()=>{
 const html=buildHTML(fixture,timeline,{draft:true});
 for(const i of [1,2,3]){
  assert.match(html,new RegExp('id="transition-out-'+(i-1)+'"'));
  assert.match(html,new RegExp('id="transition-in-'+i+'"'));
 }
 assert.doesNotMatch(html,/id="transition-in-0"/);
 assert.doesNotMatch(html,/id="transition-out-3"/);
 assert.match(html,/setupSceneTransitions\(tl,data\.scenes,gsap\)/);
 assert.match(html,/setupPerformances\(tl,s,i,start,dur,gsap\)/);
 assert.match(html,/\.\/director-runtime\.mjs/);
 assert.match(html,/z-index:80;pointer-events:none/);
 assert.doesNotMatch(html,/<script[^>]*src="https?:\/\//);
});
test('invalid character colours, nonnumeric size, injection, and too many performances are rejected',()=>{
 const bad=structuredClone(fixture);
 const guy=bad.scenes[0].props.objects.find(o=>o.type==='character');
 guy.skin='url(https://evil)';guy.size=100000;guy.onload='execute';
 bad.scenes[0].props.performances=Array.from({length:25},()=>({actor:'explorer',action:'wave',at:0,duration:.6}));
 const errs=tested(bad);
 assert.match(errs,/expected #RRGGBB/);
 assert.match(errs,/expected finite number/);
 assert.match(errs,/unknown property onload/);
 assert.match(errs,/0–24 actor performances/);
});
test('reject overlapping actor actions, unsupported actions, and non-character performers',()=>{
 const bad=structuredClone(fixture);
 bad.scenes[0].props.performances.push({actor:'explorer',action:'nod',at:.4,duration:.2});
 bad.scenes[1].props.performances.push({actor:'solar',action:'dance',at:.1,duration:.3});
 const errs=tested(bad);
 assert.match(errs,/overlapping performance/);
 assert.match(errs,/expected a character ID/);
 assert.match(errs,/unsupported action/);
});
test('reject invalid scene transition colours, duration, unknown properties and first-scene transition',()=>{
 const bad=structuredClone(fixture);
 bad.scenes[0].transition={kind:'iris',color:'#123456',duration:.6};
 bad.scenes[1].transition={kind:'danger',color:'red',duration:5,callback:'eval()'};
 const errs=tested(bad);
 assert.match(errs,/first scene cannot have incoming transition/);
 assert.match(errs,/unsupported transition kind/);
 assert.match(errs,/expected #RRGGBB/);
 assert.match(errs,/expected finite number/);
 assert.match(errs,/unknown property callback/);
});
test('performances produce four seekable bounded keyframes per part, no timers',()=>{
 const old=globalThis.document;
 const nodes=new Map(),tweens=[],sets=[];
 globalThis.document={getElementById:id=>{
  if(!nodes.has(id))nodes.set(id,{id});
  return nodes.get(id);
 }};
 try{
  setupPerformances({fromTo:(...v)=>tweens.push(v)},fixture.scenes[0],0,4,2,{set:(...v)=>sets.push(v)});
  assert.equal(tweens.length,5*4);
  assert.equal(tweens[0][3],4+2*.17);
  assert.ok(tweens.every(x=>x[2].immediateRender===false&&x[2].duration>0));
  assert.ok(tweens.some(x=>x[0].id==='directed-0-explorer-leg-left'));
  assert.ok(tweens.some(x=>x[0].id==='directed-0-explorer-arm-right'));
  assert.ok(sets.length>=5);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
test('outgoing and incoming timelines meet at a full-colour cut for each transition',()=>{
 const old=globalThis.document,nodes=new Map(),tweens=[],sets=[];
 globalThis.document={getElementById:id=>{
  if(!nodes.has(id))nodes.set(id,{id});
  return nodes.get(id);
 }};
 try{
  const times=fixture.scenes.map((s,i)=>({...s,start:i*2.5,duration:2.5}));
  setupSceneTransitions({fromTo:(...v)=>tweens.push(v)},times,{set:(...v)=>sets.push(v)});
  assert.equal(tweens.length,6);
  assert.equal(tweens[0][0].id,'transition-out-0');
  assert.equal(tweens[1][0].id,'transition-in-1');
  assert.equal(tweens[0][3],2.5-fixture.scenes[1].transition.duration/2);
  assert.equal(tweens[1][3],2.5);
  assert.deepEqual(tweens[0][2].opacity,1);
  assert.deepEqual(tweens[1][1].opacity,1);
  assert.equal(tweens[2][2].xPercent,0);
  assert.equal(tweens[3][2].xPercent,100);
  assert.match(tweens[4][2].clipPath,/circle\(110%/);
  assert.match(tweens[5][2].clipPath,/circle\(0%/);
  assert.equal(sets.length,6);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
test('old v0.2–v0.4 fixtures validate unchanged',async()=>{
 for(const name of ['directed_network.json','directed_illustrated.json','directed_compound_city.json','directed_atmosphere_city.json']){
  const prior=JSON.parse(await readFile(new URL('../examples/'+name,import.meta.url),'utf8'));
  assert.equal(validate(prior).ok,true,name+': '+tested(prior));
 }
});
