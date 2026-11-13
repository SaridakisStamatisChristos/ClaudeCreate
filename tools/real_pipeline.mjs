#!/usr/bin/env node
// Opt-in genuine component + end-to-end test. No mock models or generated tones.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {stat,readFile,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {synthesizeSpeech,cacheKey} from '../src/audio/hyperframes.mjs';
import {checkScript} from '../src/spec.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const cli=join(root,'node_modules','.bin','hyperframes');
const fixture=join(root,'examples','verification_short.json');
const reportPath=join(root,'reports','real-verification.json');
const report={kind:'genuine-model-and-video-verification',fixture:'examples/verification_short.json',
  evidenceLevel:0,modelSpeech:false,modelTranscription:false,animatedVideo:false,
  repeatedRender:false,components:[],videos:{},environment:{
    platform:process.platform,node:process.version,ci:!!process.env.CI
  }};
const exec=async(cmd,args,opts={})=>{
  const result=spawnSync(cmd,args,{cwd:opts.cwd||root,encoding:'utf8',timeout:25*60*1000,maxBuffer:4*1024*1024,
    env:{...process.env,...(!process.env.HYPERFRAMES_PYTHON&&existsSync(join(root,'.venv','bin','python'))?{HYPERFRAMES_PYTHON:join(root,'.venv','bin','python')}:{}),HF_DISABLE_TELEMETRY:'1',DO_NOT_TRACK:'1'}});
  if(result.error)throw Error(cmd+': '+result.error.message);
  if(result.status!==0)throw Error(cmd+' '+args[0]+' exited '+result.status+': '+(result.stderr||result.stdout||'').slice(-3500));
  return {out:result.stdout,err:result.stderr};
};
async function probe(file) {
  const r=await exec('ffprobe',['-v','error','-show_entries',
    'format=duration:stream=codec_type,codec_name,width,height,sample_rate,channels',
    '-of','json',file]);
  const data=JSON.parse(r.out);
  return {duration:Number(data.format?.duration),streams:data.streams||[]};
}
function verifyVideo(name,info,width,height) {
  const video=info.streams.find(s=>s.codec_type==='video');
  const audio=info.streams.find(s=>s.codec_type==='audio');
  if(!video||video.width!==width||video.height!==height)
    throw Error(name+': wrong or absent video stream');
  if(!audio)throw Error(name+': no narration audio stream');
  if(!(info.duration>0 && info.duration<=10.25))
    throw Error(name+': invalid short-draft duration '+info.duration);
}
try{
  const script=JSON.parse(await readFile(fixture,'utf8'));
  const validation=checkScript(script);
  if(!validation.ok)throw Error('Verification fixture invalid: '+validation.errors.join('; '));
  await exec(cli,['tts','--list']); // Local CLI and voice catalogue must be loadable.
  report.cliVoices=true;
  for(const scene of script.scenes){
    const voice=script.voice;
    const actual=await synthesizeSpeech(scene.say,voice,{root,cli,exec});
    const media=await probe(actual.wav);
    const sound=media.streams.find(s=>s.codec_type==='audio');
    if(!sound||!sound.sample_rate||Math.abs(media.duration-actual.duration)>.05)
      throw Error('Invalid actual Kokoro WAV duration or sample rate');
    if(actual.words.length!==scene.say.trim().split(/\s+/).length)
      throw Error('Whisper returned incomplete word-level timing');
    if(actual.words.some(w=>w.end>media.duration+.25))
      throw Error('Word timestamp exceeds physical WAV duration');
    report.components.push({
      text:scene.say,voice,duration:actual.duration,sampleRate:actual.sampleRate,
      channels:actual.channels,wordCount:actual.words.length,wavSha256:actual.wavSha256,
      firstWord:actual.words[0],lastWord:actual.words.at(-1),
      cacheKey:cacheKey(scene.say,voice)
    });
  }
  report.modelSpeech=true;
  report.modelTranscription=true;
  report.evidenceLevel=3;
  console.log('PASS Level 3: actual Kokoro WAVs and Whisper word timestamps');
  const folder=join(root,'out','claudecreate-real-pipeline-verification-draft');
  await exec(process.execPath,[join(root,'bin','reel.mjs'),'render',fixture,'--draft']);
  const portrait=await probe(join(folder,'instagram.mp4'));
  const landscape=await probe(join(folder,'youtube.mp4'));
  verifyVideo('instagram',portrait,540,960);
  verifyVideo('youtube',landscape,960,540);
  const total=report.components.reduce((n,c)=>n+Math.ceil((c.duration+.12)*30)/30,0);
  if(Math.abs(portrait.duration-Math.min(10,total))>.30)
    throw Error('Portrait timeline disagrees with measured narration lengths');
  report.videos={portrait,landscape};
  report.animatedVideo=true;
  report.evidenceLevel=4;
  console.log('PASS Level 4: actual HyperFrames -> FFmpeg portrait/landscape video with audio');
  const before=await Promise.all(report.components.map(async c=>{
    const wav=join(root,'.cache','voices',c.cacheKey,'narration.wav');
    return (await stat(wav)).mtimeMs;
  }));
  await exec(process.execPath,[join(root,'bin','reel.mjs'),'render',fixture,'--draft']);
  const after=await Promise.all(report.components.map(async c=>{
    const wav=join(root,'.cache','voices',c.cacheKey,'narration.wav');
    return (await stat(wav)).mtimeMs;
  }));
  if(before.some((mtime,i)=>mtime!==after[i]))
    throw Error('Repeated rendering re-synthesized an unchanged cached voice');
  const second=await probe(join(folder,'instagram.mp4'));
  verifyVideo('second render',second,540,960);
  report.repeatedRender=true;
  console.log('PASS Level 4: repeated render reused verified WAV cache');
}catch(error){
  report.error=String(error?.stack||error);
  console.error('FAIL genuine verification:',error.message);
  process.exitCode=1;
}finally{
  await mkdir(join(root,'reports'),{recursive:true});
  await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log('Evidence: '+reportPath+' (level '+report.evidenceLevel+')');
}
