# PRD：X2MD Electrobun 架构替换与轻量化重构

版本：v0.1
日期：2026-06-24
状态：待评审
目标版本：X2MD v2.0 / X2MD Lite

## Problem Statement

当前 X2MD 的 Mac 桌面端通过 Python + PyInstaller 打包。业务代码本身不大，但打包产物会携带 Python runtime、Pillow、Tcl/Tk、pystray 等运行时与动态库，导致 Mac 分发包约 60MB、解压后 `.app` 约 162MB。用户感知上，一个主要负责本地保存 Markdown、管理配置和常驻托盘的工具显得过于臃肿。

同时，当前桌面端的职责混杂：

- 本地 HTTP 服务负责接收 Chrome 扩展请求并写入 Markdown。
- 托盘程序负责启动服务、显示菜单、打开日志、控制开机启动。
- tkinter 设置向导负责首次配置。
- PyInstaller 同时承担跨平台打包与运行时封装。

这些职责都围绕“Chrome 扩展 + 本地服务 + 设置入口”展开，并不需要完整 Electron 或重型 Python GUI 包。Electrobun 提供 Bun/TypeScript 主进程、系统 WebView 渲染、原生菜单/托盘/通知和较小分发体积，适合作为 X2MD 的下一代桌面运行机制。

本 PRD 要解决的问题是：在不牺牲现有核心保存能力的前提下，把 X2MD 从 PyInstaller Python 桌面应用重构为 Electrobun + TypeScript/Bun 本地应用，降低包体积、减少运行时依赖、提升启动速度，并为后续桌面体验升级建立更清晰的架构。

## Solution

将 X2MD 桌面端整体替换为 Electrobun 架构：

- 用 Bun/TypeScript 实现本地 HTTP API 服务，兼容现有 Chrome 扩展调用协议。
- 用 Electrobun 系统 WebView 承载设置页、首次运行引导、日志查看和状态页。
- 用 Electrobun 原生能力实现菜单栏/托盘入口、通知、打开目录、打开日志、开机启动控制。
- 保留现有 Chrome 扩展作为核心采集端，优先保持扩展 API 不变。
- 将原 Python `server.py` 中的 Markdown 生成、文件命名、路径选择、视频下载、博主批量抓取状态等逻辑迁移为 TypeScript 模块。
- 移除 PyInstaller、Pillow、pystray、tkinter 作为 Mac 主分发路径。
- Mac 优先交付；Windows 作为同架构后续兼容目标。

从用户视角，新版仍然是：

1. 下载并打开 X2MD。
2. 首次打开时完成保存目录、视频目录、端口等设置。
3. 安装或打开 Chrome 扩展。
4. 在 X/Twitter、LINUX DO、飞书、微信公众号点击保存。
5. 内容继续保存为 Obsidian 可用 Markdown。

但内部从：

```text
Chrome 扩展 → Python HTTP 服务 → 文件系统
              ↑
      PyInstaller 托盘 App + tkinter 向导
```

替换为：

```text
Chrome 扩展 → Bun HTTP 服务 → TypeScript 保存核心 → 文件系统
              ↑
      Electrobun 菜单栏 App + WebView 设置页
```

## Goals

1. Mac 分发包明显小于当前 PyInstaller 版本。
2. App 启动到本地服务可用的时间明显缩短。
3. Chrome 扩展调用协议保持向后兼容。
4. 现有 Markdown 输出格式保持兼容，避免用户知识库出现不可控格式变化。
5. 设置、日志、自启、打开目录等桌面能力迁移到 Electrobun。
6. CI 可以构建新版 Mac 包和 Chrome 扩展包。
7. 迁移后代码结构比当前更清晰，桌面壳、服务 API、保存核心、扩展采集逻辑分离。

## Non-Goals

1. 本 PRD 不重写 Chrome 扩展的站点采集逻辑，除非为了 API 兼容需要极小改动。
2. 本 PRD 不新增新的内容来源平台。
3. 本 PRD 不改变用户现有保存目录结构和 Front Matter 语义。
4. 本 PRD 不引入 Electron。
5. 本 PRD 不要求第一版实现应用商店分发。
6. 本 PRD 不要求第一版实现自动更新；可以预留 Electrobun 更新能力接口。
7. 本 PRD 不要求第一版完全移除 Python 源码；可以在迁移期保留 Python 版本作为回滚路径。

