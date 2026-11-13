import { readFile } from 'node:fs/promises';
import { DEFAULT_ASSET_ROOT, validateMediaDescriptor } from './editorial/assets.mjs';

export const TEMPLATES = Object.freeze(['caption_screen', 'counter', 'app_screen', 'callout', 'object_3d', 'compare']);
export const SFX = Object.freeze(['whoosh', 'pop', 'tick', 'stamp', 'ding', 'swipe', 'none']);
export const DEFAULTS = Object.freeze({ voice: 'af_heart', gap: 0.12, wordsPerMinute: 145, accent: '#F8C95A', background: '#111318', foreground: '#F6F6F3' });
const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const wordCount = s => (s.trim().match(/\S+/g) || []).length;
const isNonempty = x => typeof x === 'string' && x.trim().length > 0;
const numeric = x => typeof x === 'number' && Number.isFinite(x);
const exactKeys = (obj, keys, path, errors) => {
  for (const key of Object.keys(obj)) if (!keys.includes(key)) errors.push(`${path}: unknown property '${key}'`);
};
const optionalText = (v, path, errors) => {
  if (v !== undefined && typeof v !== 'string') errors.push(`${path}: expected string`);
};
function validateProps(scene, i, errors) {
  const p = `scenes[${i}].props`;
  const v = scene.props;
  if (!isRecord(v)) { errors.push(`${p}: expected object`); return; }
  switch (scene.template) {
    case 'caption_screen':
      exactKeys(v, ['big_text'], p, errors); optionalText(v.big_text, `${p}.big_text`, errors); break;
    case 'counter':
      exactKeys(v, ['from', 'to', 'prefix', 'suffix', 'label'], p, errors);
      if (!numeric(v.from) || !numeric(v.to)) errors.push(`${p}: 'from' and 'to' must be finite numbers`);
      for (const name of ['prefix', 'suffix', 'label']) optionalText(v[name], `${p}.${name}`, errors);
      break;
    case 'app_screen':
      exactKeys(v, ['app_name', 'rows', 'highlight_row'], p, errors);
      if (!isNonempty(v.app_name)) errors.push(`${p}.app_name: expected nonempty string`);
      if (!Array.isArray(v.rows) || v.rows.length < 1 || v.rows.length > 8) errors.push(`${p}.rows: expected 1–8 rows`);
      else v.rows.forEach((row, j) => {
        if (!isRecord(row) || !isNonempty(row.label) || typeof row.value !== 'string') errors.push(`${p}.rows[${j}]: expected label and value strings`);
        else exactKeys(row, ['label', 'value'], `${p}.rows[${j}]`, errors);
      });
      if (v.highlight_row !== undefined && (!Number.isInteger(v.highlight_row) || v.highlight_row < 0 || v.highlight_row >= (v.rows?.length ?? 0))) errors.push(`${p}.highlight_row: invalid row index`);
      break;
    case 'callout':
      exactKeys(v, ['text', 'style'], p, errors);
      if (!isNonempty(v.text)) errors.push(`${p}.text: expected nonempty string`);
      if (!['stamp', 'arrow', 'circle'].includes(v.style)) errors.push(`${p}.style: expected stamp, arrow, or circle`);
      break;
    case 'object_3d':
      exactKeys(v, ['shape', 'label'], p, errors);
      if (!['cube', 'sphere', 'torus', 'stack'].includes(v.shape)) errors.push(`${p}.shape: expected cube, sphere, torus, or stack`);
      optionalText(v.label, `${p}.label`, errors); break;
    case 'compare':
      exactKeys(v, ['left', 'right'], p, errors);
      for (const side of ['left', 'right']) {
        if (!isRecord(v[side]) || !isNonempty(v[side].label) || typeof v[side].value !== 'string') errors.push(`${p}.${side}: expected label and value strings`);
        else exactKeys(v[side], ['label', 'value'], `${p}.${side}`, errors);
      }
      break;
  }
}

