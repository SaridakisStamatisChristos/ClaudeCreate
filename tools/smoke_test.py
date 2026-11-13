#!/usr/bin/env python3
"""Offline integration test of the FFmpeg/export pipeline using test doubles.

This explicitly does NOT establish Kokoro or HyperFrames engine correctness.
"""
import array
import hashlib
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

def fake_voices(root, script):
    folder=root/'.cache'/'voices';folder.mkdir(parents=True)
    for scene in script['scenes']:
        text=scene['say'];voice=scene.get('voice',script.get('voice','af_heart'))
        payload=json.dumps({'text':text,'selected':voice,'engine':'kokoro-1','speed':1},separators=(',',':'))
        digest=hashlib.sha256(payload.encode()).hexdigest()
        words=text.split();seconds=len(words)*.4
        samples=array.array('h',(int(math.sin(i/24000*2*math.pi*230)*2100) for i in range(int(seconds*24000))))
        with wave.open(str(folder/f'{digest}.wav'),'wb') as f:
            f.setnchannels(1);f.setsampwidth(2);f.setframerate(24000);f.writeframes(samples.tobytes())
        meta={'duration':seconds,'words':[{'word':w,'start':round(i*.4,3),'end':round((i+1)*.4,3)} for i,w in enumerate(words)]}
        (folder/f'{digest}.json').write_text(json.dumps(meta))

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
        mock = root/'node_modules'/'.bin'/'hyperframes'
        mock.write_text('''#!/usr/bin/env python3
import subprocess,sys
args=sys.argv[1:];out=args[args.index('--output')+1];seconds=args[args.index('--end')+1] if '--end' in args else '6'
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=black:s=540x960:r=30','-t',seconds,'-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',out],check=True)
''')
        mock.chmod(0o755)
        script=json.loads((root/'examples'/'dummy.json').read_text())
        fake_voices(root,script)
        output=call('node','bin/reel.mjs','render','examples/dummy.json','--draft',cwd=root)
        target=root/'out'/'three-moments-one-idea-draft'
        for name in ['instagram.mp4','youtube.mp4','thumb_a.png','thumb_b.png','caption.txt','CREDITS.txt']:
            assert (target/name).stat().st_size>0, f'Missing {name}'
        assert dimensions(target/'instagram.mp4')==(540,960)
        assert dimensions(target/'youtube.mp4')==(960,540)
        assert abs(float(output.split('Measured integrated loudness: ')[1].split(' LUFS')[0])+14)<.6,output
        print('PASS: local FFmpeg integration (synthetic speech, test render; not genuine TTS/HyperFrames)')

if __name__=='__main__':
    main()
