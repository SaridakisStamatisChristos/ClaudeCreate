import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {alignSpeech, cacheKey, synthesizeSpeech} from '../src/audio/hyperframes.mjs';

test('aligns exact scripted words with transcript word times and punctuation',()=>{
  const words=alignSpeech("A simple idea changes lives.",[
    {text:'A',start:0,end:.2},{text:'simple',start:.2,end:.5},
    {text:'idea',start:.5,end:.8},{text:'changes',start:.8,end:1.2},
    {text:'lives.',start:1.2,end:1.7}
  ],1.9);
  assert.deepEqual(words.map(w=>w.word),['A','simple','idea','changes','lives.']);
  assert.equal(words[4].start,1.2);
});

test('rejects ASR omissions, missing audio, non-monotonic and out-of-range timestamps',()=>{
  assert.throws(()=>alignSpeech('one two',[{text:'one',start:0,end:.2}],.5),/word count differs/);
  assert.throws(()=>alignSpeech('one',[],1),/no word-level/);
  assert.throws(()=>alignSpeech('one',[{text:'one',start:0,end:.1},{text:'extra',start:.11,end:.2}],1),/word count differs/);
  assert.throws(()=>alignSpeech('one',[{text:'one',start:0,end:2}],1),/invalid word timestamp/);
  assert.throws(()=>alignSpeech('one two',[
    {text:'one',start:.3,end:.4},{text:'two',start:.1,end:.2}],1),/not in chronological/);
  assert.throws(()=>alignSpeech('one',[{text:'one',start:0,end:.1}],0),/no measurable duration/);
  assert.notEqual(cacheKey('a','af_heart'),cacheKey('a','am_adam'));
});

test('bridge invokes local HyperFrames Kokoro then transcription; caches only validated timing',async()=>{
 const root=await mkdtemp(join(tmpdir(),'claudecreate-tts-'));
 const trace=[];
 try{
   const exec=async(executable,args,opts={})=>{
     trace.push({executable,args,opts});
     if(args[0]==='tts'){
       const file=args[args.indexOf('--output')+1];
       await writeFile(file,'mock wav');
       return {out:'generated'};
     }
     if(args[0]==='transcribe'){
       assert.equal(args[args.indexOf('--engine')+1],'whisper');
       assert.equal(args[args.indexOf('--model')+1],'small.en');
       assert.equal(opts.cwd,args[args.indexOf('--dir')+1]);
       await writeFile(join(opts.cwd,'transcript.json'),JSON.stringify([
         {text:'Hello',start:0,end:.27},{text:'world.',start:.29,end:.65}
       ]));
       return {out:'{}'};
     }
     if(executable==='ffprobe')return {out:JSON.stringify({streams:[{codec_type:'audio',sample_rate:'24000',channels:1}],format:{duration:'0.7'}})};
     throw new Error('Unexpected executable/args');
   };
   const options={root,cli:'/opt/hyperframes/bin/hyperframes',exec};
   const first=await synthesizeSpeech('Hello world.','af_heart',options);
   assert.equal(first.words.length,2);
   assert.equal(first.words[1].start,.29);
   assert.equal(first.provider,'hyperframes-kokoro');
   assert.equal(trace.length,3);
   const second=await synthesizeSpeech('Hello world.','af_heart',options);
   assert.deepEqual(second,first);
   assert.equal(trace.length,3,'second call should reuse verified cache');
   assert.match(first.wav,/\.cache\/voices\/[0-9a-f]{64}\/narration\.wav$/);
   const meta=JSON.parse(await readFile(join(root,'.cache','voices',cacheKey('Hello world.','af_heart'),'timing.json'),'utf8'));
   assert.equal(meta.duration,.7);
   assert.equal(meta.sampleRate,24000);
   assert.match(meta.wavSha256,/^[0-9a-f]{64}$/);
   await writeFile(first.wav,'corrupted wav');
   const third=await synthesizeSpeech('Hello world.','af_heart',options);
   assert.equal(trace.length,6,'corrupt WAV forces regeneration even when timing.json exists');
   assert.deepEqual(third,first);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('no timing file cached when Whisper text does not align; multilingual model explicitly selected',async()=>{
 const root=await mkdtemp(join(tmpdir(),'claudecreate-tts-multilang-'));const calls=[];
 try{
   const exec=async(executable,args,{cwd}={})=>{
     calls.push(args);
     if(args[0]==='tts'){await writeFile(args[args.indexOf('--output')+1],'mock wav');return {out:''};}
     if(args[0]==='transcribe'){
       assert.equal(args[args.indexOf('--model')+1],'large-v3');
       assert.equal(args[args.indexOf('--language')+1],'es');
       await writeFile(join(cwd,'transcript.json'),JSON.stringify([{text:'Hola',start:0,end:.25}]));
       return {out:''};
     }
     return {out:JSON.stringify({streams:[{codec_type:'audio',sample_rate:'24000',channels:1}],format:{duration:'.5'}})};
   };
   await assert.rejects(
     synthesizeSpeech('Hola mundo','ef_dora',{root,cli:'/bin/hyperframes',exec}),
     /word count differs/);
   const timing=join(root,'.cache','voices',cacheKey('Hola mundo','ef_dora'),'timing.json');
   await assert.rejects(readFile(timing),/ENOENT/);
   assert.equal(calls.length,3);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('rejects a non-audio ffprobe result before writing timing cache',async()=>{
 const root=await mkdtemp(join(tmpdir(),'claudecreate-invalid-wav-'));
 try{
   const runner=async(cmd,args,{cwd}={})=>{
     if(args[0]==='tts'){await writeFile(args[args.indexOf('--output')+1],'not audio');return {out:''};}
     if(args[0]==='transcribe'){
       await writeFile(join(cwd,'transcript.json'),JSON.stringify([{text:'Hello',start:0,end:.2}]));
       return {out:''};
     }
     return {out:JSON.stringify({format:{duration:'1.0'},streams:[]})};
   };
   await assert.rejects(synthesizeSpeech('Hello','af_heart',{root,cli:'/bin/hyperframes',exec:runner}),/failed ffprobe audio validation/);
   await assert.rejects(readFile(join(root,'.cache','voices',cacheKey('Hello','af_heart'),'timing.json')),/ENOENT/);
 }finally{await rm(root,{recursive:true,force:true});}
});