export const EDITORIAL_TEMPLATES = Object.freeze(['editorial_split','editorial_text_card','illustration_motion','video_card']);
function validateEditorialProps(scene,i,errors,assetRoot) {
  const p='scenes['+i+'].props',v=scene.props;
  if(!isRecord(v)){errors.push(p+': expected object');return;}
  if(scene.template==='video_card'){
    exactKeys(v,['media','label','player_chrome'],p,errors);
    if(v.label!==undefined&&(typeof v.label!=='string'||wordCount(v.label)>5))errors.push(p+'.label: expected at most 5 words');
    if(v.player_chrome!==undefined&&typeof v.player_chrome!=='boolean')errors.push(p+'.player_chrome: expected boolean');
    validateMediaDescriptor(v.media,p+'.media',errors,{assetRoot,allowLayers:false,allowVideo:false});
    return;
  }
  if(scene.template==='illustration_motion'){
    exactKeys(v,['media','label'],p,errors);
    if(v.label!==undefined&&(typeof v.label!=='string'||wordCount(v.label)>5))errors.push(p+'.label: expected at most 5 words');
    validateMediaDescriptor(v.media,p+'.media',errors,{assetRoot,allowLayers:true,allowVideo:false});
    return;
  }
  const split=scene.template==='editorial_split';
  exactKeys(v,split?['media','kicker','text','emphasis','player_chrome']:['kicker','text','emphasis'],p,errors);
  if(!isNonempty(v.text)||wordCount(v.text)>14)errors.push(p+'.text: expected 1–14 words');
  if(v.kicker!==undefined && (typeof v.kicker!=='string'||wordCount(v.kicker)>4))
    errors.push(p+'.kicker: expected at most 4 words');
  if(v.emphasis!==undefined && (typeof v.emphasis!=='string'||(v.emphasis && (!isNonempty(v.text)||!v.text.includes(v.emphasis)))))
    errors.push(p+'.emphasis: must be an exact substring of text');
  if(split){
    if(v.player_chrome!==undefined && typeof v.player_chrome!=='boolean')errors.push(p+'.player_chrome: expected boolean');
    validateMediaDescriptor(v.media,p+'.media',errors,{assetRoot,allowLayers:true,allowVideo:false});
  }
}

export const DEFAULT_TARGET_SECONDS = 30;
export const ALLOWED_TARGET_SECONDS = Object.freeze([15, 30, 60]);
export const ESTIMATED_WORDS_PER_SECOND = 2.4;

