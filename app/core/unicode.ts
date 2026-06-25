export function sanitizeUnicodeText(value: unknown): string {
  const text = String(value ?? "");
  let cleaned = "";
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        cleaned += text[i] + text[i + 1];
        i += 1;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    cleaned += text[i];
  }
  return cleaned;
}

export function sanitizeUnicodePayload(value: unknown): unknown {
  if (typeof value === "string") return sanitizeUnicodeText(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeUnicodePayload(item));
  if (value && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      cleaned[sanitizeUnicodeText(key)] = sanitizeUnicodePayload(item);
    }
    return cleaned;
  }
  return value;
}
