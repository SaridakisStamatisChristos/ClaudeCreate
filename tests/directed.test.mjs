import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkScript} from '../src/spec.mjs';
import {buildHTML} from '../src/composition.mjs';
import {setupDirected} from '../src/directed-runtime.mjs';

const example=JSON.parse(await readFile(new URL('../examples/directed_network.json',import.meta.url),'utf8'));
const timeline=example.scenes.map((_,i)=>({start:i*3,duration:3,audioDuration:2.7,words:[]}));
const check=script=>checkScript(script,undefined,{targetSeconds:15});
test('three distinct content-specific directed scenes validate',()=>{
 const result=check(example);
 assert.equal(result.ok,true,result.errors.join('\n'));
 assert.equal(new Set(example.scenes.map(x=>x.props.background)).size,3);
});
test('all scene primitives are compiled into a local SVG composition',()=>{
 const html=buildHTML(example,timeline,{draft:true});
 assert.equal((html.match(/class="directed-svg"/g)||[]).length,3);
 assert.match(html,/id="directed-0-seed"/);
 assert.match(html,/id="directed-1-hub"/);
 assert.match(html,/id="directed-2-title"/);
 assert.match(html,/stroke-dasharray=/);
 assert.match(html,/setupDirected\(tl,s,i,start,dur,gsap\)/);
 assert.match(html,/\.\/directed-runtime\.mjs/);
 assert.doesNotMatch(html,/https?:\/\/.*\.js/);
});
test('scene object ids, links, and animation timelines are strictly validated',()=>{
 const bad=structuredClone(example);
 bad.scenes[0].props.objects.push({...bad.scenes[0].props.objects[0]});
 bad.scenes[0].props.objects[8].to='missing';
 bad.scenes[0].props.animations[0].duration=2;
 bad.scenes[0].props.animations[1].ease='injected()';
 bad.scenes[0].props.animations.push({target:'seed',property:'draw',at:0,duration:.2,from:0,to:1,ease:'none'});
 const result=check(bad);
 assert.equal(result.ok,false);
 assert.match(result.errors.join(' '),/duplicate/);
 assert.match(result.errors.join(' '),/invalid to endpoint/);
 assert.match(result.errors.join(' '),/exceeds scene duration/);
 assert.match(result.errors.join(' '),/unsupported ease/);
 assert.match(result.errors.join(' '),/draw requires line/);
});
test('markup is escaped and script property injection rejected',()=>{
 const unsafe=structuredClone(example);
 unsafe.scenes[2].props.objects[2].text='<script>alert("x")</script>';
 unsafe.scenes[2].props.animations[0].callback='alert(1)';
 const result=check(unsafe);
 assert.equal(result.ok,false);
 assert.match(result.errors.join(' '),/unknown property callback/);
 delete unsafe.scenes[2].props.animations[0].callback;
 assert.equal(check(unsafe).ok,true);
 const html=buildHTML(unsafe,timeline);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>alert("x")</script>'));
});
test('runtime adds seekable GSAP tweens with relative timings, no timers',()=>{
 const old=globalThis.document;
 const elements=new Map();
 const fake=(id)=>{
  if(!elements.has(id))elements.set(id,{id,querySelector:()=>({id:id+'-line',getAttribute:()=> '100'})});
  return elements.get(id);
 };
 const sets=[],tweens=[];
 globalThis.document={getElementById:fake};
 try{
  setupDirected({fromTo:(...v)=>tweens.push(v)},example.scenes[0],0,10,4,{set:(...v)=>sets.push(v)});
  assert.equal(tweens.length,16);
  assert.ok(tweens.some(x=>x[3]===10+4*.22));
  assert.ok(tweens.some(x=>x[1]?.attr?.['stroke-dashoffset']===100));
  assert.ok(sets.length>=16);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
