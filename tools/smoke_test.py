#!/usr/bin/env python3
"""Offline integration test of the FFmpeg/export pipeline using test doubles.

This explicitly does NOT establish Kokoro or HyperFrames engine correctness.
"""
import array
import json
import math
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent

def call(*args, cwd=None):
    p = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    if p.returncode:
        raise AssertionError(f'{args[0]} failed: {(p.stderr or p.stdout)[-1500:]}')
    return p.stdout

def dimensions(path):
    result = call('ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',str(path))
    v=json.loads(result)['streams'][0]
    return v['width'], v['height']

def audio_format(path):
    result = call('ffprobe', '-v', 'error', '-select_streams', 'a:0',
                  '-show_entries', 'stream=sample_rate,channels', '-of', 'json', str(path))
    streams = json.loads(result)['streams']
    assert streams, f'Missing audio stream: {path}'
    return int(streams[0]['sample_rate']), int(streams[0]['channels'])

def main():
    for required in ['node','ffmpeg','ffprobe']:
        if not shutil.which(required):
            raise RuntimeError(f'Missing {required}')
    with tempfile.TemporaryDirectory(prefix='claudecreate-smoke-') as temp:
        root=Path(temp)
        for name in ['bin','src','tools','examples']:
            shutil.copytree(HERE/name,root/name,ignore=shutil.ignore_patterns('__pycache__'))
        shutil.copy2(HERE/'config.json',root/'config.json')
        (root/'assets'/'music').mkdir(parents=True)
        (root/'assets'/'sfx').mkdir(parents=True)
        (root/'node_modules'/'gsap'/'dist').mkdir(parents=True)
        (root/'node_modules'/'three'/'build').mkdir(parents=True)
        (root/'node_modules'/'.bin').mkdir(parents=True)
        (root/'node_modules'/'gsap'/'dist'/'gsap.min.js').write_text('')
        (root/'node_modules'/'three'/'build'/'three.module.js').write_text('')
        (root/'node_modules'/'three'/'build'/'three.core.js').write_text('')
        mock = root/'node_modules'/'.bin'/'hyperframes'
        mock.write_text('''#!/usr/bin/env python3
import sys,subprocess,wave,math,array,json
from pathlib import Path
args=sys.argv[1:];cmd=args[0]
if cmd=='tts':
    speech=Path(args[1]).read_text();wav=Path(args[args.index('--output')+1]);wav.parent.mkdir(parents=True,exist_ok=True)
    (wav.parent/'text.json').write_text(json.dumps(speech))
    seconds=len(speech.split())*.4;rate=24000
    samples=array.array('h',(int(math.sin(i/rate*2*math.pi*230)*2100) for i in range(int(seconds*rate))))
    with wave.open(str(wav),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(samples.tobytes())
elif cmd=='transcribe':
    wav=Path(args[1]);folder=Path(args[args.index('--dir')+1])
    words=json.loads((wav.parent/'text.json').read_text()).split()
    timings=[{'text':w,'start':round(i*.4,3),'end':round((i+1)*.4,3)} for i,w in enumerate(words)]
    (folder/'transcript.json').write_text(json.dumps(timings))
    print(json.dumps({'words':len(timings),'file':str(folder/'transcript.json')}))
elif cmd=='render':
    out=args[args.index('--output')+1];seconds=args[args.index('--end')+1] if '--end' in args else '6'
    subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=black:s=540x960:r=30','-t',seconds,'-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',out],check=True)
else:
    raise RuntimeError('Unexpected mocked HyperFrames command: '+cmd)
''')
        mock.chmod(0o755)
        script=json.loads((root/'examples'/'dummy.json').read_text())
        output=call('node','bin/reel.mjs','render','examples/dummy.json','--draft',cwd=root)
        target=root/'out'/'three-moments-one-idea-draft'
        for name in ['instagram.mp4','youtube.mp4','thumb_a.png','thumb_b.png','caption.txt','CREDITS.txt']:
            assert (target/name).stat().st_size>0, f'Missing {name}'
        assert dimensions(target/'instagram.mp4')==(540,960)
        assert dimensions(target/'youtube.mp4')==(960,540)
        assert audio_format(target/'instagram.mp4')==(48000,2), 'Portrait AAC must be 48 kHz stereo'
        assert audio_format(target/'youtube.mp4')==(48000,2), 'Landscape AAC must be 48 kHz stereo'
        assert abs(float(output.split('Measured integrated loudness: ')[1].split(' LUFS')[0])+14)<.6,output
        voice_cache=list((root/'.cache'/'voices').glob('*/timing.json'))
        assert len(voice_cache)==len(script['scenes']), f'Wrong synthetic TTS cache count: {len(voice_cache)}'
        assert all(json.loads(p.read_text())['provider']=='hyperframes-kokoro' for p in voice_cache)
        print('PASS: native HyperFrames TTS/transcribe interface mocked; FFmpeg export verified with synthetic tone (not genuine Kokoro/Whisper)')

if __name__=='__main__':
    main()
