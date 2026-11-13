#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULTS, loadScript, DEFAULT_TARGET_SECONDS, ALLOWED_TARGET_SECONDS } from '../src/spec.mjs';
import { writeComposition } from '../src/composition.mjs';
import { synthesizeSpeech } from '../src/audio/hyperframes.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const CLI=join(ROOT,'node_modules','.bin','hyperframes');
const PYTHON=existsSync(join(ROOT,'.venv','bin','python'))?join(ROOT,'.venv','bin','python'):'python3';
const CFG=join(ROOT,'config.json');
const flags=new Set(), args=[];
let targetSeconds=DEFAULT_TARGET_SECONDS, argumentError='';
const argv=process.argv.slice(2);
for(let i=0;i<argv.length;i++) {
  const arg=argv[i];
  if(arg==='--target'||arg.startsWith('--target=')) {
    const value=arg==='--target'?argv[++i]:arg.slice('--target='.length);
    if(!ALLOWED_TARGET_SECONDS.map(String).includes(value)) argumentError='--target must be 15, 30, or 60 seconds';
    else targetSeconds=Number(value);
  }else if(arg==='--draft') flags.add('--draft');
  else if(arg.startsWith('--')) argumentError=`unknown flag ${arg}`;
  else args.push(arg);
}
const [command,scriptPath]=args;
const draft=flags.has('--draft');

