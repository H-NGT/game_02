import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "artifacts");
const port = 5173;
const baseUrl = `http://127.0.0.1:${port}/`;
const chromePath =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

mkdirSync(outDir, { recursive: true });

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await wait(250);
    }
  }
  throw new Error("Vite server did not become ready");
}

function startServer() {
  const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
  return spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function analyzePng(file) {
  const png = PNG.sync.read(readFileSync(file));
  let bright = 0;
  let green = 0;
  let red = 0;
  let yellow = 0;
  let arenaYellow = 0;
  for (let y = 0; y < png.height; y += 3) {
    for (let x = 0; x < png.width; x += 3) {
      const i = (png.width * y + x) << 2;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      if (r + g + b > 520) bright += 1;
      if (g > r + 35 && g > b + 20) green += 1;
      if (r > g + 25 && r > b + 25) red += 1;
      if (r > 170 && g > 125 && b < 115) yellow += 1;
      if (x < png.width * 0.66 && y > png.height * 0.22 && r > 170 && g > 125 && b < 115) {
        arenaYellow += 1;
      }
    }
  }
  return { width: png.width, height: png.height, bright, green, red, yellow, arenaYellow };
}

function flatten(paths) {
  return paths.flatMap((pathPoints) => pathPoints);
}

function maxTraceError(trace) {
  const source = flatten(trace.sourceNormalized);
  const generated = flatten(trace.generatedNormalized);
  if (source.length !== generated.length || source.length < 2) {
    return Number.POSITIVE_INFINITY;
  }
  return source.reduce((max, point, index) => {
    const other = generated[index];
    return Math.max(max, Math.hypot(point.x - other.x, point.y - other.y));
  }, 0);
}

async function drawPath(page, points) {
  const box = await page.locator("#drawCanvas").boundingBox();
  const toViewport = (point) => ({
    x: box.x + point.x * box.width,
    y: box.y + point.y * box.height,
  });
  const first = toViewport(points[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const point of points.slice(1)) {
    const next = toViewport(point);
    await page.mouse.move(next.x, next.y, { steps: 4 });
  }
  await page.mouse.up();
}

async function runPattern(page, name, points) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#drawCanvas");
  await drawPath(page, points);

  const drawingPixels = await page.evaluate(() => {
    const canvas = document.querySelector("#drawCanvas");
    const ctx = canvas.getContext("2d");
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let yellow = 0;
    for (let i = 0; i < image.length; i += 4) {
      if (image[i] > 180 && image[i + 1] > 130 && image[i + 2] < 130 && image[i + 3] > 0) {
        yellow += 1;
      }
    }
    return yellow;
  });
  if (drawingPixels < 900) {
    throw new Error(`${name}: drawing canvas did not receive enough ink (${drawingPixels})`);
  }

  await page.click("#attackBtn");
  await page.waitForTimeout(350);

  const trace = await page.evaluate(() => window.__gameDebug.getWeaponTrace());
  const traceError = maxTraceError(trace);
  if (traceError > 0.000001) {
    throw new Error(`${name}: generated weapon trace diverged from drawing (${traceError})`);
  }
  if (trace.meshCount < flatten(trace.sourceNormalized).length) {
    throw new Error(`${name}: weapon mesh count is too low (${trace.meshCount})`);
  }
  if (trace.reach < 1.2) {
    throw new Error(`${name}: weapon reach is unexpectedly short (${trace.reach})`);
  }

  await page.waitForTimeout(900);
  const state = await page.evaluate(() => window.__gameDebug.getState());
  const playerDistance = Math.hypot(state.playerPosition[0] + 1.8, state.playerPosition[2]);
  const enemyDistance = Math.hypot(state.enemyPosition[0] - 1.8, state.enemyPosition[2]);
  if (playerDistance + enemyDistance < 0.18) {
    throw new Error(`${name}: combat movement is too slow (${playerDistance + enemyDistance})`);
  }
  if (state.playerSpeed + state.enemySpeed < 0.1 && state.phase === "attack") {
    throw new Error(`${name}: fighters have too little active speed`);
  }

  const screenshot = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  const pixels = analyzePng(screenshot);
  if (
    pixels.bright < 800 ||
    pixels.green < 120 ||
    pixels.red < 40 ||
    pixels.yellow < 20 ||
    pixels.arenaYellow < 18
  ) {
    throw new Error(`${name}: screenshot does not show arena, fighters, and weapon ${JSON.stringify(pixels)}`);
  }

  return { name, traceError, meshCount: trace.meshCount, reach: trace.reach, state, pixels, screenshot };
}

async function runMobilePhoneFlow(page, viewport, points) {
  const name = `mobile-${viewport.width}x${viewport.height}`;
  await page.setViewportSize(viewport);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#drawCanvas");
  await drawPath(page, points);

  const drawLayout = await page.evaluate(() => ({
    layout: window.__gameDebug.getLayout(),
    buttons: [...document.querySelectorAll(".controls button")].map((button) => ({
      text: button.textContent,
      clientWidth: button.clientWidth,
      scrollWidth: button.scrollWidth,
      height: button.getBoundingClientRect().height,
    })),
  }));
  if (drawLayout.layout.panel.height > viewport.height * 0.46) {
    throw new Error(`${name}: draw sheet is too tall ${JSON.stringify(drawLayout.layout.panel)}`);
  }
  if (drawLayout.layout.drawCanvas.display === "none" || drawLayout.layout.drawCanvas.height < 110) {
    throw new Error(`${name}: draw canvas is not usable ${JSON.stringify(drawLayout.layout.drawCanvas)}`);
  }
  if (drawLayout.buttons.some((button) => button.scrollWidth > button.clientWidth + 1 || button.height < 40)) {
    throw new Error(`${name}: mobile buttons overflow or are too small ${JSON.stringify(drawLayout.buttons)}`);
  }

  const drawScreenshot = path.join(outDir, `${name}-draw.png`);
  await page.screenshot({ path: drawScreenshot, fullPage: true });

  await page.click("#attackBtn");
  await page.waitForTimeout(1150);
  const attackLayout = await page.evaluate(() => window.__gameDebug.getLayout());
  if (attackLayout.phase !== "attack") {
    throw new Error(`${name}: expected attack phase, got ${attackLayout.phase}`);
  }
  if (attackLayout.panel.height > 50 || attackLayout.panel.y < viewport.height - 62) {
    throw new Error(`${name}: attack sheet still covers combat ${JSON.stringify(attackLayout.panel)}`);
  }
  if (attackLayout.drawCanvas.display !== "none" || attackLayout.controls.display !== "none") {
    throw new Error(`${name}: draw controls are still visible during combat ${JSON.stringify(attackLayout)}`);
  }
  const visibleFightHeight = attackLayout.panel.y - attackLayout.statusBottom;
  if (visibleFightHeight < viewport.height * 0.58) {
    throw new Error(`${name}: visible combat area too small (${visibleFightHeight})`);
  }

  const attackScreenshot = path.join(outDir, `${name}-attack.png`);
  await page.screenshot({ path: attackScreenshot, fullPage: true });
  const pixels = analyzePng(attackScreenshot);
  if (pixels.green < 120 || pixels.red < 40 || pixels.arenaYellow < 10) {
    throw new Error(`${name}: mobile combat screenshot lacks visible fighters/weapon ${JSON.stringify(pixels)}`);
  }

  return { name, drawLayout: drawLayout.layout, attackLayout, pixels, screenshots: [drawScreenshot, attackScreenshot] };
}

const server = startServer();
const serverLog = [];
server.stdout.on("data", (chunk) => serverLog.push(chunk.toString()));
server.stderr.on("data", (chunk) => serverLog.push(chunk.toString()));

try {
  await waitForServer();
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  const parts = await page.goto(baseUrl, { waitUntil: "networkidle" }).then(() =>
    page.evaluate(() => window.__gameDebug.getFighterParts()),
  );
  if (parts.player.length < 5 || parts.enemy.length < 5) {
    throw new Error(`human fighter parts missing: ${JSON.stringify(parts)}`);
  }

  const results = [];
  results.push(
    await runPattern(page, "zigzag-weapon", [
      { x: 0.11, y: 0.72 },
      { x: 0.28, y: 0.2 },
      { x: 0.46, y: 0.63 },
      { x: 0.65, y: 0.26 },
      { x: 0.88, y: 0.54 },
    ]),
  );
  results.push(
    await runPattern(page, "hook-weapon", [
      { x: 0.12, y: 0.52 },
      { x: 0.32, y: 0.34 },
      { x: 0.56, y: 0.3 },
      { x: 0.78, y: 0.44 },
      { x: 0.72, y: 0.68 },
      { x: 0.48, y: 0.74 },
    ]),
  );
  results.push(
    await runMobilePhoneFlow(
      page,
      { width: 390, height: 844 },
      [
        { x: 0.12, y: 0.68 },
        { x: 0.31, y: 0.28 },
        { x: 0.52, y: 0.58 },
        { x: 0.82, y: 0.22 },
      ],
    ),
  );
  results.push(
    await runMobilePhoneFlow(
      page,
      { width: 360, height: 740 },
      [
        { x: 0.14, y: 0.58 },
        { x: 0.36, y: 0.33 },
        { x: 0.62, y: 0.37 },
        { x: 0.8, y: 0.62 },
      ],
    ),
  );

  await browser.close();
  if (errors.length) {
    throw new Error(`browser errors:\n${errors.join("\n")}`);
  }
  writeFileSync(path.join(outDir, "e2e-results.json"), `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error(error.message);
  if (serverLog.length) console.error(serverLog.join(""));
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