## User Stories

1. 作为 Mac 用户，我想下载更小的 X2MD 安装包，所以可以更快下载和分发。
2. 作为 Mac 用户，我想双击 X2MD 后服务快速可用，所以不需要等待笨重运行时启动。
3. 作为 X2MD 老用户，我想升级后继续使用原来的保存目录，所以不会破坏我的 Obsidian 工作流。
4. 作为 X2MD 老用户，我想现有 Chrome 扩展继续能保存内容，所以升级桌面端不会迫使我立刻重装扩展。
5. 作为 X/Twitter 收藏用户，我想保存 Tweet、Thread、Article 的 Markdown 输出格式保持一致，所以历史内容和新内容能混在同一个资料库中使用。
6. 作为内容创作者，我想图片、视频、alt 文本和引用推文继续正确保存，所以迁移后不会损失素材完整性。
7. 作为 LINUX DO 用户，我想论坛话题帖子继续一键保存，所以迁移桌面端不影响站点能力。
8. 作为飞书用户，我想 wiki/docx 内容继续能保存为 Markdown，所以团队资料留档流程不中断。
9. 作为微信公众号用户，我想公众号文章继续能保存为 Markdown，所以不需要额外工具。
10. 作为重度用户，我想设置多个保存路径和自定义保存路径，所以不同素材可以进入不同 Obsidian 文件夹。
11. 作为重度用户，我想博主主页批量抓取继续能按日期聚合并跳过重复项，所以可以持续沉淀博主内容。
12. 作为用户，我想在菜单栏看到服务是否运行，所以遇到保存失败时能快速判断问题。
13. 作为用户，我想从菜单栏打开设置页，所以不用手动找配置文件。
14. 作为用户，我想从菜单栏打开日志，所以保存失败时可以快速定位原因。
15. 作为用户，我想从菜单栏打开扩展目录，所以安装 Chrome 扩展更容易。
16. 作为用户，我想控制开机自动运行，所以 X2MD 能随 Mac 登录自动待命。
17. 作为用户，我想关闭开机自动运行后不再残留旧启动项，所以不会出现端口占用和双服务问题。
18. 作为用户，我想配置页面使用熟悉的浏览器式界面，所以不再受 tkinter 窗口样式限制。
19. 作为用户，我想配置保存后立即生效，所以不需要重启整个 App。
20. 作为用户，我想服务端口仍默认使用 9527，所以 Chrome 扩展和文档说明不需要大改。
21. 作为用户，我想访问 `/ping` 仍返回服务状态，所以扩展能继续做健康检查。
22. 作为用户，我想访问 `/config` 仍能读取和保存配置，所以扩展设置页能继续工作。
23. 作为开发者，我想核心保存逻辑有单元测试，所以迁移语言后可以验证输出一致性。
24. 作为开发者，我想迁移过程中有 golden fixture 对比，所以能确认 Python 旧版和 TypeScript 新版生成的 Markdown 一致。
25. 作为开发者，我想保留旧 Python 实现作为参考和回滚路径，所以迁移风险可控。
26. 作为发布者，我想 CI 自动构建 Electrobun Mac 包，所以发布流程可重复。
27. 作为发布者，我想 Release 仍包含 Mac 包、Windows 包和扩展包，所以用户下载路径稳定。
28. 作为维护者，我想桌面壳和保存核心分离，所以后续替换 UI 或 API 不影响 Markdown 逻辑。
29. 作为维护者，我想配置 schema 明确，所以新增设置项不会造成兼容混乱。
30. 作为维护者，我想日志格式清晰，所以用户反馈问题时能提供有用信息。
31. 作为安全敏感用户，我想本地服务仍只监听 `127.0.0.1`，所以不会暴露到局域网。
32. 作为安全敏感用户，我想本地 API 不接受任意外部危险操作，所以扩展之外的网页不能轻易滥用文件写入能力。
33. 作为用户，我想首次运行时自动创建默认目录，所以新手可以快速完成第一条保存。
34. 作为用户，我想配置迁移自动读取旧版配置，所以升级后不需要重新设置保存路径。
35. 作为用户，我想看到当前版本号，所以反馈问题和检查更新时更明确。
36. 作为用户，我想服务崩溃后菜单栏能提示异常，所以不会误以为内容已经保存。
37. 作为用户，我想保存成功后能收到可选通知，所以知道文件已落地。
38. 作为用户，我想保存失败时扩展提示错误原因，所以能知道是服务未启动、路径无权限还是内容解析失败。
39. 作为用户，我想视频下载继续异步执行，所以保存 Markdown 不被大视频阻塞。
40. 作为用户，我想长视频阈值逻辑继续存在，所以不会意外下载过大的视频。

