// Records one .webm clip per scene from scenes.json against the live
// Corridor site, with a synthetic on-screen cursor so viewers can see what's
// being highlighted / clicked.
import { chromium } from "playwright";
import { readFileSync, mkdirSync, renameSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(path.join(here, "scenes.json"), "utf8"));
const videoDir = path.join(here, "video");
mkdirSync(videoDir, { recursive: true });

const CURSOR_INIT = `
(() => {
  const dot = document.createElement('div');
  dot.id = '__cur';
  Object.assign(dot.style, {
    position: 'fixed', left: '-100px', top: '-100px', width: '22px', height: '22px',
    borderRadius: '50%', background: 'rgba(45,140,255,0.95)',
    boxShadow: '0 0 0 5px rgba(45,140,255,0.25), 0 2px 10px rgba(0,0,0,0.35)',
    zIndex: 2147483647, pointerEvents: 'none',
    transition: 'left 480ms cubic-bezier(.2,.8,.2,1), top 480ms cubic-bezier(.2,.8,.2,1)',
    transform: 'translate(-50%, -50%)',
  });
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(dot));
  window.__moveCursor = (x, y) => { dot.style.left = x + 'px'; dot.style.top = y + 'px'; };
  window.__ripple = (x, y) => {
    const r = document.createElement('div');
    Object.assign(r.style, {
      position: 'fixed', left: x + 'px', top: y + 'px', width: '10px', height: '10px',
      marginLeft: '-5px', marginTop: '-5px', borderRadius: '50%',
      border: '3px solid rgba(45,140,255,0.9)', zIndex: 2147483647, pointerEvents: 'none',
      animation: 'none',
    });
    document.body.appendChild(r);
    r.animate(
      [{ width: '10px', height: '10px', marginLeft: '-5px', marginTop: '-5px', opacity: 1 },
       { width: '70px', height: '70px', marginLeft: '-35px', marginTop: '-35px', opacity: 0 }],
      { duration: 550, easing: 'ease-out' },
    ).onfinish = () => r.remove();
  };
})();
`;

async function cursorTo(page, selector) {
  const loc = page.locator(selector).first();
  await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  const box = await loc.boundingBox();
  if (!box) return;
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, box.height * 0.5);
  await page.evaluate(([x, y]) => window.__moveCursor(x, y), [x, y]);
  await page.mouse.move(x, y, { steps: 20 });
  return { x, y };
}

async function runAction(page, a) {
  switch (a.type) {
    case "wait":
      await page.waitForTimeout(a.ms);
      break;
    case "cursorTo":
      await cursorTo(page, a.selector);
      break;
    case "type": {
      const loc = page.locator(a.selector).first();
      await loc.click();
      await page.evaluate(() => window.__ripple && window.__ripple);
      await loc.pressSequentially(a.text, { delay: a.delay ?? 15 });
      break;
    }
    case "fill": {
      // instant, deterministic — used where per-keystroke timing would make a
      // scene's length too unpredictable (e.g. a long hex value)
      const pos = await cursorTo(page, a.selector);
      const loc = page.locator(a.selector).first();
      await loc.fill(a.text);
      if (pos) await page.evaluate(([x, y]) => window.__ripple(x, y), [pos.x, pos.y]);
      break;
    }
    case "click": {
      const pos = await cursorTo(page, a.selector);
      const loc = page.locator(a.selector).first();
      await loc.click();
      if (pos) await page.evaluate(([x, y]) => window.__ripple(x, y), [pos.x, pos.y]);
      break;
    }
    case "waitForSelector":
      await page.waitForSelector(a.selector, { timeout: a.timeout ?? 10000 }).catch(() => {});
      break;
    default:
      console.warn("unknown action", a.type);
  }
}

process.on("unhandledRejection", (e) => {
  console.error("UNHANDLED", e);
  process.exit(1);
});

console.log("launching chromium...");
const browser = await chromium.launch({ args: ["--disable-gpu"] });
console.log("chromium launched:", browser.version());
const manifest = [];

try {

// Warm up: the very first navigation in a fresh browser pays a one-off cold
// -start cost (DNS/TLS/disk-cache population) that would otherwise show up as
// several seconds of blank page at the start of scene 1's *recorded* video
// (recording starts at context creation, before goto). Pay that cost here, in
// a throwaway, unrecorded context, so every real scene loads fast.
{
  console.log("warm-up navigation...");
  const w0 = Date.now();
  const warmCtx = await browser.newContext({ viewport: cfg.viewport });
  const warmPage = await warmCtx.newPage();
  await warmPage.goto(cfg.url, { waitUntil: "load", timeout: 30000 }).catch((e) => {
    console.warn("  warm-up goto failed (continuing anyway):", e.message);
  });
  await warmCtx.close();
  console.log(`  warm-up done (+${Date.now() - w0}ms)`);
}

function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(`TIMEOUT after ${ms}ms: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

for (const scene of cfg.scenes) {
  const t0 = Date.now();
  console.log(`\n=== recording ${scene.id} ===`);
  const context = await withTimeout(
    browser.newContext({
      viewport: cfg.viewport,
      recordVideo: { dir: videoDir, size: cfg.viewport },
      deviceScaleFactor: 1,
    }),
    15000,
    "newContext",
  );
  await context.addInitScript(CURSOR_INIT);
  const page = await withTimeout(context.newPage(), 15000, "newPage");

  const url = cfg.url + (scene.hash ? `#${scene.hash}` : "");
  console.log(`  goto ${url}`);
  await withTimeout(
    page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }),
    22000,
    "goto",
  );
  console.log(`  loaded (+${Date.now() - t0}ms)`);
  if (scene.footer) {
    await page.evaluate(() => document.querySelector(".site-footer")?.scrollIntoView());
  }
  // let layout / fonts / live RPC reads settle before the clip "starts" being watched
  await page.waitForTimeout(500);

  for (const [i, a] of scene.actions.entries()) {
    await withTimeout(runAction(page, a), 20000, `action[${i}] ${a.type} ${a.selector ?? ""}`);
  }
  console.log(`  actions done (+${Date.now() - t0}ms)`);

  const video = page.video();
  await withTimeout(context.close(), 20000, "context.close"); // flushes the .webm to disk
  const savedPath = await video.path();
  const finalPath = path.join(videoDir, `${scene.id}.webm`);
  renameSync(savedPath, finalPath);
  manifest.push({ id: scene.id, file: finalPath, narration: scene.narration });
  console.log(`  -> ${finalPath}  (scene total ${Date.now() - t0}ms)`);
}
} finally {
  await browser.close().catch(() => {});
}

const fs = await import("node:fs/promises");
await fs.writeFile(path.join(here, "video-manifest.json"), JSON.stringify(manifest, null, 2));
console.log("\nAll scenes recorded.");
