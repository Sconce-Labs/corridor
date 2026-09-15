# Demo video pipeline

Regenerates [`../../assets/demo.mp4`](../../assets/demo.mp4) — a narrated
screen-recording walkthrough of the live site, driven end-to-end from one
scene script. Nothing here is hand-edited footage: every clip is recorded
live against `corridor-pink.vercel.app` (real testnet reads, a real
`is_cleared` write) and narrated with free, keyless neural TTS.

## Pipeline

```
scenes.json  →  narrate.py   →  audio/*.mp3        (edge-tts, one clip per scene)
             →  record.mjs   →  video/*.webm        (Playwright + Chromium, one clip per scene)
                                       ↓
                              assemble.py            (ffmpeg: mux, pad, concat)
                                       ↓
                              out/corridor-demo.mp4
```

`assemble.py` never trims recorded action — each scene's length is the
**longer** of {video, audio}; the shorter side is padded (silence appended to
audio, the last frame frozen to extend video). A slow RPC response can never
cut off mid-demo; worst case is a beat of silence or a held frame.

## Run it

```bash
npm install playwright && npx playwright install chromium
pip install edge-tts
# ffmpeg + ffprobe on PATH (winget install Gyan.FFmpeg on Windows, apt/brew elsewhere)

python narrate.py    # → audio/*.mp3 + audio-manifest.json
node record.mjs       # → video/*.webm + video-manifest.json
python assemble.py    # → out/corridor-demo.mp4

cp out/corridor-demo.mp4 ../../assets/demo.mp4
ffmpeg -y -ss 47 -i out/corridor-demo.mp4 -frames:v 1 -q:v 4 -vf scale=1280:-1 ../../assets/demo-poster.jpg
```

## Editing the script

Everything — narration text, voice, speaking rate, which page section each
scene shows, cursor targets, and pacing — lives in `scenes.json`. To change
the voice: `edge-tts --list-voices` lists ~400 free neural voices; swap
`"voice"` and re-run `narrate.py` (no code changes, no re-recording needed
unless the visuals also changed). To retime a scene, adjust its `wait` values
— they don't need to be exact, `assemble.py`'s pad/trim-free muxing absorbs
the slack.