## Implementation Decisions

### 1. 桌面运行时选择

- 采用 Electrobun 作为新桌面壳。
- 主进程使用 Bun/TypeScript。
- UI 使用系统 WebView，不捆绑 Chromium/CEF 作为默认模式。
- CEF 仅作为未来兼容性选项，不进入第一版目标。
- Mac 作为第一交付平台；Windows 保留架构兼容，不阻塞 Mac v2.0。

### 2. 保留 Chrome 扩展为采集端

- 现有 Chrome 扩展继续负责站点 DOM/API 采集。
- 扩展侧 `content.js`、`background.js`、站点解析模块原则上不重写。
- 新服务必须兼容现有扩展请求：`GET /ping`、`GET /config`、`POST /config`、`POST /save`、`GET /autostart`、`POST /autostart`、`GET /profile-capture/state`、`POST /profile-capture`。
- 如需扩展新增能力，应采用向后兼容字段，不破坏旧协议。

### 3. 本地 HTTP API

新版 Bun 服务默认监听：

```text
127.0.0.1:9527
```

API 合约保持：

- `GET /ping`
  - 返回服务状态和版本。
- `GET /config`
  - 返回完整配置。
- `POST /config`
  - 合并更新配置并持久化。
- `GET /autostart`
  - 返回开机启动状态。
- `POST /autostart`
  - 切换开机启动。
- `POST /save`
  - 接收扩展采集的数据，生成并写入 Markdown。
- `POST /profile-capture`
  - 批量保存博主主页推文/文章。
- `GET /profile-capture/state`
  - 返回指定 handle 的去重状态。

API 响应继续使用 JSON，继续支持 CORS 预检。第一版可保持 `Access-Control-Allow-Origin: *` 以兼容扩展，后续可以收紧到 Chrome 扩展 origin 或增加本地 token。

### 4. 配置与状态文件

继续使用用户级应用目录：

```text
~/Library/Application Support/X2MD
```

保留文件语义：

- `config.json`：用户配置。
- `profile_capture_state.json`：博主批量抓取去重状态。
- `x2md.log`：应用日志。

新版必须能读取旧版 `config.json`，并补齐新增默认值。配置字段至少包含：

- `save_paths`
- `custom_save_paths`
- `filename_format`
- `max_filename_length`
- `video_save_path`
- `enable_video_download`
- `video_duration_threshold`
- `show_site_save_icon`
- `show_x_profile_capture_button`
- `profile_capture_range`
- `profile_capture_custom_days`
- `profile_capture_save_path`
- `port`
- `setup_completed`

### 5. 保存核心迁移

将 Python 服务中的核心能力迁移为 TypeScript 模块：

- 配置加载、合并、保存。
- Unicode 清洗。
- 文件名生成和非法字符处理。
- Markdown Front Matter 生成。
- Tweet Markdown 生成。
- Article Markdown 生成。
- Quote Tweet 渲染。
- 图片 URL `name=orig` 规范化。
- 图片 alt 文本写入。
- 视频 URL 选择、引用和异步下载。
- 自定义保存路径校验。
- 重名文件追加时间戳。
- 博主主页批量抓取、按日聚合、文章单文件保存、去重状态更新。

迁移原则：先行为等价，再考虑重构优化。

### 6. 设置页替代 tkinter

- 移除 tkinter 首次设置向导。
- 使用 Electrobun WebView 提供设置页。
- 设置页可复用扩展 options 页的视觉和字段设计，但运行在桌面 App 内。
- 首次运行时自动打开设置页。
- 设置页保存后调用本地 API 更新配置。
- 设置页应提供打开目录、测试服务、打开 Chrome 扩展安装说明等入口。

### 7. 菜单栏/托盘能力

Electrobun 桌面壳需要提供菜单栏或托盘菜单：

