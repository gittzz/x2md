export function sanitizeFilename(name: unknown, maxLen = 60): string {
  return String(name ?? "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function normalizeImageUrl(url: unknown): string {
  const raw = String(url ?? "");
  if (!raw || !raw.includes("pbs.twimg.com")) return raw;
  try {
    const parsed = new URL(raw);
    parsed.searchParams.set("name", "orig");
    return parsed.toString();
  } catch {
    return raw;
  }
}

export function normalizeArticleUrl(url: unknown): string {
  return String(url ?? "").trim().replace("twitter.com", "x.com").split("?")[0].replace(/\/+$/, "");
}

export function uniquePath(filepath: string): string {
  return filepath;
}
