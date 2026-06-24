function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDate(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateTime(date = new Date()): string {
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function nowIsoSeconds(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "");
}

export function parseTwitterDatetime(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

export function profileDateKey(value: unknown): string {
  return formatDate(parseTwitterDatetime(value) ?? new Date());
}

export function profileTimeLabel(value: unknown): string {
  const dt = parseTwitterDatetime(value);
  return dt ? formatTime(dt) : "时间未知";
}