- 服务状态。
- 打开设置。
- 打开保存目录。
- 打开视频目录。
- 打开扩展目录。
- 打开日志。
- 重启服务。
- 开机自动运行开关。
- 退出 X2MD。

服务状态应来自主进程内服务实例，而不是只依赖 HTTP 自检。

### 8. 开机启动

- Mac 继续使用 LaunchAgent。
- 新 label 建议继续使用 `com.x2md.app`，避免用户侧出现多个新权限项。
- 启用新版自启时，应清理旧版 `com.x2md.server` 和旧 Python 路径启动项。
- LaunchAgent 指向新版 Electrobun app 或其可执行入口。
- `GET/POST /autostart` 语义保持兼容。

### 9. 日志

- 日志继续写入用户应用目录或 `~/Library/Logs`。
- 日志至少记录：启动、监听端口、配置路径、保存请求摘要、保存成功文件、保存失败原因、视频下载开始/完成/失败、自启变更。
- 菜单栏提供打开日志。
- 用户隐私内容不应完整刷屏记录；保存请求日志只记录类型、平台、URL 摘要。

### 10. 分发产物

Mac v2.0 目标产物：

- `X2MD_Mac.zip`：Electrobun `.app`。
- `X2MD_Extension.zip`：Chrome 扩展。
- `SHA256SUMS.txt`。

迁移期可保留：

- `X2MD_Mac_Python_Legacy.zip` 或 release note 中提供旧版回滚链接。

### 11. CI/CD

- 新增 Bun 安装步骤。
- 新增 Electrobun 构建步骤。
- Mac workflow 产出 Electrobun `.app`。
- Chrome 扩展构建流程保持不变。
- Python/PyInstaller 构建可在迁移期保留为 legacy job，稳定后移除或手动触发。

### 12. 项目结构建议

建议新增：

```text
app/
  main/
    index.ts
    http-server.ts
    tray.ts
    autostart.ts
    logger.ts
  core/
    config.ts
    markdown.ts
    filenames.ts
    unicode.ts
    media.ts
    profile-capture.ts
    save.ts
  ui/
    settings/
      index.html
      settings.ts
      styles.css
  tests/
    fixtures/
    *.test.ts
```

保留：

```text
extension/
docs/
release/
```

迁移期保留：

```text
server.py
tray_app.py
setup_wizard.py
autostart.py
x2md.spec
```

稳定后再决定是否移动到 `legacy/python/`。

### 13. 兼容策略

- v2.0 默认读取旧配置文件。
- 如果旧版本正在运行并占用端口，新版应提示用户退出旧版，而不是静默失败。
- 如果旧 LaunchAgent 存在，新版启用自启时应清理或覆盖。
- 如果用户已有 Chrome 扩展，新服务应直接可用。
- 如果扩展版本较旧，新服务仍应处理旧 payload。

### 14. 安全边界

- 本地服务仅监听 `127.0.0.1`。
- 文件写入路径必须来自配置中的保存路径或请求中匹配配置的自定义保存路径。
- `custom_save_path` 必须通过配置白名单验证，不能允许任意网页请求写任意路径。
- 日志不记录完整敏感正文。
- 后续可增加扩展共享密钥或本机 token，但第一版不强制，以免破坏兼容。

## Testing Decisions

### 测试原则

- 优先测试外部行为，不测试内部实现细节。
- 迁移期间以 Python 旧实现输出作为 golden baseline。
- HTTP API 测试覆盖扩展真实调用路径。
- 文件系统测试使用临时目录，不写入用户真实资料库。
- 桌面 UI 只测试关键用户路径，不做脆弱截图测试。

### 单元测试

需要覆盖：

1. 配置加载与默认值补齐。
2. 自定义保存路径选择和拒绝未知路径。
3. Unicode 清洗。
4. 文件名格式化和长度限制。
5. Tweet Markdown 输出。
6. Article Markdown 输出。
7. 图片 URL orig 规范化。
8. 图片 alt 文本输出。
9. Quote Tweet 输出。
10. 视频 Markdown 引用和异步下载任务创建。
11. 博主主页按日聚合。
12. 博主主页重复项跳过。
13. 文章批量抓取单文件保存。
14. 配置 schema 兼容旧字段。
15. LaunchAgent plist 生成内容。

### API 集成测试

需要覆盖：

