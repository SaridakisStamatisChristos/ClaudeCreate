import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkScript, EDITORIAL_TEMPLATES } from '../src/spec.mjs';
import { buildHTML } from '../src/composition.mjs';

const example=JSON.parse(await readFile(new URL('../examples/editorial_stage_c.json',import.meta.url),'utf8'));
const timing=example.scenes.map((s,i)=>({start:i*2.2,duration:2.2,audioDuration:2,words:s.say.split(/\s+/).map((word,j)=>({word,start:j*.24,end:(j+1)*.24}))}));
test('all ten templates exist; four editorial scenes validate with explicit v2',()=>{
  assert.equal(EDITORIAL_TEMPLATES.length,4);
  assert.equal(checkScript(example,undefined,{targetSeconds:15}).ok,true,checkScript(example).errors.join('; '));
});
test('video_card rejects unsupported MP4 and malformed props',()=>{
  const bad=structuredClone(example);
  bad.scenes[0].props.media={kind:'video',src:'assets/editorial/not-a-clip.mp4'};
  bad.scenes[0].props.player_chrome='yes';
  bad.scenes[0].props.unexpected='oops';
  const errors=checkScript(bad).errors.join(' ');
  assert.match(errors,/video_card|scenes\[0\]/);
  assert.match(errors,/kind: expected image/);
  assert.match(errors,/player_chrome: expected boolean/);
  assert.match(errors,/unknown property 'unexpected'/);
});
test('image-backed video_card renders no network URL and timeline-based progress',()=>{
  const html=buildHTML(example,timing,{draft:true});
  assert.match(html,/data-type="video_card"/);
  assert.match(html,/class="ed-video-label"/);
  assert.match(html,/class="ed-progress-fill"/);
  assert.match(html,/width:'100%',duration:dur,ease:'none'/);
  assert.match(html,/data-width="540"/);
  assert.doesNotMatch(html,/https?:\/\/(fonts\.googleapis|cdnjs|cdn\.)/);
});
test('video_card label text safely escapes HTML and disables player chrome',()=>{
  const s=structuredClone(example);
  s.scenes[0].props.label='<img src=x onerror=alert(1)>';
  s.scenes[0].props.player_chrome=false;
  const html=buildHTML(s,timing,{draft:true});
  assert.match(html,/&lt;img src=x/);
  assert.doesNotMatch(html,/<img src=x onerror=/);
  const section=html.slice(html.indexOf('id="scene-0"'),html.indexOf('id="scene-1"'));
  assert.doesNotMatch(section,/ed-player-chrome/);
});
