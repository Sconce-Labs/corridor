"""
Generate one neural-TTS voice-over clip per scene (edge-tts: free, no API key,
Microsoft Azure neural voices, re-renderable in any of its ~400 voices).
"""
import asyncio
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(HERE, "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

import edge_tts


def _find_ffprobe() -> str:
    found = shutil.which("ffprobe")
    if found:
        return found
    winget = os.path.join(
        os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WinGet", "Links", "ffprobe.exe"
    )
    return winget if os.path.exists(winget) else "ffprobe"


FFPROBE = _find_ffprobe()


def duration_seconds(path: str) -> float:
    out = subprocess.check_output(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        text=True,
    )
    return float(out.strip())


async def main():
    with open(os.path.join(HERE, "scenes.json"), "r", encoding="utf-8") as f:
        cfg = json.load(f)

    voice = cfg.get("voice", "en-US-AndrewNeural")
    rate = cfg.get("rate", "+0%")
    manifest = []

    for scene in cfg["scenes"]:
        out_path = os.path.join(AUDIO_DIR, f"{scene['id']}.mp3")
        text = scene["narration"]
        print(f"-> {scene['id']}: {text[:60]}...")
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(out_path)
        dur = duration_seconds(out_path)
        print(f"   {dur:.2f}s  {out_path}")
        manifest.append({"id": scene["id"], "file": out_path, "duration": dur, "text": text})

    with open(os.path.join(HERE, "audio-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    total = sum(m["duration"] for m in manifest)
    print(f"\nTotal narration: {total:.1f}s across {len(manifest)} scenes")


if __name__ == "__main__":
    asyncio.run(main())
