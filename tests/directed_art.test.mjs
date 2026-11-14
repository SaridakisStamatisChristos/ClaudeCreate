import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkScript} from '../src/spec.mjs';
import {buildHTML} from '../src/composition.mjs';
import {renderDirected} from '../src/directed.mjs';
import {setupDirected} from '../src/directed-runtime.mjs';
import {ICON_NAMES} from '../src/directed-art.mjs';

const fixture=JSON.parse(await readFile(new URL('../examples/directed_illustrated.json',import.meta.url),'utf8'));
const times=fixture.scenes.map((_,i)=>({start:i*2.3,duration:2.3,audioDuration:2,words:[]}));
const validate=s=>checkScript(s,undefined,{targetSeconds:15});
test('illustrated four-scene narrative validates with all new art types',()=>{
 const checked=validate(fixture);
 assert.equal(checked.ok,true,checked.errors.join('\n'));
 assert.equal(fixture.scenes.length,4);
 const types=new Set(fixture.scenes.flatMap(s=>s.props.objects.map(o=>o.type)));
 for(const type of ['ellipse','polygon','path','icon','rect','text'])assert.ok(types.has(type),type);
});
test('renderer emits inline curated icons, path curves, gradients and no external scripts',()=>{
 const html=buildHTML(fixture,times,{draft:true});
 assert.equal((html.match(/class="directed-svg"/g)||[]).length,4);
 assert.match(html,/<linearGradient id="artgrad-0-halo"/);
 assert.match(html,/fill="url\(#artgrad-0-halo\)"/);
 assert.match(html,/<path d="M -260\.00 0\.00 C/);
 assert.match(html,/id="directed-0-lamp"/);
 assert.match(html,/id="directed-2-poly"/);
 assert.match(html,/id="directed-3-ship"/);
 assert.match(html,/style="background:#101C2E"/);
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:\/\//);
});
test('each curated icon has a generated vector glyph, not a placeholder label',()=>{
 for(const name of ICON_NAMES){
  const scene=structuredClone(fixture.scenes[0]);
  scene.props.objects=[{id:"symbol",type:"icon",name,x:450,y:450,size:160,stroke:"#FFFFFF",strokeWidth:5}];
  scene.props.animations=[];
  const errors=[];
  const script={...fixture,scenes:[scene]};
  assert.equal(validate(script).ok,true,validate(script).errors.join(', '));
  const svg=renderDirected(scene,0);
  assert.match(svg,/scale\(1\.60\)/);
  assert.match(svg,/id="directed-0-symbol"/);
  assert.ok((svg.match(/<path /g)||[]).length>=1 || svg.includes('<circle '));
  assert.ok(svg.length>250);
 }
});
test('reject injection in path commands, stroke values, gradients and icons',()=>{
 const bad=structuredClone(fixture);
 bad.scenes[0].props.objects.find(x=>x.id==='lamp').name='javascript:alert(1)';
 bad.scenes[0].props.objects.find(x=>x.id==='halo').gradient.end='url(https://attacker)';
 bad.scenes[1].props.objects.find(x=>x.id==='arc').commands[1].op='</path><script>';
 bad.scenes[3].props.objects.find(x=>x.id==='trail').stroke='red';
 const errors=validate(bad).errors.join(' ');
 assert.match(errors,/unsupported icon/);
 assert.match(errors,/expected #RRGGBB/);
 assert.match(errors,/unsupported command/);
});
test('reject incorrect path geometry, extra props and unsupported draw target',()=>{
 const bad=structuredClone(fixture);
 const a=bad.scenes[0];
 const p=a.props.objects.find(x=>x.id==='wave');
 p.commands[0].op='L';
 p.commands[1].c1x=12000;
 p.malicious='alert(1)';
 a.props.animations.push({target:'lamp',property:'draw',at:0,duration:.3,from:0,to:1,ease:'none'});
 const errors=validate(bad).errors.join(' ');
 assert.match(errors,/only first command can be M/);
 assert.match(errors,/expected finite number/);
 assert.match(errors,/unknown property malicious/);
 assert.match(errors,/draw requires line or stroked path/);
});
test('runtime computes stroke length on curves for deterministic draw animation',()=>{
 const old=globalThis.document;
 const elements=new Map();
 const fake=(id)=>{
  if(!elements.has(id))elements.set(id,{id,querySelector:()=>({getAttribute:()=>null,getTotalLength:()=>314.2})});
  return elements.get(id);
 };
 const set=[],tweens=[];
 globalThis.document={getElementById:fake};
 try{
  const scene=structuredClone(fixture.scenes[0]);
  setupDirected({fromTo:(...args)=>tweens.push(args)},scene,0,5,4,{set:(...args)=>set.push(args)});
  const drawn=tweens.filter(x=>x[1]?.attr?.['stroke-dashoffset']!==undefined);
  assert.equal(drawn.length,1);
  assert.equal(drawn[0][1].attr['stroke-dasharray'],314.2);
  assert.equal(drawn[0][1].attr['stroke-dashoffset'],314.2);
  assert.equal(drawn[0][2].attr['stroke-dashoffset'],0);
  assert.ok(tweens.some(x=>x[3]===5+4*.36));
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});

test('directed scenes are visible immediately instead of inheriting generic entry fade',()=>{
 const html=buildHTML(fixture,times,{draft:true});
 assert.match(html,/if\(s\.template==='directed_scene'\)tl\.set\(base\+' \.visual',\{opacity:1,y:0\},start\)/);
 assert.match(html,/else tl\.fromTo\(base\+' \.visual'/);
 const invalid=structuredClone(fixture);
 invalid.scenes[0].props.background='not-a-color';
 const unvalidated=buildHTML(invalid,times,{draft:true});
 assert.match(unvalidated,/style="background:#111318"/);
});