1. `GET /ping` 返回 200 和版本。
2. `GET /config` 返回配置。
3. `POST /config` 更新配置并持久化。
4. `POST /save` 写入 Markdown 文件。
5. `POST /save` 对未知自定义路径返回错误。
6. `POST /profile-capture` 写入批量抓取结果。
7. `GET /profile-capture/state` 返回去重状态。
8. `GET/POST /autostart` 在测试模式下不真实修改系统但验证调用结果。
9. CORS OPTIONS 返回兼容扩展的头。
10. 端口占用时给出明确错误。

### 回归测试

复用现有测试意图：

- Python `tests/test_custom_save_paths.py` 对应 TypeScript 保存路径测试。
- Python `tests/test_profile_capture.py` 对应 TypeScript 博主抓取测试。
- Python `tests/test_translation_override.py` 对应 TypeScript Markdown 输出测试。
- JS 扩展测试继续保留，确保站点采集逻辑不因服务迁移受影响。

### Golden Fixture 测试

建立 fixtures：

- 单条 Tweet。
- Thread。
- Article with images。
- Article with code block。
- Quote Tweet with alt text。
- 视频 Tweet。
- 飞书文档 payload。
- 微信公众号 payload。
- LINUX DO payload。
- 博主主页 tweets payload。
- 博主主页 articles payload。

每个 fixture 应验证：

- 输出文件名。
- Front Matter。
- Markdown 正文关键段落。
- 图片/视频引用。
- 重复文件处理。

### 手动验收测试

Mac 上需要手动验证：

1. 首次打开显示设置页。
2. 设置默认保存路径并保存。
3. Chrome 扩展访问 `/ping` 成功。
4. X/Twitter 单条保存成功。
5. X Article 保存成功，代码块不丢失。
6. LINUX DO 保存成功。
7. 飞书保存成功。
8. 微信公众号保存成功。
9. 菜单栏打开日志成功。
10. 菜单栏打开扩展目录成功。
11. 开启开机启动后 plist 正确生成。
12. 关闭开机启动后 plist 移除。
13. 重启 Mac 或模拟登录后服务自动可用。
14. 旧 Python 版未运行时新版无端口冲突。
15. 旧 Python 版运行时新版有明确提示。

## Migration Plan

### Phase 0：基线锁定

- 记录当前 Mac 包体积、解压体积、冷启动时间。
- 记录当前 `/ping` 可用时间。
- 生成核心 payload fixtures。
- 用当前 Python 版本生成 golden Markdown 输出。

验收标准：有明确迁移前基线，后续能量化对比。

### Phase 1：Electrobun 项目骨架

- 初始化 Bun/TypeScript/Electrobun 工程。
- 实现主进程启动。
- 实现最小 WebView 设置页占位。
- 实现菜单栏/托盘占位。
- 实现 `/ping`。

验收标准：Mac 能构建并启动，`/ping` 返回成功。

### Phase 2：配置与 API 兼容

- 实现配置 schema。
- 实现旧配置读取和默认值补齐。
- 实现 `GET/POST /config`。
- 实现 CORS。
- 实现设置页读写配置。

验收标准：扩展 options 页和桌面设置页都能读写配置。

### Phase 3：保存核心迁移

- 迁移 Markdown 生成逻辑。
- 迁移保存路径和自定义保存路径逻辑。
- 迁移文件写入和重名处理。
- 建立 golden tests。
- 实现 `POST /save`。

验收标准：核心 fixtures 输出与旧版一致或差异被明确批准。

### Phase 4：媒体与批量抓取

- 迁移视频下载逻辑。
- 迁移博主主页批量抓取逻辑。
- 实现 profile capture state。
- 实现相关 API。

验收标准：视频和博主批量抓取路径通过测试和手动验证。

### Phase 5：桌面体验替换

- 完整实现菜单栏/托盘。
- 实现打开目录、打开日志、重启服务、退出。
- 实现首次运行引导。
- 实现开机启动。
- 清理旧 LaunchAgent。

验收标准：当前 Python 托盘能力全部由 Electrobun 提供。

### Phase 6：CI 与发布

- 更新 GitHub Actions。
- 产出 Electrobun Mac 包。
- 保留扩展包发布。
- Release note 标注迁移、回滚和兼容注意事项。

验收标准：tag release 可自动生成新版 Mac 包和扩展包。

### Phase 7：Legacy 清理

