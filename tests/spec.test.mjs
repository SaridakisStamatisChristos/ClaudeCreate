import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkScript } from '../src/spec.mjs';
import { buildHTML } from '../src/composition.mjs';

const example=JSON.parse(await readFile(new URL('../examples/dummy.json',import.meta.url),'utf8'));
test('valid sample with size warnings',()=>{
  const r=checkScript(example);
  assert.equal(r.ok,true);
  assert.match(r.warnings.join(' '),/target is 20–40/);
});
test('reject unknown template/effect and highlight mismatch',()=>{
  const s=structuredClone(example);
  s.scenes[0].template='magic';s.scenes[0].sfx='blast';s.scenes[0].highlight='absent';
  const r=checkScript(s);assert.equal(r.ok,false);
  assert.match(r.errors.join(' '),/unknown template/);
  assert.match(r.errors.join(' '),/unknown effect/);
  assert.match(r.errors.join(' '),/phrase not found/);
});
test('reject 17 words and bad accent',()=>{
  const s=structuredClone(example);
  s.accent='yellow';s.scenes[0].say=Array(17).fill('word').join(' ');
  const r=checkScript(s);assert.equal(r.ok,false);
  assert.match(r.errors.join(' '),/maximum 16/);
  assert.match(r.errors.join(' '),/#RRGGBB/);
});
test('all six templates generate offline composition',async()=>{
  const s=JSON.parse(await readFile(new URL('../examples/templates.json',import.meta.url),'utf8'));
  const r=checkScript(s);assert.equal(r.ok,true,r.errors.join(';'));
  const times=s.scenes.map((scene,i)=>({start:i*2.5,duration:2.5,audioDuration:2.2,words:[]}));
  const html=buildHTML(s,times,{draft:true});
  assert.match(html,/data-width="540"/);
  assert.match(html,/window.__timelines.main=tl/);
  for(const name of ['caption_screen','counter','app_screen','callout','object_3d','compare'])assert.ok(html.includes(`data-type="${name}"`));
  assert.match(html,/three\.module\.js/);
});
test('escape user HTML and script injection',()=>{
  const s=structuredClone(example);s.scenes[0].props.big_text='<img src=x onerror=alert(1)>';
  const html=buildHTML(s,[{start:0,duration:2,audioDuration:1.8,words:[]},{start:2,duration:2,audioDuration:1.8,words:[]},{start:4,duration:2,audioDuration:1.8,words:[]}]);
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img src=x'));
});
