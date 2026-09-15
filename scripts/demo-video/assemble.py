"""
Mux each scene's recorded .webm with its narration .mp3. Never trims away
recorded action (a slow RPC call must never get cut off mid-demo): each clip's
length is the LONGER of {video, audio}, with the shorter side padded to match
— silence appended to short audio, the last frame frozen to extend short video.
Then concatenate every scene into one final demo video.
"""
import json
import os
import shutil
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)


def _find(tool: str) -> str:
    """Prefer PATH; fall back to the winget per-user install location on
    Windows (`winget install Gyan.FFmpeg` doesn't always land on PATH without
    a shell restart)."""
    found = shutil.which(tool)
    if found:
        return found
    winget = os.path.join(
        os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WinGet", "Links", f"{tool}.exe"
    )
    return winget if os.path.exists(winget) else tool


FFMPEG = _find("ffmpeg")
FFPROBE = _find("ffprobe")


def probe_duration(path: str) -> float:
    out = subprocess.check_output(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        text=True,
    )
    return float(out.strip())


def run(cmd):
    print(" ", " ".join(f'"{c}"' if " " in c else c for c in cmd))
    subprocess.run(cmd, check=True)


def main():
    with open(os.path.join(HERE, "video-manifest.json"), "r", encoding="utf-8") as f:
        video_manifest = {m["id"]: m for m in json.load(f)}
    with open(os.path.join(HERE, "audio-manifest.json"), "r", encoding="utf-8") as f:
        audio_manifest = {m["id"]: m for m in json.load(f)}

    scene_ids = list(video_manifest.keys())
    scene_files = []

    for sid in scene_ids:
        v = video_manifest[sid]["file"]
        a = audio_manifest[sid]["file"]
        adur = audio_manifest[sid]["duration"]
        vdur = probe_duration(v)
        target = max(vdur, adur) + 0.15  # +0.15s so pads cover rounding
        vpad = max(0.0, target - vdur)
        apad = max(0.0, target - adur)
        out_path = os.path.join(OUT, f"{sid}.mp4")
        print(f"\n{sid}: video {vdur:.2f}s / audio {adur:.2f}s -> clip {target:.2f}s "
              f"(vpad {vpad:.2f}s, apad {apad:.2f}s)")

        vf = f"tpad=stop_mode=clone:stop_duration={vpad:.3f},fps=30,format=yuv420p" if vpad > 0 else "fps=30,format=yuv420p"
        af = f"apad=pad_dur={apad:.3f}" if apad > 0 else "anull"
        cmd = [
            FFMPEG, "-y",
            "-i", v,
            "-i", a,
            "-vf", vf,
            "-af", af,
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-c:a", "aac", "-b:a", "160k",
            "-t", f"{target:.3f}",
            "-movflags", "+faststart",
            out_path,
        ]
        run(cmd)
        scene_files.append(out_path)

    # concat
    list_path = os.path.join(OUT, "concat.txt")
    with open(list_path, "w", encoding="utf-8") as f:
        for p in scene_files:
            f.write(f"file '{p}'\n")

    final = os.path.join(OUT, "corridor-demo.mp4")
    run([
        FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", list_path,
        "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart",
        final,
    ])

    total = probe_duration(final)
    size_mb = os.path.getsize(final) / 1_048_576
    print(f"\nDONE: {final}  -  {total:.1f}s, {size_mb:.1f} MB")


if __name__ == "__main__":
    main()