- 稳定一个版本后，将 Python 桌面端移动到 legacy 或移除。
- 更新 README、BUILD、常见问题。
- 移除 PyInstaller 作为默认构建路径。

验收标准：文档和默认构建路径都指向 Electrobun。

## Acceptance Criteria

1. Mac 用户可以下载并运行 Electrobun 版 X2MD。
2. App 首次运行可完成保存路径和视频路径配置。
3. Chrome 扩展无需大改即可连接新版本地服务。
4. `/ping`、`/config`、`/save`、`/profile-capture`、`/autostart` 协议兼容旧版。
5. X/Twitter Tweet 保存成功。
6. X/Twitter Thread 保存成功。
7. X/Twitter Article 保存成功，代码块、图片、视频不丢失。
8. LINUX DO 保存成功。
9. 飞书 wiki/docx 保存成功。
10. 微信公众号保存成功。
11. 自定义保存路径只允许写入配置白名单路径。
12. 博主批量抓取能去重并按预期写入。
13. 菜单栏可打开设置、日志、扩展目录，可退出应用。
14. 开机自动运行可开启和关闭。
15. 旧配置可自动迁移使用。
16. Mac 分发包体积明显低于当前 PyInstaller 版本，目标为压缩包不超过 30MB；若超过，需要在 release note 中解释原因。
17. 解压后的 `.app` 体积明显低于当前 162MB；目标为不超过 90MB。
18. 冷启动到 `/ping` 可用目标小于 1 秒；如果 CI/机器差异导致不稳定，至少应明显快于旧版本。
19. 单元测试、API 集成测试、扩展现有测试全部通过。
20. README 和 BUILD 文档更新到新版流程。

## Risks and Mitigations

### 风险 1：Python Markdown 逻辑迁移产生细微差异

缓解：先建立 fixtures 和 golden 输出；迁移时先追求行为等价，不顺手重构输出格式。

### 风险 2：Electrobun 生态仍较新

缓解：Mac 优先、小步迁移；保留 Python legacy 包作为回滚；避免第一版依赖 Electrobun 高级能力。

### 风险 3：系统 WebView 行为差异

缓解：设置页保持简单，不依赖复杂浏览器特性；核心采集仍在 Chrome 扩展中完成。

### 风险 4：自启迁移导致双服务抢端口

缓解：新版启用自启时清理旧 label；启动时检测端口占用并显示明确提示。

### 风险 5：CORS 本地服务被非扩展网页调用

缓解：第一版保持兼容；保存路径写入必须受配置白名单限制；后续版本引入 token 或扩展 origin 限制。

### 风险 6：Windows 兼容延期

缓解：本 PRD 明确 Mac 优先；Windows 保留旧 Python 包直到 Electrobun Windows 路径完成。

## Metrics

迁移前基线：

- 当前 Mac zip 约 60MB。
- 当前解压 `.app` 约 162MB。

目标指标：

- Mac zip ≤ 30MB，理想 15–25MB。
- 解压 `.app` ≤ 90MB。
- 冷启动到 `/ping` 可用 ≤ 1 秒。
- 保存单条 Tweet 的端到端耗时不慢于旧版。
- 所有核心 fixtures 输出一致。
- 安装/首次配置步骤不多于旧版。

## Out of Scope

- 不新增 AI 总结、翻译或重写功能。
- 不新增 Obsidian 插件。
- 不新增 Safari/Firefox 扩展。
- 不做 App Store 分发。
- 不要求第一版自动更新。
- 不要求第一版 CEF 模式。
- 不重写现有站点采集逻辑。
- 不改变用户资料库组织方式。

## Further Notes

Electrobun 对 X2MD 的价值不是“替代 Electron”，因为当前项目并没有使用 Electron；它真正替代的是 PyInstaller 打包出来的 Python GUI/托盘运行时。X2MD 的核心产品形态是本地服务和浏览器扩展，因此 Electrobun 的系统 WebView、Bun 主进程、菜单栏能力正好对应当前的 tkinter、pystray、server.py 三块职责。

建议执行时严格遵守“行为等价优先”。第一版 Electrobun 不应借重构机会改变 Markdown 输出、文件命名和配置语义。等 v2.0 稳定后，再考虑更精细的设置页体验、自动更新、安全 token 和 Windows 同构打包。
