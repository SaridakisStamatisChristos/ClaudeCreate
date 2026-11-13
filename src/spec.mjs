import { readFile } from 'node:fs/promises';

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
export function checkScript(script, config = DEFAULTS) {
  const errors = [], warnings = [];
  if (!isRecord(script)) return { ok: false, errors: ['script: expected JSON object'], warnings, estimatedSeconds: 0 };
  exactKeys(script, ['title', 'handle', 'voice', 'accent', 'caption', 'hashtags', 'scenes'], 'script', errors);
  if (!isNonempty(script.title)) errors.push('title: expected nonempty string');
  if (typeof script.handle !== 'string' || !/^@[A-Za-z0-9._]{1,30}$/.test(script.handle)) errors.push('handle: expected @handle');
  if (script.voice !== undefined && (!isNonempty(script.voice) || !/^[a-z]{2}_[a-z0-9_]+$/.test(script.voice))) errors.push('voice: expected Kokoro voice id such as af_heart');
  if (typeof script.accent !== 'string' || !/^#[\da-fA-F]{6}$/.test(script.accent)) errors.push('accent: expected #RRGGBB');
  if (typeof script.caption !== 'string') errors.push('caption: expected string');
  if (!Array.isArray(script.hashtags) || !script.hashtags.every(tag => typeof tag === 'string' && /^#[\p{L}\p{N}_]+$/u.test(tag))) errors.push('hashtags: expected array of #tags');
  if (!Array.isArray(script.scenes) || script.scenes.length === 0) errors.push('scenes: expected at least one scene');
  if (Array.isArray(script.scenes)) {
    if (script.scenes.length < 20 || script.scenes.length > 40) warnings.push(`scenes: ${script.scenes.length} scenes; target is 20–40`);
    script.scenes.forEach((s, i) => {
      const p = `scenes[${i}]`;
      if (!isRecord(s)) { errors.push(`${p}: expected object`); return; }
      exactKeys(s, ['template', 'say', 'highlight', 'illustrative', 'sfx', 'props'], p, errors);
      if (!TEMPLATES.includes(s.template)) errors.push(`${p}.template: unknown template '${s.template}'`);
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
    });
  }
  const wpm = numeric(config.wordsPerMinute) && config.wordsPerMinute > 0 ? config.wordsPerMinute : DEFAULTS.wordsPerMinute;
  const gap = numeric(config.gap) && config.gap >= 0 ? config.gap : DEFAULTS.gap;
  const seconds = Array.isArray(script.scenes) ? script.scenes.reduce((n, s) => n + (isNonempty(s?.say) ? wordCount(s.say) * 60 / wpm : 0) + gap, 0) : 0;
  if (seconds < 45 || seconds > 75) warnings.push(`estimated length: ${seconds.toFixed(1)}s; target is 45–75s`);
  return { ok: errors.length === 0, errors, warnings, estimatedSeconds: +seconds.toFixed(2) };
}
export async function loadScript(path, config = DEFAULTS) {
  let script;
  try { script = JSON.parse(await readFile(path, 'utf8')); }
  catch (e) { throw new Error(`Cannot read script JSON: ${e.message}`); }
  const result = checkScript(script, config);
  return { script, result };
}
