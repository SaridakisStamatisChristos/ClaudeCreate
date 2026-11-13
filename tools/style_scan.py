#!/usr/bin/env python3
"""Offline reproducible reference sampling; never guesses caption dimensions from pixels."""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path


def run(*args):
    p = subprocess.run(args, capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError((p.stderr or p.stdout).strip()[-500:])
    return p


def scan(folder: Path):
    target = folder / 'analysis'
    target.mkdir(exist_ok=True)
    files = sorted(p for p in folder.iterdir() if p.suffix.lower() in {'.mp4','.mov','.mkv','.webm'})
    if not files:
        raise RuntimeError('No reference videos found in '+str(folder))
    results=[]
    for f in files:
        probe=json.loads(run('ffprobe','-v','error','-show_entries','format=duration','-of','json',str(f)).stdout)
        duration=float(probe['format']['duration'])
        # Analyze cuts at native resolution; showinfo emits only selected cut frames.
        p = subprocess.run(['ffmpeg','-hide_banner','-i',str(f),'-vf',r'select=gt(scene\,0.30),showinfo','-an','-f','null','-'],capture_output=True,text=True)
        cuts=len(re.findall(r'showinfo.+pts_time:',p.stderr))
        # Read at 4 fps; sample two groups of up to 25 frames distributed throughout the video.
        # No individual frame files are created or inspected.
        desired=2 if duration>=12 else 1
        images=[]
        for k in range(desired):
            start=k*duration/desired
            span=duration/desired
            step=max(1,int(span*4/25))
            out=target/f'{f.stem}_sheet_{k+1}.jpg'
            filt=f'fps=4,select=not(mod(n\\,{step})),scale=180:-1,tile=5x5:nb_frames=25:padding=4:margin=4'
            subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',str(start),'-t',str(span),'-i',str(f),'-vf',filt,'-frames:v','1',str(out)],capture_output=True)
            if out.exists(): images.append(str(out))
        results.append({'file':f.name,'seconds':round(duration,2),'scene_changes':cuts,'cuts_per_10s':round(cuts*10/duration,2),'contact_sheets':images,'fps_sampling':4,'threshold':0.30,'caption_measurements':'manual review required','voice_wpm':'local transcription required'})
    (target/'measurements.json').write_text(json.dumps(results,indent=2))
    print(json.dumps(results,indent=2))

if __name__=='__main__':
    try: scan(Path(sys.argv[1] if len(sys.argv)>1 else 'assets/references'))
    except Exception as exc:
        print('ERROR: '+str(exc),file=sys.stderr);sys.exit(1)
