# Native HyperFrames Kokoro + transcription

HyperFrames includes Kokoro-82M TTS and local Whisper transcription. ClaudeCreate uses those directly, eliminating the redundant Python kokoro and faster-whisper packages, tools/tts.py and requirements.txt.

## Install

~~~bash
sudo apt install -y ffmpeg python3 espeak-ng
npm install
npx hyperframes tts --list
~~~

Python3 remains for stdlib sound-effect synthesis and mock CI only. No pip or venv.

## Commands used by the app

~~~bash
node_modules/.bin/hyperframes tts /absolute/cache/script.txt \
  --voice af_heart --speed 1 --output /absolute/cache/narration.wav

node_modules/.bin/hyperframes transcribe /absolute/cache/narration.wav \
  --dir /absolute/cache --engine whisper --model small.en --language en --json

ffprobe -v error -show_entries format=duration -of json /absolute/cache/narration.wav
~~~

Each scene has its own hash-keyed .cache/voices/<hash>/ working directory. HyperFrames writes transcript.json as an array of word entries with text/start/end. The adapter matches the original script words in order and refuses missing words, impossible timestamp ranges or unreadable WAV lengths. There is no timing approximation if ASR fails. The cache stores the WAV SHA-256 digest, measured sample rate and channel count, adapter version, and timing metadata. A cached WAV whose hash differs from the recorded digest is regenerated. A newly generated WAV must pass FFprobe audio stream validation before its timings are committed atomically.

American and British voices use English small.en; other supported Kokoro prefixes choose the corresponding language and multilingual large-v3. Model files may be downloaded on first use and can be large. Voice samples use the same adapter.

Unit tests exercise the bridge with a simulated CLI, not model weights. Run `npm run test:real` for genuine local Kokoro/Whisper and video execution; see [verification levels](VERIFICATION.md). Inspect the resulting GitHub Actions log and evidence before describing a model run as successful.

Reference: https://hyperframes.app/docs/5-packages/cli