function fail(message) { console.error(`ERROR: ${message}`); process.exitCode=1; }
async function run(executable,argv,{cwd=ROOT,timeoutMs=20*60*1000}={}) {
  return new Promise((resolve,reject)=>{
    // An isolated POSIX process group lets a timed-out HyperFrames command and
    // its ffmpeg/whisper children be terminated together, not just the CLI shell.
    const isolated=process.platform!=='win32';
    const child=spawn(executable,argv,{cwd,detached:isolated,
      stdio:['ignore','pipe','pipe'],env:{...process.env,HYPERFRAMES_PYTHON:process.env.HYPERFRAMES_PYTHON||PYTHON,HF_DISABLE_TELEMETRY:'1',DO_NOT_TRACK:'1'}});
    let out='',err='',timedOut=false;
    const timer=setTimeout(()=>{
      timedOut=true;
      try {
        if(isolated && child.pid)process.kill(-child.pid,'SIGKILL');
        else child.kill('SIGKILL');
      }catch{child.kill('SIGKILL');}
    },timeoutMs);
    child.stdout.on('data',b=>{out+=b.toString();if(out.length>4_000_000)out=out.slice(-4_000_000);});
    child.stderr.on('data',b=>{err+=b.toString();if(err.length>4_000_000)err=err.slice(-4_000_000);});
    child.on('error',error=>{
      clearTimeout(timer);
      reject(new Error('Cannot start '+basename(executable)+': '+error.message));
    });
    child.on('close',(code,signal)=>{
      clearTimeout(timer);
      if(timedOut)reject(new Error(basename(executable)+' timed out after '+Math.round(timeoutMs/1000)+' seconds'));
      else if(code===0)resolve({out,err});
      else reject(new Error(`${basename(executable)} exited ${code??signal}: ${(err||out).trim().split('\n').slice(-8).join(' | ')}`));
    });
  });
}
async function config() {
  let c={};try{c=JSON.parse(await readFile(CFG,'utf8'));}catch{}
  return {...DEFAULTS,...c};
}
function slug(text) { return text.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'reel'; }
async function voice(text,selected) {
  return synthesizeSpeech(text,selected,{root:ROOT,cli:CLI,exec:run});
}
async function assetsReady() {
  if(!existsSync(CLI)) throw new Error('HyperFrames is not installed. Run npm install.');
  if(!existsSync(join(ROOT,'assets','sfx','whoosh_1.wav'))) await run(PYTHON,[join(ROOT,'tools','synth_sfx.py'),join(ROOT,'assets','sfx')]);
}
async function load(path) {
  if(!path)throw new Error('Specify script.json');
  const {script,result}=await loadScript(resolve(path),await config(),{targetSeconds});
  for(const warning of result.warnings) console.log(`WARN: ${warning}`);
  if(!result.ok) throw new Error(result.errors.join('\nERROR: '));
  return script;
}
async function prepare(script,{short=false}={}) {
  await assetsReady();
  const name=slug(script.title),folder=join(ROOT,'.reel-work',name+(draft?'-draft':''));
  await mkdir(folder,{recursive:true});
  const c=await config(),selected=script.voice||c.voice;
  const timing=[];let frame=0;
  for(let i=0;i<script.scenes.length;i++) {
    const s=script.scenes[i];const v=await voice(s.say,selected);
    const frames=Math.ceil((v.duration+c.gap)*30);
    timing.push({start:frame/30,duration:frames/30,audioDuration:v.duration,words:v.words,wav:v.wav});
    frame+=frames;
    if((short||draft) && frame/30>=10)break;
  }
  // A draft must not synthesize narration for the unrendered remainder of a 60s script.
  // The generated composition must contain exactly the timed scenes, or its
  // scene serialization will access missing timing entries.
  const timedScript={...script,scenes:script.scenes.slice(0,timing.length)};
  await writeComposition(folder,timedScript,timing,{draft,baseDir:ROOT});
  return {folder,timing,total:frame/30,name};
}
function effectPath(kind,index){return join(ROOT,'assets','sfx',`${kind}_${(index%3)+1}.wav`);}
async function mixAudio(script,timing,destination,duration) {
  const inputs=[], filters=[], sources=[];
  for(let i=0;i<timing.length;i++){
    const t=timing[i], start=Math.round(t.start*1000);
    inputs.push('-i',t.wav);
    filters.push(`[${sources.length}:a]adelay=${start}:all=1,volume=1[v${i}]`);
    sources.push(`v${i}`);
  }
  const voiceCount=sources.length;
  for(let i=0;i<timing.length;i++){
    const kind=script.scenes[i].sfx;
    if(kind==='none')continue;
    inputs.push('-i',effectPath(kind,i));
    const delay=Math.round((timing[i].start+.09)*1000);
    filters.push(`[${voiceCount+sources.length-voiceCount}:a]adelay=${delay}:all=1,volume=0.24[e${i}]`);
    sources.push(`e${i}`);
  }
  // Replace numeric source indices with actual positions, one based on each -i insertion order.
  const voiced=timing.length;let effectInput=voiced;
  for(let i=0;i<timing.length;i++) {
    if(script.scenes[i].sfx==='none')continue;
    const index=filters.findIndex(x=>x.includes(`[e${i}]`));
    filters[index]=filters[index].replace(/^\[\d+:a\]/,`[${effectInput++}:a]`);
  }
  const musicDir=join(ROOT,'assets','music');
  const music=(await readdir(musicDir).catch(()=>[])).filter(x=>/\.(mp3|wav|flac|m4a|ogg)$/i.test(x)).sort()[0];
  if(music){
    inputs.push('-stream_loop','-1','-i',join(musicDir,music));
    filters.push(`[${effectInput}:a]atrim=duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS,volume=0.13[music]`);
    sources.push('music');
  }
  filters.push(`${sources.map(x=>`[${x}]`).join('')}amix=inputs=${sources.length}:duration=longest:normalize=0,atrim=duration=${duration.toFixed(3)},apad=whole_dur=${duration.toFixed(3)},aresample=48000[a]`);
  await run('ffmpeg',['-y','-hide_banner','-loglevel','error',...inputs,'-filter_complex',filters.join(';'),'-map','[a]','-ac','2','-ar','48000','-c:a','pcm_s16le',destination]);
  return music;
}
function stats(log){const match=log.match(/\{\s*"input_i"\s*:[\s\S]*?\}/g)?.at(-1);if(!match)throw new Error('FFmpeg loudnorm did not report stats');return JSON.parse(match);}
async function normalize(wav,output){
  const settings='I=-14:TP=-1.5:LRA=11';
  const pass=await run('ffmpeg',['-hide_banner','-i',wav,'-af',`loudnorm=${settings}:print_format=json`,'-f','null','-']);
  const m=stats(pass.err);
  const filter=`loudnorm=${settings}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`;
  await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',wav,'-af',filter,'-c:a','aac','-b:a','192k',output]);
  const measured=await run('ffmpeg',['-hide_banner','-i',output,'-af',`loudnorm=${settings}:print_format=json`,'-f','null','-']);
  return stats(measured.err).input_i;
}
async function frame(video,time,target){await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-ss',time.toFixed(3),'-i',video,'-frames:v','1',target]);}
async function render(path){
  const script=await load(path),work=await prepare(script);
  const maximum=draft?Math.min(10,work.total):work.total;
  const output=join(ROOT,'out',work.name+(draft?'-draft':''));await mkdir(output,{recursive:true});
  const raw=join(work.folder,'silent.mp4'),audio=join(work.folder,'audio.wav'),loud=join(work.folder,'loud.m4a');
  await run(CLI,['render','--output',raw,'--fps','30','--quality',draft?'draft':'delivery',...(draft?['--end',maximum.toFixed(3)]:[])],{cwd:work.folder});
  const music=await mixAudio(script,work.timing,audio,maximum), lufs=await normalize(audio,loud);
  const instagram=join(output,'instagram.mp4');
  await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',raw,'-i',loud,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy','-t',maximum.toFixed(3),'-movflags','+faststart',instagram]);
  const youtube=join(output,'youtube.mp4');
  const ww=draft?960:1920,hh=draft?540:1080;
  const layout=`[0:v]split=2[x][y];[x]scale=${ww}:${hh}:force_original_aspect_ratio=increase,crop=${ww}:${hh},boxblur=25:8,eq=brightness=-0.22[bg];[y]scale=-2:${hh}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]`;
  await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',instagram,'-filter_complex',layout,'-map','[v]','-map','0:a:0','-c:v','libx264','-preset','veryfast','-crf','19','-c:a','copy','-movflags','+faststart',youtube]);
  await frame(instagram,maximum*.25,join(output,'thumb_a.png'));
  await frame(instagram,maximum*.74,join(output,'thumb_b.png'));
  await writeFile(join(output,'caption.txt'),script.caption.trim()+'\n\n'+script.hashtags.join(' ')+'\n');
  await writeFile(join(output,'CREDITS.txt'),`Original synthesized effects: CC0-1.0, see assets/sfx/CREDITS.txt.\nMusic: ${music ? 'User-supplied '+music+' — verify rights before publishing':'none'}\nVoice: locally generated with HyperFrames/Kokoro, word timing by local transcription.\n`);
  console.log(`DONE: ${output}\nInstagram: ${draft?'540x960':'1080x1920'} / YouTube: ${ww}x${hh} / ${maximum.toFixed(2)}s\nMeasured integrated loudness: ${lufs} LUFS`);
}
async function preview(path){
  const script=await load(path),work=await prepare(script);
  const count=Math.min(8,Math.max(6,script.scenes.length));
  const at=Array.from({length:count},(_,i)=>Math.max(0,Math.min(work.total-.04,(i+.5)*work.total/count))).map(x=>x.toFixed(2)).join(',');
  const target=join(ROOT,'out',work.name+(draft?'-draft':''),'preview');await mkdir(target,{recursive:true});
  await run(CLI,['snapshot','--at',at,'--no-end','--output',target],{cwd:work.folder});
  console.log(`DONE: ${target} (${count} still frames; no video rendered)`);
}
async function sample(){
  const voices=['af_heart','af_bella','bf_emma','am_michael','am_adam','bm_george'];
  const target=join(ROOT,'out','voice-samples');await mkdir(target,{recursive:true});
  const prompt='Every new idea begins with a simple question. What changes when we test it? Let us discover the answer together.';
  for(const id of voices){const sample=await voice(prompt,id);await copyFile(sample.wav,join(target,id+'.wav'));}
  console.log(`Samples: ${target}\nSelect a voice: node bin/reel.mjs voice-select af_heart`);
}
async function main(){
  if(argumentError) throw new Error(argumentError);
  if(command==='check'){
    const c=await config();if(!scriptPath)throw new Error('Specify script.json');
    const {result}=await loadScript(resolve(scriptPath),c,{targetSeconds});
    console.log(`TARGET: ${targetSeconds}s | estimate ${result.estimatedSeconds}s | ${result.warnings.length} warnings`);
    result.errors.forEach(x=>console.error('ERROR: '+x));result.warnings.forEach(x=>console.log('WARN: '+x));
    if(!result.ok)process.exitCode=1;
    else console.log(`VALID: ${result.estimatedSeconds}s estimated for ${targetSeconds}s target; ${result.warnings.length} warnings`);
  }else if(command==='voice-sample')await sample();
  else if(command==='voice-select'){
    if(!/^[a-z]{2}_[a-z0-9_]+$/.test(scriptPath||''))throw new Error('Specify a valid Kokoro voice id');
    const c=await config();c.voice=scriptPath;await writeFile(CFG,JSON.stringify(c,null,2)+'\n');console.log('Default voice: '+scriptPath);
  }else if(command==='preview')await preview(scriptPath);
  else if(command==='render')await render(scriptPath);
  else if(command==='doctor') {
    await run('ffmpeg',['-version']);if(!existsSync(CLI))throw new Error('Run npm install first');
    const r=await run(CLI,['doctor']);console.log(r.out.trim().split('\n').slice(-15).join('\n'));
  }else console.log('Usage: reel voice-sample | voice-select VOICE | check script.json [--target 15|30|60] | preview script.json [--draft] | render script.json [--draft] | doctor');
}
main().catch(e=>fail(e.message));
