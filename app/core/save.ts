import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { resolveSavePathsForRequest, type X2MDConfig } from "./config.ts";
import { sanitizeFilename } from "./filenames.ts";
import { buildMarkdown } from "./markdown.ts";
import { sanitizeUnicodeText } from "./unicode.ts";

function timestamp(): string {
  return new Date().toTimeString().slice(0, 8).replace(/:/g, "");
}

export function savePayload(data: Record<string, any>, cfg: X2MDConfig | Record<string, any>, appDir?: string): Record<string, any> {
  const [savePaths] = resolveSavePathsForRequest(cfg, data);
  if (!savePaths.length) return { success: false, errors: ["未配置保存路径"] };

  const [filename, content] = buildMarkdown(data, cfg, appDir);
  const safeFilename = sanitizeUnicodeText(sanitizeFilename(filename, Number(cfg.max_filename_length || 100))) || "untitled";
  const safeContent = sanitizeUnicodeText(content);
  const saved: string[] = [];
  const errors: string[] = [];

  for (const savePath of savePaths) {
    try {
      mkdirSync(savePath, { recursive: true });
      let filepath = join(savePath, `${safeFilename}.md`);
      if (existsSync(filepath)) filepath = join(savePath, `${safeFilename}_${timestamp()}.md`);
      writeFileSync(filepath, safeContent, "utf8");
      saved.push(filepath);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return saved.length ? { success: true, saved, errors } : { success: false, errors };
}
