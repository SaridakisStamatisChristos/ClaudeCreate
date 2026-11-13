#!/usr/bin/env node
// Real 2-second HyperFrames editorial composition smoke (synthetic word times, NO Kokoro).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeComposition } from '../src/composition.mjs';

const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
const work=join(ROOT,'.reel-work','editorial-smoke'),out=join(work,'smoke.mp4'),frames=join(work,'frames');
const binary=join(ROOT,'node_modules','.bin','hyperframes');
if(!existsSync(binary))throw Error('Install dependencies first: npm install');
const script=JSON.parse(await readFile(join(ROOT,'examples','editorial_stage_b.json'),'utf8'));
const timing=script.scenes.map((s,i)=>({
 start:i*2.2,duration:2.2,audioDuration:2.05,
 words:s.say.split(/\s+/).map((word,j)=>({word,start:j*.21,end:(j+1)*.21}))
}));
await mkdir(work,{recursive:true});await mkdir(frames,{recursive:true});
await writeComposition(work,script,timing,{draft:true,baseDir:ROOT});
function exec(cmd,args,timeout=210000){
 const p=spawnSync(cmd,args,{cwd:work,encoding:'utf8',maxBuffer:2*1024*1024,timeout});
 if(p.status!==0)throw Error(cmd+' '+args[0]+' failed: '+(p.stderr||p.stdout||p.error?.message||'').slice(-2500));
 return p.stdout;
}
exec(binary,['lint']);
exec(binary,['render','--output',out,'--end','2.0','--fps','30','--quality','draft']);
if(!existsSync(out))throw Error('HyperFrames did not create the editorial test clip');
const info=JSON.parse(exec('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height','-of','json',out]));
const visual=info.streams.find(s=>s.width);
if(visual?.width!==540||visual?.height!==960)throw Error('Incorrect editorial draft dimensions');
if(Math.abs(Number(info.format.duration)-2.0)>.08)throw Error('Incorrect editorial clip duration');
for(const time of [0.25,1.0,1.75,1.0]){
 const name=time===1.0 && existsSync(join(frames,'at-1.00.png'))?'repeat-1.00.png':'at-'+time.toFixed(2)+'.png';
 exec('ffmpeg',['-y','-hide_banner','-loglevel','error','-ss',time.toFixed(2),'-i',out,'-frames:v','1',join(frames,name)]);
}
const sha=file=>createHash('sha256').update(readFileSync(join(frames,file))).digest('hex');
if(sha('at-1.00.png')!==sha('repeat-1.00.png'))throw Error('Repeated video still at one timestamp differed');
if(sha('at-0.25.png')===sha('at-1.75.png'))throw Error('Motion frames were identical at different timestamps');
console.log('PASS: genuine HyperFrames editorial 2-second video, ffprobe 540x960, motion and deterministic still extraction (synthetic timing)');
