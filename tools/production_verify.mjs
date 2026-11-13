#!/usr/bin/env node
// Full-resolution real-model verification; no synthetic audio or mock HyperFrames.
import {spawnSync} from 'node:child_process';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkScript} from '../src/spec.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const seconds=Number(process.argv[2]);
if(![15,30,60].includes(seconds))throw Error('Usage: node tools/production_verify.mjs 15|30|60');
const fixture=join(root,'examples',`verification_${seconds}.json`);
const output=join(root,'out',`claudecreate-production-verification-${seconds}-seconds`);
const reportPath=join(root,'reports',`production-${seconds}.json`);
const report={kind:'full-resolution-production-verification',seconds,fixture,
  checkedAt:new Date().toISOString(),success:false,evidenceLevel:0,video:{},limitations:[]};
const run=(cmd,args,timeoutMs=50*60*1000)=>{
  const result=spawnSync(cmd,args,{cwd:root,encoding:'utf8',timeout:timeoutMs,
    maxBuffer:4*1024*1024,env:{...process.env,HF_DISABLE_TELEMETRY:'1',DO_NOT_TRACK:'1'}});
  if(result.error)throw Error(cmd+': '+result.error.message);
  if(result.status!==0)throw Error(cmd+' exited '+result.status+': '+(result.stderr||result.stdout||'').slice(-5000));
  return result.stdout;
};
function inspect(file,width,height) {
  const info=JSON.parse(run('ffprobe',['-v','error','-show_entries',
    'format=duration:stream=codec_type,codec_name,width,height,sample_rate,channels',
    '-of','json',file],15000));
  const video=info.streams?.find(x=>x.codec_type==='video');
  const audio=info.streams?.find(x=>x.codec_type==='audio');
  const duration=Number(info.format?.duration);
  if(video?.width!==width||video?.height!==height)throw Error(file+': incorrect video dimensions');
  if(audio?.codec_name!=='aac'||Number(audio.sample_rate)!==48000||audio.channels!==2)
    throw Error(file+': audio must be AAC 48 kHz stereo');
  if(!Number.isFinite(duration)||duration<seconds*.8||duration>seconds*1.2)
    throw Error(file+': target '+seconds+'s, actual '+duration+'s (outside 20% range)');
  return {width,height,duration,videoCodec:video.codec_name,audioCodec:audio.codec_name,
    audioHz:Number(audio.sample_rate),channels:audio.channels};
}
try{
  const script=JSON.parse(await readFile(fixture,'utf8'));
  const check=checkScript(script,undefined,{targetSeconds:seconds});
  if(!check.ok)throw Error('Invalid fixture: '+check.errors.join('; '));
  report.scenes=script.scenes.length;
  report.scriptedWords=script.scenes.reduce((n,s)=>n+s.say.trim().split(/\s+/).length,0);
  report.estimatedSeconds=check.estimatedSeconds;
  report.warnings=check.warnings;
  report.evidenceLevel=1;
  console.log('Starting genuine '+seconds+'s full-resolution render with '+report.scenes+' scenes');
  run(process.execPath,[join(root,'bin','reel.mjs'),'render',fixture]);
  report.video.portrait=inspect(join(output,'instagram.mp4'),1080,1920);
  report.video.landscape=inspect(join(output,'youtube.mp4'),1920,1080);
  report.video.portrait.bytes=(await stat(join(output,'instagram.mp4'))).size;
  report.video.landscape.bytes=(await stat(join(output,'youtube.mp4'))).size;
  const html=await readFile(join(root,'.reel-work',`claudecreate-production-verification-${seconds}-seconds`,'index.html'),'utf8');
  for(const template of ['caption_screen','counter','app_screen','callout','object_3d','compare'])
    if(!html.includes(`data-type="${template}"`))throw Error('Rendered composition missing '+template);
  if(!html.includes('window.__timelines.main=tl'))throw Error('Composition missing GSAP timeline');
  report.success=true;
  report.evidenceLevel=4; // Level 5 requires listening and reviewing the complete playback.
  report.limitations.push('Visual continuity, intelligibility and word-highlight quality require manual full-video playback inspection.');
  console.log('PASS: real '+seconds+'s full-resolution portrait and landscape files with AAC audio');
}catch(error){
  report.error=String(error.stack||error);
  console.error('FAIL production verification:',error.message);
  process.exitCode=1;
}finally{
  await mkdir(join(root,'reports'),{recursive:true});
  await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log('Evidence: '+reportPath+' (automated success='+report.success+')');
}
