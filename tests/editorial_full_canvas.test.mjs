import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkScript} from '../src/spec.mjs';
import {buildHTML} from '../src/composition.mjs';

const v2=JSON.parse(await readFile(new URL('../examples/editorial_stage_c.json',import.meta.url),'utf8'));
const timeline=v2.scenes.map((s,i)=>({start:i*2.1,duration:2.1,audioDuration:1.95,words:s.say.split(/\s+/).map((word,j)=>({word,start:j*.2,end:(j+1)*.2}))}));
test('illustration fills 1080x1920 canvas and no nested player is emitted',()=>{
 const r=checkScript(v2,undefined,{targetSeconds:15});
 assert.equal(r.ok,true,r.errors.join('; '));
 const html=buildHTML(v2,timeline,{draft:true});
 assert.match(html,/data-width="540" data-height="960"/);
 assert.match(html,/\.ed-artwork\{position:absolute;inset:0/);
 assert.match(html,/\.ed-scene \.visual\.editorial_split,\.ed-scene \.visual\.illustration_motion/);
 assert.match(html,/inset:0;display:block;width:1080px;height:1920px/);
 assert.match(html,/object-fit:cover/);
 assert.doesNotMatch(html,/ed-player|ed-progress-fill|ed-play-icon|ed-player-chrome|ed-motion-frame/);
 const scene=html.slice(html.indexOf('id="scene-0"'),html.indexOf('id="scene-1"'));
 assert.match(scene,/class="ed-artwork"/);
 assert.doesNotMatch(scene,/class="handle"|class="footer"|class="example-tag"/);
});
test('original v1 visual scene wrappers stay unchanged',async()=>{
 const v1=JSON.parse(await readFile(new URL('../examples/dummy.json',import.meta.url),'utf8'));
 const html=buildHTML(v1,v1.scenes.map((s,i)=>({start:i*2,duration:2,audioDuration:1.8,words:[]})),{draft:true});
 assert.match(html,/class="handle"/);
 assert.match(html,/class="footer"/);
 assert.doesNotMatch(html,/class="ed-artwork"/);
});
test('explicitly prevent deprecated fake-player chrome',()=>{
 const invalid=structuredClone(v2);invalid.scenes[0].props.player_chrome=true;
 const r=checkScript(invalid);
 assert.equal(r.ok,false);
 assert.match(r.errors.join(' '),/player_chrome: embedded player controls are no longer supported/);
});
