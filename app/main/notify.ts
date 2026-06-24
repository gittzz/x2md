import { basename } from "node:path";

export function saveNotificationBody(saved: unknown): string {
  const files = Array.isArray(saved) ? saved.map(String) : [];
  if (files.length === 1) return basename(files[0]);
  return `已保存 ${files.length} 个文件`;
}

export async function notifySaveSuccess(cfg: Record<string, any>, result: Record<string, any>): Promise<void> {
  if (!cfg.enable_save_notification || !result.success || !Array.isArray(result.saved) || result.saved.length === 0) return;
  try {
    const { showNotification } = await import("electrobun/bun");
    showNotification({ title: "X2MD 保存成功", body: saveNotificationBody(result.saved), silent: true });
  } catch {
    // ponytail: notifications are optional; never fail saves outside Electrobun runtime.
  }
}
