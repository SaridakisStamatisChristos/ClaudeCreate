import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkScript, TEMPLATES, EDITORIAL_TEMPLATES } from '../src/spec.mjs';
import { buildHTML } from '../src/composition.mjs';
import { stageMediaForComposition } from '../src/editorial/assets.mjs';

const script=JSON.parse(await readFile(new URL('../examples/editorial_stage_a.json',import.meta.url),'utf8'));
const timeline=script.scenes.map((_,i)=>({start:i*2.6,duration:2.6,audioDuration:2.45,words:[]}));
test('v2 requires explicit version and mode; Stage A templates validate',()=>{
  const r=checkScript(script,undefined,{targetSeconds:15});
  assert.equal(r.ok,true,r.errors.join('; '));
  assert.deepEqual(EDITORIAL_TEMPLATES.slice(0,2),['editorial_split','editorial_text_card']);
  const legacy=structuredClone(script);delete legacy.schema_version;delete legacy.mode;
  assert.equal(checkScript(legacy).ok,false);
  assert.match(checkScript(legacy).errors.join(' '),/unknown template/);
  const bad=structuredClone(script);bad.mode='unknown';
  assert.equal(checkScript(bad).ok,false);
  assert.match(checkScript(bad).errors.join(' '),/mode: expected/);
});
test('the six legacy templates work in v1 and explicit v2',async()=>{
  const v1=JSON.parse(await readFile(new URL('../examples/templates.json',import.meta.url),'utf8'));
  assert.equal(checkScript(v1).ok,true);
  assert.equal(checkScript({schema_version:2,mode:'editorial_illustrated',...v1}).ok,true);
  assert.equal(TEMPLATES.length,6);
  assert.equal(checkScript({...v1,schema_version:1}).ok,false);
});
test('editorial props strictness, exact emphasis and original word limit',()=>{
  const s=structuredClone(script);
  s.scenes[0].props.typo=true;
  s.scenes[0].props.emphasis='absent phrase';
  s.scenes[1].say=Array(17).fill('wrong').join(' ');
  const errors=checkScript(s).errors.join(' ');
  assert.match(errors,/unknown property 'typo'/);
  assert.match(errors,/emphasis: must be an exact substring/);
  assert.match(errors,/maximum 16/);
});
test('stage valid local media to sanitized digest filenames',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'claudecreate-stage-'));
  try{
    const prepared=await stageMediaForComposition(script,folder);
    const ref=prepared.scenes[0].props.media.src;
    assert.match(ref,/^\.\/media\/[0-9a-f]{20}\.png$/);
    assert.notEqual(ref,script.scenes[0].props.media.src);
    assert.equal(script.scenes[0].props.media.src,'assets/editorial/demo-landscape.png');
    const file=await readFile(join(folder,ref));
    assert.deepEqual([...file.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  }finally{await rm(folder,{force:true,recursive:true});}
});
test('reject remote, absolute, traversal, wrong extension, missing, symlink escape',async()=>{
  const base=await mkdtemp(join(tmpdir(),'claudecreate-root-'));
  const outside=await mkdtemp(join(tmpdir(),'claudecreate-outside-'));
  try{
    await mkdir(join(base,'assets','editorial'),{recursive:true});
    await writeFile(join(base,'assets','editorial','good.png'),'nonempty');
    await writeFile(join(base,'assets','editorial','bad.svg'),'<svg/>');
    await writeFile(join(outside,'secret.png'),'secret');
    await symlink(join(outside,'secret.png'),join(base,'assets','editorial','leak.png'));
    const invalid=[
      'https://example.com/a.png','/tmp/a.png','assets/../secret.png',
      'assets/editorial/bad.svg','assets/editorial/absent.png',
      'assets/editorial/leak.png','file://somewhere/a.png','assets\editorial\bad.png'
    ];
    for(const src of invalid){
      const copy=structuredClone(script);copy.scenes[0].props.media.src=src;
      const r=checkScript(copy,undefined,{assetRoot:join(base,'assets')});
      assert.equal(r.ok,false,src);
      assert.match(r.errors.join(' '),/scenes\[0\]\.props\.media\.src/,src);
    }
    const good=structuredClone(script);good.scenes[0].props.media.src='assets/editorial/good.png';
    assert.equal(checkScript(good,undefined,{assetRoot:join(base,'assets')}).ok,true);
  }finally{await rm(base,{force:true,recursive:true});await rm(outside,{force:true,recursive:true});}
});
test('HTML safely escapes script titles and headlines',()=>{
  const s=structuredClone(script);
  s.title='<script>alert(1)</script>';
  s.scenes[0].props.text='History <img src=x onerror=alert(1)> changes';
  s.scenes[0].props.emphasis='changes';
  const html=buildHTML(s,timeline,{draft:true});
  assert.match(html,/data-width="540"/);
  assert.match(html,/class="clip scene ed-scene"/);
  assert.match(html,/background:#EEE6D9/);
  assert.match(html,/class="ed-artwork"/);
  assert.match(html,/inset:0;display:block;width:1080px;height:1920px/);
  assert.doesNotMatch(html,/ed-player|ed-progress-fill|ed-play-icon/);
  assert.match(html,/ed-headline/);
  assert.match(html,/&lt;img src=x/);
  assert.doesNotMatch(html,/<img src=x onerror=/);
  assert.doesNotMatch(html,/<script>alert/);
});
test('v2 CLI check validates without invoking paid APIs',()=>{
  const run=spawnSync(process.execPath,['bin/reel.mjs','check','examples/editorial_stage_a.json','--target','15'],{cwd:new URL('..',import.meta.url).pathname,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.match(run.stdout,/VALID/);
});
