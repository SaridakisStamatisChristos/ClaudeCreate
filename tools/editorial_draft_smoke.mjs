#!/usr/bin/env node
// Genuine short local HyperFrames+FFmpeg reel; voice track is SYNTHETIC TEST AUDIO, NOT KOKORO.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeComposition } from '../src/composition.mjs';

const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
const work=join(ROOT,'.reel-work','editorial-draft-smoke'),output=join(work,'output');
const bin=join(ROOT,'node_modules','.bin','hyperframes'),DURATION=8.4;
if(!existsSync(bin))throw Error('npm install required before this integration test');
await mkdir(output,{recursive:true});
const script=JSON.parse(await readFile(join(ROOT,'examples','editorial_stage_c.json'),'utf8'));
const timing=script.scenes.map((s,i)=>({start:i*2.1,duration:2.1,audioDuration:1.95,words:s.say.split(/\s+/).map((word,j)=>({word,start:j*.22,end:(j+1)*.22}))}));
await writeComposition(work,script,timing,{draft:true,baseDir:ROOT});
function run(cmd,args,timeout=300000){
 const p=spawnSync(cmd,args,{cwd:work,encoding:'utf8',maxBuffer:4*1024*1024,timeout});
 if(p.status!==0)throw Error(cmd+' failed: '+(p.stderr||p.stdout||p.error?.message||'').slice(-2400));
 return {stdout:p.stdout,stderr:p.stderr};
}
const raw=join(work,'silent.mp4'),wav=join(work,'synthetic-test-tone.wav'),aac=join(work,'normalized.m4a');
run(bin,['lint']);
run(bin,['render','--output',raw,'--end',DURATION.toFixed(1),'--fps','30','--quality','draft']);
const samples=Math.round(24000*DURATION),buffer=Buffer.alloc(44+samples*2);
buffer.write('RIFF',0);buffer.writeUInt32LE(36+samples*2,4);buffer.write('WAVEfmt ',8);
buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);
buffer.writeUInt32LE(24000,24);buffer.writeUInt32LE(48000,28);buffer.writeUInt16LE(2,32);
buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples*2,40);
for(let i=0;i<samples;i++){
 const t=i/24000,envelope=Math.min(1,t/.07)*Math.min(1,(DURATION-t)/.07);
 const wave=(Math.sin(2*Math.PI*212*t)+.26*Math.sin(2*Math.PI*423*t))*.07*envelope;
 buffer.writeInt16LE(Math.round(wave*32767),44+i*2);
}
await writeFile(wav,buffer);
const settings='I=-14:TP=-1.5:LRA=11';
function stats(log){
 const match=log.match(/\{\s*"input_i"\s*:[\s\S]*?\}/g)?.at(-1);
 if(!match)throw Error('Missing FFmpeg loudnorm measurements');
 return JSON.parse(match);
}
const first=stats(run('ffmpeg',['-hide_banner','-i',wav,'-af','loudnorm='+settings+':print_format=json','-f','null','-']).stderr);
const filter='loudnorm='+settings+':measured_I='+first.input_i+':measured_TP='+first.input_tp+':measured_LRA='+first.input_lra+':measured_thresh='+first.input_thresh+':offset='+first.target_offset+':linear=true:print_format=json';
run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',wav,'-af',filter,'-c:a','aac','-b:a','160k',aac]);
const measured=stats(run('ffmpeg',['-hide_banner','-i',aac,'-af','loudnorm='+settings+':print_format=json','-f','null','-']).stderr);
const portrait=join(output,'instagram-test.mp4'),landscape=join(output,'youtube-test.mp4');
run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',raw,'-i',aac,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy','-t',DURATION.toFixed(1),'-movflags','+faststart',portrait]);
const layout='[0:v]split=2[x][y];[x]scale=960:540:force_original_aspect_ratio=increase,crop=960:540,boxblur=25:8,eq=brightness=-0.22[bg];[y]scale=-2:540[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]';
run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',portrait,'-filter_complex',layout,'-map','[v]','-map','0:a:0','-c:v','libx264','-preset','veryfast','-crf','20','-c:a','copy','-movflags','+faststart',landscape]);
for(const [file,w,h] of [[portrait,540,960],[landscape,960,540]]){
 const data=JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_type','-of','json',file]).stdout);
 if(!data.streams.some(x=>x.width===w&&x.height===h))throw Error('Dimension mismatch for '+file);
 if(!data.streams.some(x=>x.codec_type==='audio'))throw Error('Missing audio stream for '+file);
 if(Math.abs(Number(data.format.duration)-DURATION)>.12)throw Error('Duration mismatch for '+file);
}
for(const t of [.8,1.8,2.8,4.0,5.6,7.6]){
 run('ffmpeg',['-y','-hide_banner','-loglevel','error','-ss',t.toFixed(2),'-i',portrait,'-frames:v','1',join(output,'still-'+t.toFixed(2)+'.png')]);
}
await writeFile(join(output,'caption.txt'),script.caption+'\n'+script.hashtags.join(' ')+'\n');
await writeFile(join(output,'CREDITS.txt'),'Visuals: programmatically created originals for ClaudeCreate.\nVoice: SYNTHETIC TEST TONE ONLY. NOT Kokoro; no spoken narration.\nSound effects: not included in this smoke test.\n');
console.log('PASS: actual 8.4-second HyperFrames video, FFprobe 540x960 and 960x540 MP4, synthetic tone mix; measured '+measured.input_i+' LUFS (NOT Kokoro)');
