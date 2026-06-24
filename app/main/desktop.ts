import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

import { getAppDir, loadConfig, logPath } from "../core/config.ts";
import { log } from "./logger.ts";

let settingsWindow: any;

export function settingsUrl(appDir = getAppDir(), port?: number): string {
  return `views://settings/index.html#port=${encodeURIComponent(String(port || loadConfig(appDir).port || 9527))}`;
}

export async function showSettingsWindow(appDir = getAppDir(), port?: number): Promise<void> {
  try {
    const { BrowserWindow } = await import("electrobun/bun");
    if (settingsWindow) {
      settingsWindow.show?.();
      settingsWindow.activate?.();
      log("设置页已打开：复用现有窗口", appDir);
      return;
    }
    settingsWindow = new BrowserWindow({
      title: "X2MD 设置",
      url: settingsUrl(appDir, port),
      frame: { x: 120, y: 120, width: 760, height: 680 },
    });
    log("设置页已打开", appDir);
  } catch (error) {
    log(`设置页打开失败：${error instanceof Error ? error.message : String(error)}`, appDir);
    console.log("设置页需要在 Electrobun 运行时打开：http://127.0.0.1:9527/config");
  }
}

export function openPath(target: string, dryRun = false): void {
  if (!target) return;
  mkdirSync(target.endsWith(".log") ? dirname(target) : target, { recursive: true });
  if (dryRun) return;
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  spawn(command, [target], { detached: true, stdio: "ignore" }).unref();
}

export function openFirstSaveDir(appDir?: string, dryRun = false): void {
  const cfg = loadConfig(appDir);
  openPath(String(cfg.save_paths?.[0] || ""), dryRun);
}

export function openVideoDir(appDir?: string, dryRun = false): void {
  openPath(String(loadConfig(appDir).video_save_path || ""), dryRun);
}

export function openLog(appDir?: string, dryRun = false): void {
  const file = logPath(appDir);
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, "", "utf8");
  }
  openPath(file, dryRun);
}

export function bundledExtensionDirForExecutable(executable: string): string | null {
  if (!executable.includes(".app/Contents/MacOS/")) return null;
  return resolve(dirname(executable), "..", "Resources", "extension");
}

export function extensionDir(executable = process.execPath): string {
  const bundled = bundledExtensionDirForExecutable(executable);
  return bundled && existsSync(bundled) ? bundled : resolve("extension");
}

export function openExtensionDir(dryRun = false): void {
  openPath(extensionDir(), dryRun);
}

export function openConfiguredTarget(target: unknown, appDir?: string, dryRun = false): string {
  const key = String(target || "");
  if (key === "save") openFirstSaveDir(appDir, dryRun);
  else if (key === "video") openVideoDir(appDir, dryRun);
  else if (key === "log") openLog(appDir, dryRun);
  else if (key === "extension") openExtensionDir(dryRun);
  else throw new Error("不支持的打开目标");
  return key;
}
