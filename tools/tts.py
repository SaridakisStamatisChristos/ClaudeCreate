#!/usr/bin/env python3
"""Offline Kokoro TTS with timestamp metadata. Models download once at setup."""
import argparse
import json
import re
import sys
import wave
from pathlib import Path

SAMPLE_RATE = 24000


def whisper_words(path):
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError('Kokoro did not expose reliable word times; install faster-whisper in the local venv') from exc
    model = WhisperModel('tiny.en', device='cpu', compute_type='int8')
    segments, _ = model.transcribe(str(path), word_timestamps=True, language='en', beam_size=1)
    return [{'word': w.word.strip(), 'start': round(w.start, 3), 'end': round(w.end, 3)}
            for segment in segments for w in (segment.words or [])]


def synthesize(text, voice, target, speed=1.0):
    try:
        from kokoro import KPipeline
        import numpy as np
    except ImportError as exc:
        raise RuntimeError('Install local Kokoro first: pip install -r requirements.txt') from exc
    language = voice[0]
    if language not in 'abefhipjz':
        raise ValueError(f'Unknown Kokoro voice language prefix: {language}')
    generator = KPipeline(lang_code=language)
    audio_parts = []
    token_words = []
    offset = 0.0
    for result in generator(text, voice=voice, speed=speed):
        if result.audio is None:
            continue
        piece = result.audio.cpu().numpy().astype('float32').flatten()
        audio_parts.append(piece)
        for token in (result.tokens or []):
            spelling = getattr(token, 'text', '')
            start = getattr(token, 'start_ts', None)
            end = getattr(token, 'end_ts', None)
            if spelling and isinstance(start, (int, float)) and isinstance(end, (int, float)) and end >= start:
                token_words.append({'word': spelling.strip(), 'start': round(offset + start, 3), 'end': round(offset + end, 3)})
        offset += len(piece) / SAMPLE_RATE
    if not audio_parts:
        raise RuntimeError('Kokoro returned no audio')
    audio = np.clip(np.concatenate(audio_parts), -1, 1)
    target.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(target), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes((audio * 32767).astype('<i2').tobytes())
    duration = len(audio) / SAMPLE_RATE
    # Kokoro's predicted durations are native when present. Check coverage before using them.
    actual = re.findall(r'\S+', text)
    valid = len(token_words) >= max(1, len(actual) - 1) and all(
        token_words[i]['start'] <= token_words[i]['end'] for i in range(len(token_words)))
    if not valid:
        token_words = whisper_words(target)
    # Use sequential alignment to the exact script words; punctuation is not part of matching.
    # Fallback to local Whisper if Kokoro did not provide each script word.
    def clean(word):
        return re.sub(r'[^\w]', '', word, flags=re.UNICODE).lower()
    def align(candidates):
        out = []
        ci = 0
        for word in actual:
            key = clean(word)
            while ci < len(candidates) and clean(candidates[ci]['word']) != key:
                ci += 1
            if ci == len(candidates):
                return None
            out.append({'word': word, 'start': candidates[ci]['start'], 'end': candidates[ci]['end']})
            ci += 1
        return out
    aligned = align(token_words)
    if aligned is None:
        aligned = align(whisper_words(target))
    if aligned is None:
        raise RuntimeError('Could not align all word timestamps with the provided script')
    return {'duration': round(duration, 5), 'words': aligned, 'voice': voice, 'rate': SAMPLE_RATE}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--text', required=True)
    parser.add_argument('--voice', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--speed', type=float, default=1.0)
    args = parser.parse_args()
    try:
        result = synthesize(args.text, args.voice, Path(args.output), args.speed)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as exc:
        print(f'TTS ERROR: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
