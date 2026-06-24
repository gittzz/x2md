import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, execFileSync } from "node:child_process";

const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!existsSync(chrome)) throw new Error("Google Chrome not found");
const appExtension = "build/stable-macos-arm64/X2MD.app/Contents/Resources/extension";
const extensionDir = resolve(process.env.X2MD_SMOKE_EXTENSION_DIR || (existsSync(join(appExtension, "manifest.json")) ? appExtension : "extension"));
if (!existsSync(join(extensionDir, "manifest.json"))) throw new Error(`extension manifest missing: ${extensionDir}`);

const profile = mkdtempSync(join(tmpdir(), "x2md-chrome-profile-"));
const debugPort = 22000 + Math.floor(Math.random() * 1000);
const child = spawn(chrome, [
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${debugPort}`,
  `--load-extension=${extensionDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}
function killTree(pid) {
  try {
    for (const childPid of execFileSync("pgrep", ["-P", String(pid)], { encoding: "utf8" }).trim().split("\n").filter(Boolean).map(Number)) killTree(childPid);
  } catch {}
  try { process.kill(pid, "SIGTERM"); } catch {}
}

try {
  for (let i = 0; i < 60; i += 1) {
    try { await json(`http://127.0.0.1:${debugPort}/json/version`); break; }
    catch { await sleep(250); }
  }
  let worker;
  for (let i = 0; i < 60; i += 1) {
    const targets = await json(`http://127.0.0.1:${debugPort}/json/list`);
    worker = targets.find((target) => String(target.url || "").endsWith("/service_worker.js"));
    if (worker) break;
    await sleep(250);
  }
  if (!worker) throw new Error("X2MD extension service_worker not found");
  const manifest = JSON.parse(readFileSync(join(extensionDir, "manifest.json"), "utf8"));
  if (manifest.name !== "X2MD - 网页内容转Markdown" || manifest.action?.default_popup !== "popup.html" || manifest.options_page !== "options.html") {
    throw new Error(`unexpected extension manifest: ${JSON.stringify({ name: manifest.name, popup: manifest.action?.default_popup, options: manifest.options_page })}`);
  }
  const extensionId = new URL(worker.url).host;
  if (!extensionId || !worker.url.endsWith("/service_worker.js")) throw new Error(`unexpected extension worker: ${worker.url}`);
  console.log(`chrome extension load smoke ok: id=${extensionId} dir=${extensionDir}`);
} finally {
  killTree(child.pid);
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
