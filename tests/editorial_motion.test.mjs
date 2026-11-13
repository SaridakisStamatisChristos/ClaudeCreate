import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkScript } from '../src/spec.mjs';
import { buildHTML } from '../src/composition.mjs';
import { stageMediaForComposition } from '../src/editorial/assets.mjs';

const demo=JSON.parse(await readFile(new URL('../examples/editorial_stage_b.json',import.meta.url),'utf8'));
const timing=demo.scenes.map((s,i)=>({start:i*2.8,duration:2.8,audioDuration:2.5,words:s.say.split(/\s+/).map((word,j)=>({word,start:j*.3,end:(j+1)*.3}))}));
test('illustration_motion validates genuine image layers with depth',()=>{
  const r=checkScript(demo,undefined,{targetSeconds:15});
  assert.equal(r.ok,true,r.errors.join('; '));
});
test('layer depth, count, traversal, and unsupported video are rejected',()=>{
  const bad=structuredClone(demo);
  bad.scenes[0].props.media.layers[1].depth=1.5;
  assert.match(checkScript(bad).errors.join(' '),/depth/);
  bad.scenes[0].props.media.layers=[bad.scenes[0].props.media.layers[0]];
  assert.match(checkScript(bad).errors.join(' '),/2–5/);
  bad.scenes[0].props.media.layers[0].src='assets/../secrets.png';
  bad.scenes[0].props.media.layers.push({src:'assets/editorial/demo-trees.png',depth:0.3});
  assert.match(checkScript(bad).errors.join(' '),/path traversal/);
  const video=structuredClone(demo);video.scenes[0].props.media={kind:'video',src:'assets/editorial/clip.mp4'};
  assert.equal(checkScript(video).ok,false);
  const invalid=structuredClone(demo);invalid.scenes[1].props.media.motion='parallax';
  assert.match(checkScript(invalid).errors.join(' '),/parallax requires layers/);
});
test('stages each layer with sanitized names while leaving original script intact',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'claudecreate-layers-'));
  try{
    const staged=await stageMediaForComposition(demo,folder);
    const layers=staged.scenes[0].props.media.layers;
    assert.equal(layers.length,2);
    assert.ok(layers.every(l=>/^\.\/media\/[0-9a-f]{20}\.png$/.test(l.src)));
    assert.notEqual(layers[0].src,layers[1].src);
    const image=await readFile(join(folder,layers[1].src));
    assert.deepEqual([...image.subarray(0,8)],[137,80,78,71,13,10,26,10]);
    assert.equal(demo.scenes[0].props.media.layers[1].src,'assets/editorial/demo-trees.png');
  }finally{await rm(folder,{recursive:true,force:true});}
});
test('motion markup supports time-driven camera movement and escapes labels',()=>{
  const script=structuredClone(demo);
  script.scenes[0].props.label='<script>danger</script>';
  const html=buildHTML(script,timing,{draft:true});
  assert.match(html,/class="ed-artwork"/);
  assert.doesNotMatch(html,/ed-motion-frame|ed-player-chrome/);
  assert.match(html,/data-depth="-0.4"/);
  assert.match(html,/ed-anim-asset/);
  assert.match(html,/motion==='parallax'/);
  assert.match(html,/ease:'none',immediateRender:false/);
  assert.match(html,/&lt;script&gt;danger&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<script>danger<\/script>/);
});
