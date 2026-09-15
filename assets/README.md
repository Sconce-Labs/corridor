# Brand assets

| File | Use |
|------|-----|
| `logo.svg` | source — a lit passage receding to a point, teal→blue on `#0A0F1C` |
| `logo.png` (512) / `logo-256.png` / `logo-128.png` | raster, for avatars / social previews |
| `favicon.svg` / `favicon.png` (64) | favicon |
| `demo.mp4` | 67s narrated walkthrough of the live site (embedded in the root `README.md`) — 1440×900, h264/aac, ~2.9 MB |
| `demo-poster.jpg` | poster frame for the `<video>` embed (the clearance-check result) |

`demo.mp4` was recorded with Playwright against `corridor-pink.vercel.app`
(real testnet reads, a real `is_cleared` write) and narrated with `edge-tts`
(`en-US-AndrewNeural`, free, no API key, neural). Regenerate it with
[`../scripts/demo-video/`](../scripts/demo-video/) if the site changes enough
to date the recording — narration, cursor targets, and pacing are all
data-driven from one `scenes.json`, nothing hand-cut.

The mark keeps the palette of the retired demo's `🌑` favicon (privacy = night)
but replaces the bare emoji with a "corridor" — nested apertures converging on
the light at the end.

## Apply it (manual — GitHub has no API for these)

- **Org avatar:** https://github.com/organizations/Sconce-Labs/settings/profile
  → upload `logo.png`.
- **Repo social preview** (per repo): Settings → *Social preview* → upload
  `logo-256.png` (GitHub crops to 1280×640, so it'll pad — fine for a mark).
- **Favicon** for any future Corridor site: `favicon.svg`.

Palette: bg `#0A0F1C`, rim gradient `#7DF9E6 → #41C7EE → #2A7DE1`,
core `#EAFBF7`.
