#!/usr/bin/env python3
"""Generate original CC0 electronic effects; all synthesis is local and deterministic."""
import math
import random
import sys
import wave
from pathlib import Path

RATE = 24000
random.seed(11441)

def effect(kind, variant):
    lengths = dict(whoosh=.42, pop=.22, tick=.13, stamp=.36, ding=.48, swipe=.3)
    count = int(lengths[kind] * RATE)
    phase = random.random() * 6.28
    output=[]
    for i in range(count):
        t=i/RATE; r=i/count
        noise=random.uniform(-1, 1)
        if kind=='whoosh': v=(noise*.35+math.sin(2*math.pi*(180+variant*35)*t)*.05)*math.sin(math.pi*r)**2
        elif kind=='swipe': v=(noise*.22+math.sin(2*math.pi*(340+100*r)*t)*.14)*math.sin(math.pi*r)**2
        elif kind=='pop': v=(noise*.55+math.sin(2*math.pi*(100-50*r)*t)*.5)*math.exp(-24*r)
        elif kind=='tick': v=(noise*.55+math.sin(2*math.pi*1100*t)*.14)*math.exp(-31*r)
        elif kind=='stamp': v=(noise*.5+math.sin(2*math.pi*(95+variant*15)*t)*.5)*math.exp(-12*r)
        else: v=(math.sin(2*math.pi*(830+variant*85)*t+phase)+.3*math.sin(2*math.pi*1660*t))*math.exp(-7*r)*.42
        output.append(int(max(-1,min(1,v)) * 32767 * .65))
    return output

def write(path,values):
    import array
    path.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE)
        w.writeframes(array.array('h',values).tobytes())

def main(folder):
    names=[]
    for kind in ['whoosh','pop','tick','stamp','ding','swipe']:
        for variant in range(1,4):
            name=f'{kind}_{variant}.wav'
            write(folder/name,effect(kind,variant))
            names.append(name)
    (folder/'CREDITS.txt').write_text('Original electronic sounds synthesized algorithmically for ClaudeCreate.\n18 WAVs, 24 kHz, mono. Dedicated to the public domain under CC0-1.0.\nNo downloaded, copyrighted, or third-party samples used.\nFiles: '+', '.join(names)+'\n')
    print(f'generated {len(names)} local CC0 effects')

if __name__=='__main__':
    main(Path(sys.argv[1] if len(sys.argv)>1 else 'assets/sfx'))
