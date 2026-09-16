# 架构说明

## 前后端通信与进程生命周期

React 通过 Tauri IPC 命令 `get_backend_port` 获取后端实际端口，再使用 `src/lib/api.ts` 发送 REST 请求。日志和通知分别通过 `/api/logs/stream` 与 `/api/notify/stream` 以 SSE 推送，避免前端轮询。

生产模式下，Rust 壳启动打包后的 Python sidecar，读取 stdout 中的 `BACKEND_PORT:<port>` 完成端口注册，并在应用退出时通知后端优雅停止。`tauri-plugin-single-instance` 用于复用已有进程；`project.config.json` 的 `closeToTray` 控制关闭窗口时隐藏到托盘还是退出。

## 动态端口

`scripts/tauri_dev.mjs` 从 `preferredDevPort` 开始选择空闲端口，并把同一地址同时传给 Vite 和 Tauri。Vite 启用 `strictPort`，防止前后端使用不同 URL。

后端从 `backendPort` 开始查找空闲端口。开发模式将端口写入带项目 ID 和工作区哈希的临时文件，避免多个模板副本互相覆盖；生产模式由 Rust 读取 stdout。`TAURI_BACKEND_PORT` 可临时覆盖后端首选端口。

## Sidecar 与 Portable 布局

`scripts/build_backend.py` 使用 PyInstaller onedir 模式生成后端。Windows 的运行文件集中在 `_internal`，`scripts/post_bundle.py` 修正 Tauri 构建目录中的布局，`scripts/stage_release.py` 再生成干净的 `release-portable` 目录和 `release-manifest.json`。

冒烟脚本会直接启动 Portable 后端，验证动态端口、基础 API 和退出协议。归档脚本只打包 Portable 内容并生成 SHA-256 校验。

## UI 与内容安全

通用组件集中在 `src/components/ui/`，业务页只组合组件和状态。`NotificationStack` 通过 Context 统一接收前端及 SSE 通知；`MarkdownView` 的渲染管线会清理 URL 和 HTML，并支持标题锚点、本地文档导航及长内容渐进渲染；`ClickableImage` 使用统一灯箱状态实现缩放、平移和多图导航。

## 开发性能与发布安全

`vite.config.ts` 将依赖扫描入口限制为 `index.html`，并忽略日志、数据、文档、Python 环境和 Cargo target 等高变动目录，减少开发模式下的无关扫描与刷新。

清理脚本只接受工作区内的预定义路径。普通清理保留交付物；深度清理会先确认当前 Portable 版本已经归档，从而降低误删未发布构建的风险。
