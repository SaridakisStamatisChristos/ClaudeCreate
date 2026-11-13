#!/usr/bin/env node
// Genuine HyperFrames render smoke test, with deterministic synthetic timing (no TTS/model download).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeComposition } from '../src/composition.mjs';

const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
const work=join(ROOT,'.reel-work','hf-smoke'),out=join(work,'smoke.mp4');
const binary=join(ROOT,'node_modules','.bin','hyperframes');
if(!existsSync(binary))throw Error('Install dependencies first: npm install');
const script=JSON.parse(await readFile(join(ROOT,'examples','dummy.json'),'utf8'));
const timing=script.scenes.map((s,i)=>({start:i*1.8,duration:1.8,audioDuration:1.6,words:s.say.split(/\s+/).map((word,j)=>({word,start:j*.32,end:(j+1)*.32}))}));
await mkdir(work,{recursive:true});
await writeComposition(work,script,timing,{draft:true,baseDir:ROOT});
const exec=(cmd,args)=>{
 const p=spawnSync(cmd,args,{cwd:work,encoding:'utf8',maxBuffer:1024*1024,timeout:150000});
 if(p.status!==0)throw Error(`${cmd} ${args[0]} failed: ${(p.stderr||p.stdout||p.error?.message||'').slice(-2000)}`);
 return p.stdout;
};
exec(binary,['lint']);
exec(binary,['render','--output',out,'--end','1.0','--fps','30','--quality','draft']);
if(!existsSync(out))throw Error('HyperFrames did not create smoke.mp4');
const probe=JSON.parse(exec('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height','-of','json',out]));
const stream=probe.streams.find(x=>x.width);
if(stream?.width!==540||stream?.height!==960)throw Error('Incorrect HyperFrames draft dimensions');
if(Math.abs(Number(probe.format.duration)-1.0)>.08)throw Error('Incorrect HyperFrames smoke duration');
console.log('PASS: genuine local HyperFrames 1-second video render');
