export function sanitizeUnicodeText(value: unknown): string {
  return String(value ?? "").replace(/[\uD800-\uDFFF]/g, "");
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
