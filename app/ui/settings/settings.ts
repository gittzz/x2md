const configuredPort = new URLSearchParams(location.search || location.hash.slice(1)).get("port") || "9527";
const api = `${location.protocol === "http:" ? location.origin : `http://127.0.0.1:${configuredPort}`}`;
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const field = (id: string) => $(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function setStatus(text: string): void {
  const status = document.getElementById("status");
  if (status) status.textContent = text;
}

function setServiceInfo(info: Record<string, any>): void {
  const node = document.getElementById("serviceInfo");
  if (!node) return;
  node.textContent = info.version
    ? `版本 ${info.version} · 端口 ${info.port} · 配置 ${info.config_path}`
    : "";
}

function parseCustomSavePaths(): Array<{ name: string; path: string }> {
  const raw = (field("customSavePaths") as HTMLTextAreaElement).value.trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("自定义保存路径必须是 JSON 数组");
  return parsed;
}

async function loadConfig(): Promise<void> {
  const response = await fetch(`${api}/config`);
  const cfg = await response.json();
  $("savePath").value = cfg.save_paths?.[0] || "";
  (field("customSavePaths") as HTMLTextAreaElement).value = JSON.stringify(cfg.custom_save_paths || [], null, 2);
  $("videoPath").value = cfg.video_save_path || "";
  $("enableVideoDownload").checked = Boolean(cfg.enable_video_download);
  $("enableSaveNotification").checked = Boolean(cfg.enable_save_notification);
  $("videoThreshold").value = cfg.video_duration_threshold || 5;
  $("port").value = cfg.port || 9527;
  $("filenameFormat").value = cfg.filename_format || "{summary}_{date}_{author}";
  $("maxFilenameLength").value = cfg.max_filename_length || 60;
  (field("profileRange") as HTMLSelectElement).value = cfg.profile_capture_range || "today";
  $("profileCustomDays").value = cfg.profile_capture_custom_days || 7;
  $("profileSavePath").value = cfg.profile_capture_save_path || "";
  $("showSiteSaveIcon").checked = Boolean(cfg.show_site_save_icon);
  $("showProfileCapture").checked = Boolean(cfg.show_x_profile_capture_button);
  const status = await fetch(`${api}/status`).then((res) => res.json()).catch(() => ({}));
  setServiceInfo(status);
  const ping = status.version ? status : await fetch(`${api}/ping`).then((res) => res.json()).catch(() => ({}));
  const autostart = await fetch(`${api}/autostart`).then((res) => res.json()).catch(() => ({}));
  $("autostart").checked = Boolean(autostart.enabled);
  setStatus(`服务已连接${ping.version ? `：${ping.version}` : ""}`);
}

async function saveConfig(): Promise<void> {
  let customSavePaths: Array<{ name: string; path: string }>;
  try {
    customSavePaths = parseCustomSavePaths();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
    return;
  }

  const payload = {
    save_paths: [$("savePath").value.trim()].filter(Boolean),
    custom_save_paths: customSavePaths,
    video_save_path: $("videoPath").value.trim(),
    enable_video_download: $("enableVideoDownload").checked,
    enable_save_notification: $("enableSaveNotification").checked,
    video_duration_threshold: Number($("videoThreshold").value || 5),
    port: Number($("port").value || 9527),
    filename_format: $("filenameFormat").value.trim() || "{summary}_{date}_{author}",
    max_filename_length: Number($("maxFilenameLength").value || 60),
    profile_capture_range: (field("profileRange") as HTMLSelectElement).value,
    profile_capture_custom_days: Number($("profileCustomDays").value || 7),
    profile_capture_save_path: $("profileSavePath").value.trim(),
    show_site_save_icon: $("showSiteSaveIcon").checked,
    show_x_profile_capture_button: $("showProfileCapture").checked,
    setup_completed: true,
  };
  const response = await fetch(`${api}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  setStatus(response.ok ? (result.restart_required ? "设置已保存，端口变更需重启服务" : "设置已保存") : "保存失败");
}

async function openTarget(target: string): Promise<void> {
  const response = await fetch(`${api}/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  });
  setStatus(response.ok ? "已打开" : "打开失败");
}

async function updateAutostart(): Promise<void> {
  const response = await fetch(`${api}/autostart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: $("autostart").checked }),
  });
  const result = await response.json().catch(() => ({}));
  $("autostart").checked = Boolean(result.enabled);
  setStatus(response.ok ? (result.enabled ? "已开启开机自动运行" : "已关闭开机自动运行") : "自启设置失败");
}

async function showLog(): Promise<void> {
  const view = document.getElementById("logView") as HTMLPreElement | null;
  if (!view) return;
  const response = await fetch(`${api}/log`);
  const result = await response.json().catch(() => ({}));
  view.hidden = false;
  view.textContent = result.log || "暂无日志";
  setStatus(response.ok ? "已刷新日志" : "日志读取失败");
}

$("save").addEventListener("click", () => void saveConfig());
$("autostart").addEventListener("change", () => void updateAutostart());
$("openSave").addEventListener("click", () => void openTarget("save"));
$("openVideo").addEventListener("click", () => void openTarget("video"));
$("openLog").addEventListener("click", () => void openTarget("log"));
$("showLog").addEventListener("click", () => void showLog());
$("openExtension").addEventListener("click", () => {
  const help = document.getElementById("extensionHelp");
  if (help) help.hidden = !help.hidden;
  void openTarget("extension");
});
$("test").addEventListener("click", async () => {
  const response = await fetch(`${api}/ping`);
  const data = await response.json();
  setStatus(response.ok ? `服务正常：${data.version}` : "服务不可用");
});

loadConfig().catch((error) => setStatus(`连接失败：${error.message}`));