// Length warnings use spoken words / 2.4. Actual rendered duration is measured
// from synthesized audio; this estimate intentionally excludes the scene gaps.
export function checkScript(script, config = DEFAULTS, { targetSeconds = DEFAULT_TARGET_SECONDS, assetRoot = DEFAULT_ASSET_ROOT } = {}) {
  const errors = [], warnings = [];
  if (!ALLOWED_TARGET_SECONDS.includes(targetSeconds)) throw new Error(`target must be 15, 30, or 60 seconds`);
  if (!isRecord(script)) return { ok: false, errors: ['script: expected JSON object'], warnings, estimatedSeconds: 0, targetSeconds };
  const editorial=script.schema_version===2 && script.mode==='editorial_illustrated';
  const templates=editorial ? [...TEMPLATES,...EDITORIAL_TEMPLATES] : TEMPLATES;
  exactKeys(script,editorial?['schema_version','mode','title','handle','voice','accent','caption','hashtags','scenes']:['title','handle','voice','accent','caption','hashtags','scenes'],'script',errors);
  if(Object.hasOwn(script,'schema_version') && script.schema_version!==2)errors.push('schema_version: expected integer 2');
  if(script.schema_version===2 && script.mode!=='editorial_illustrated')errors.push('mode: expected editorial_illustrated');
  if(Object.hasOwn(script,'mode') && script.schema_version!==2)errors.push('mode: requires schema_version 2');
  if (!isNonempty(script.title)) errors.push('title: expected nonempty string');
  if (typeof script.handle !== 'string' || !/^@[A-Za-z0-9._]{1,30}$/.test(script.handle)) errors.push('handle: expected @handle');
  if (script.voice !== undefined && (!isNonempty(script.voice) || !/^[a-z]{2}_[a-z0-9_]+$/.test(script.voice))) errors.push('voice: expected Kokoro voice id such as af_heart');
  if (typeof script.accent !== 'string' || !/^#[\da-fA-F]{6}$/.test(script.accent)) errors.push('accent: expected #RRGGBB');
  if (typeof script.caption !== 'string') errors.push('caption: expected string');
  if (!Array.isArray(script.hashtags) || !script.hashtags.every(tag => typeof tag === 'string' && /^#[\p{L}\p{N}_]+$/u.test(tag))) errors.push('hashtags: expected array of #tags');
  if (!Array.isArray(script.scenes) || script.scenes.length === 0) errors.push('scenes: expected at least one scene');
  if (Array.isArray(script.scenes)) {
    const expectedScenes = targetSeconds / 2;
    const lowerScenes = Math.ceil(expectedScenes * 0.6);
    const upperScenes = Math.floor(expectedScenes * 1.4);
    if (script.scenes.length < lowerScenes || script.scenes.length > upperScenes)
      warnings.push(`scenes: ${script.scenes.length} scenes; target ${targetSeconds}s suggests ${lowerScenes}–${upperScenes} (±40%)`);
    script.scenes.forEach((s, i) => {
      const p = `scenes[${i}]`;
      if (!isRecord(s)) { errors.push(`${p}: expected object`); return; }
      exactKeys(s, ['template', 'say', 'highlight', 'illustrative', 'sfx', 'props'], p, errors);
      if (!templates.includes(s.template)) errors.push(`${p}.template: unknown template '${s.template}'`);
      if (!SFX.includes(s.sfx)) errors.push(`${p}.sfx: unknown effect '${s.sfx}'`);
      if (!isNonempty(s.say)) errors.push(`${p}.say: expected nonempty voiceover`);
      else {
        const n = wordCount(s.say);
        if (n > 16) errors.push(`${p}.say: ${n} words; maximum 16`);
        else if (n > 10) warnings.push(`${p}.say: ${n} words; recommended maximum 10`);
      }
      if (typeof s.highlight !== 'string') errors.push(`${p}.highlight: expected string`);
      else if (s.highlight.trim() && typeof s.say === 'string' && !s.say.toLocaleLowerCase().includes(s.highlight.toLocaleLowerCase())) errors.push(`${p}.highlight: phrase not found in say`);
      if (typeof s.illustrative !== 'boolean') errors.push(`${p}.illustrative: expected boolean`);
      if (TEMPLATES.includes(s.template)) validateProps(s, i, errors);
      if (editorial && EDITORIAL_TEMPLATES.includes(s.template)) validateEditorialProps(s,i,errors,assetRoot);
    });
  }
  const totalWords = Array.isArray(script.scenes) ? script.scenes.reduce((n, s) => n + (isNonempty(s?.say) ? wordCount(s.say) : 0), 0) : 0;
  const seconds = totalWords / ESTIMATED_WORDS_PER_SECOND;
  const lowerSeconds = targetSeconds * 0.8;
  const upperSeconds = targetSeconds * 1.2;
  if (seconds < lowerSeconds || seconds > upperSeconds)
    warnings.push(`estimated length: ${seconds.toFixed(1)}s; target ${targetSeconds}s allows ${lowerSeconds.toFixed(1)}–${upperSeconds.toFixed(1)}s (±20%, words / 2.4)`);
  return { ok: errors.length === 0, errors, warnings, estimatedSeconds: +seconds.toFixed(2), targetSeconds };
}
export async function loadScript(path, config = DEFAULTS, options = {}) {
  let script;
  try { script = JSON.parse(await readFile(path, 'utf8')); }
  catch (e) { throw new Error(`Cannot read script JSON: ${e.message}`); }
  const result = checkScript(script, config, options);
  return { script, result };
}
