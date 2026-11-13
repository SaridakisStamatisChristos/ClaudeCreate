import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { checkScript } from '../src/spec.mjs';
import { buildHTML } from '../src/composition.mjs';

const example=JSON.parse(await readFile(new URL('../examples/dummy.json',import.meta.url),'utf8'));
test('valid sample with target-aware size warnings',()=>{
  const r=checkScript(example);
  assert.equal(r.ok,true);
  assert.match(r.warnings.join(' '),/target 30s suggests 9–21/);
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

function lengthScript(sceneCount, wordsPerScene) {
  const script = structuredClone(example);
  script.scenes = Array.from({length:sceneCount}, (_, i) => ({
    template: 'caption_screen', say: Array(wordsPerScene).fill('spoken').join(' '),
    highlight: 'spoken', illustrative: false, sfx: 'none',
    props: {big_text: `Scene ${i+1}`}
  }));
  return script;
}
test('15-second target: 8 scenes and 32 words pass timing warnings',()=>{
  const r=checkScript(lengthScript(8,4), undefined, {targetSeconds:15});
  assert.equal(r.ok,true);
  assert.deepEqual(r.warnings,[]);
  assert.equal(r.estimatedSeconds,13.33);
  assert.equal(r.targetSeconds,15);
});
test('30-second target: 15 scenes and 75 words pass timing warnings',()=>{
  const r=checkScript(lengthScript(15,5));
  assert.equal(r.ok,true);
  assert.deepEqual(r.warnings,[]);
  assert.equal(r.estimatedSeconds,31.25);
  assert.equal(r.targetSeconds,30);
});
test('60-second target: 30 scenes and 150 words pass timing warnings',()=>{
  const r=checkScript(lengthScript(30,5), undefined, {targetSeconds:60});
  assert.equal(r.ok,true);
  assert.deepEqual(r.warnings,[]);
  assert.equal(r.estimatedSeconds,62.5);
});
test('scenes and estimated length independently warn outside target bands',()=>{
  const r=checkScript(lengthScript(8,4), undefined, {targetSeconds:60});
  assert.equal(r.ok,true);
  assert.equal(r.warnings.length,2);
  assert.match(r.warnings.join(' '), /18–42/);
  assert.match(r.warnings.join(' '), /48.0–72.0s/);
});
test('duration warnings respect the 20 percent band',()=>{
  const low=checkScript(lengthScript(12,4), undefined, {targetSeconds:30}); // 48 words = 20s, outside band
  assert.ok(low.warnings.some(w=>w.startsWith('estimated length')));
  const inside=checkScript(lengthScript(12,5), undefined, {targetSeconds:30}); // 60 words = 25s, inside
  assert.ok(!inside.warnings.some(w=>w.startsWith('estimated length')));
  const upper=checkScript(lengthScript(15,6), undefined, {targetSeconds:30}); // 90 words = 37.5s, outside
  assert.ok(upper.warnings.some(w=>w.startsWith('estimated length')));
});
test('original hard errors and longer scene warnings remain unchanged',()=>{
  const r=checkScript(lengthScript(15,11));
  assert.equal(r.ok,true);
  assert.match(r.warnings.join(' '), /recommended maximum 10/);
  const invalid=checkScript(lengthScript(15,17));
  assert.equal(invalid.ok,false);
  assert.match(invalid.errors.join(' '), /maximum 16/);
});
test('CLI target flag accepts spaced or equals syntax, rejects unsupported targets',()=>{
  const base=['bin/reel.mjs','check','examples/dummy.json'];
  for(const variant of [['--target','15'],['--target=60']]) {
    const run=spawnSync(process.execPath,[...base,...variant],{cwd:new URL('..',import.meta.url).pathname,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    assert.match(run.stdout, new RegExp(`TARGET: ${variant.at(-1).replace('--target=','')}s`));
  }
  const bad=spawnSync(process.execPath,[...base,'--target','45'],{cwd:new URL('..',import.meta.url).pathname,encoding:'utf8'});
  assert.equal(bad.status,1);
  assert.match(bad.stderr,/ERROR: --target must be 15, 30, or 60 seconds/);
  assert.doesNotMatch(bad.stderr,/at file:|SyntaxError:/);
});
