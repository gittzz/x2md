import { appendFileSync, createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { logPath } from "./config.ts";

function logVideo(appDir: string | undefined, message: string): void {
  if (!appDir) return;
  try {
    const file = logPath(appDir);
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${new Date().toISOString()} ${message}\n`, "utf8");
  } catch {
    // ponytail: video download logging is best-effort; never break saving Markdown.
  }
}

export function downloadVideoAsync(url: string, savePath: string, filename: string, appDir?: string): void {
  void (async () => {
    logVideo(appDir, `视频下载开始：${filename}`);
    try {
      mkdirSync(savePath, { recursive: true });
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      await pipeline(Readable.fromWeb(response.body as any), createWriteStream(join(savePath, filename)));
      logVideo(appDir, `视频下载完成：${filename}`);
    } catch (error) {
      logVideo(appDir, `视频下载失败：${filename} ${error instanceof Error ? error.message : String(error)}`);
      console.error("视频流下载失败:", error);
    }
  })();
}
