# Tauri + React + Python 桌面应用模板

用于快速创建桌面工具的基础工程，技术栈为 Tauri 2、React 19、TypeScript、Tailwind CSS v4、Python 和 FastAPI。工程已经集成前后端开发、Python sidecar 打包、动态端口发现、Portable 发布、归档与空间清理流程。

模板自带 Gallery 示例页，用于浏览和验证通用 UI 组件。开始业务开发前，请先完成项目初始化并替换应用图标。

## 核心能力

- React 前端与 FastAPI 本地后端，通过 REST 和 SSE 通信
- Tauri 负责窗口、托盘、单实例以及后端进程生命周期
- 一条命令同步应用名称、项目 ID、identifier 和开发端口
- Windows 与 macOS Portable 构建、冒烟验证、ZIP 归档及 SHA-256 校验
- 可复用的表单、文件选择、图像、Markdown、树形数据、通知和布局组件
- 对源码编码、Vite 扫描范围、构建产物和开发缓存提供统一管理

## 环境要求

| 工具 | 要求 |
|------|------|
| Node.js | ^20.19.0 或 >=22.12.0 |
| Python | >=3.11，建议使用项目内虚拟环境 |
| Rust | >=1.77.2 |
| 系统组件 | 按照 [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/) 安装 |

Portable 发布流程目前支持 Windows 和 macOS。

## 快速开始

~~~bash
# 安装前端依赖
npm install

# 设置应用名称、项目 ID、identifier 和端口
npm run project:init

# 创建 Python 环境并安装依赖
python -m venv .venv
~~~

Windows PowerShell：

~~~powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
~~~

macOS / Linux：

~~~bash
source .venv/bin/activate
pip install -r requirements.txt
~~~

推荐使用 VS Code 的默认构建任务启动开发环境：

1. 按 Ctrl+Shift+B。
2. 选择 **Dev: Start All**。

也可以分别运行：

~~~bash
# 终端 1：FastAPI 后端
npm run dev:backend

# 终端 2：Tauri、React 与 Vite HMR
npm run tauri:dev
~~~

## 从模板创建应用

交互式初始化：

~~~bash
npm run project:init
~~~

非交互示例：

~~~bash
npm run project:init -- --name "My Tool" --project-id my-tool --identifier com.example.my-tool --port 5210 --backend-port 23456 --close-to-tray
~~~

初始化命令会同步修改 project.config.json、package.json、package-lock.json、Tauri 配置、Cargo binary 名称、窗口标题和项目专属临时文件名。

常用选项：

| 选项 | 作用 |
|------|------|
| --name | 应用显示名称 |
| --project-id | npm 包名、主程序名及项目内部标识 |
| --identifier | Tauri 反向域名标识 |
| --port | Vite 首选开发端口 |
| --backend-port | FastAPI 首选端口 |
| --close-to-tray / --no-close-to-tray | 设置关闭窗口时隐藏到托盘或直接退出 |
| --dry-run | 只预览修改 |

未显式提供端口时，更换 project ID 会自动生成项目专属端口。初始化后只需替换 src-tauri/icons/ 中的应用图标；`npm run icon:sync` 会将 32x32.png 同步到 Web 页面和标题栏使用的 public/app-icon.png，前端开发及构建前也会自动执行该命令。

## 常用命令

### 开发与质量检查

| 命令 | 用途 |
|------|------|
| npm run dev | 仅启动 Vite 浏览器开发服务器 |
| npm run dev:backend | 启动 FastAPI 开发后端 |
| npm run tauri:dev | 启动 Tauri 开发应用 |
| npm run icon:sync | 将 Tauri 32x32 图标同步为 Web 应用图标 |
| npm run build | TypeScript 检查并构建前端 |
| npm run lint | 运行 ESLint |
| npm run check:utf8:strict | 检查 UTF-8，并拒绝 BOM |
| python -m pytest backend/tests -v | 运行后端测试 |

### 版本、发布与维护

| 命令 | 用途 |
|------|------|
| npm run version:bump | 升级 patch 版本 |
| npm run version:bump -- minor | 升级 minor 版本 |
| npm run version:bump -- major | 升级 major 版本 |
| npm run tauri:build | 构建并生成 Portable 目录 |
| npm run release:smoke | 验证 Portable 后端、接口和退出流程 |
| npm run release:archive | 生成 ZIP 归档和 SHA-256 文件 |
| npm run storage:report | 统计普通清理可回收空间 |
| npm run storage:report -- --deep | 统计深度清理可回收空间 |
| npm run cleanup -- --dry-run | 预览普通清理 |
| npm run cleanup | 清除构建中间文件和缓存，保留发布内容 |
| npm run cleanup:deep | 额外清除 target、node_modules、.venv 和 Portable 目录 |

## 工程结构与扩展位置

~~~text
├── src/
│   ├── components/ui/       # 通用 UI 组件
│   ├── components/tabs/     # 页面和业务页签
│   ├── hooks/               # React Hooks
│   └── lib/                 # API、Markdown、拖拽等公共逻辑
├── backend/
│   ├── core/                # 日志与运行配置
│   ├── routers/             # FastAPI 路由
│   └── tests/               # 后端测试
├── src-tauri/
│   ├── src/                 # Rust 桌面壳与 sidecar 管理
│   └── capabilities/        # Tauri 权限声明
├── scripts/                 # 初始化、构建、发布、归档和清理脚本
├── project.config.json      # 项目名称、端口和托盘行为
└── requirements.txt         # Python 依赖
~~~

主要扩展入口：

- 在 src/components/tabs/ 添加业务页，并在 src/App.tsx 的页签配置中注册。
- 通用控件位于 src/components/ui/；Gallery 页展示了组件的实际用法。
- 在 backend/routers/ 添加 API 路由，并在 backend/main.py 注册。
- 前端统一通过 src/lib/api.ts 访问后端。
- 后端结构和开发约定见 backend/README.md。

## 构建与发布

~~~bash
npm run tauri:build
~~~

该命令依次完成前端构建、PyInstaller 后端打包、Tauri 构建、sidecar 后处理和 Portable 目录整理。Windows 输出结构如下：

~~~text
src-tauri/target/release-portable/
├── <project-id>.exe
├── _internal/
│   ├── backend.exe
│   └── ...
├── release-manifest.json
└── README-PORTABLE.txt
~~~

backend.exe 位于 _internal 中，发布时必须让主程序与整个 _internal 目录保持相对位置不变。macOS 输出为完整的 .app bundle。

推荐发布流程：

~~~bash
npm run tauri:build
npm run release:smoke
npm run release:archive
npm run cleanup
~~~

归档保存在 artifacts/。普通清理保留 release-portable 和 artifacts；深度清理会删除依赖环境和 Portable 目录。如果尚未归档当前 Portable 版本，深度清理会拒绝执行，除非显式传入 --force。

## 许可证

MIT

## 技术说明与实现关键

### 前后端通信与进程生命周期

React 通过 Tauri IPC 命令 get_backend_port 获取后端实际端口，再使用 src/lib/api.ts 发送 REST 请求。日志和通知分别通过 /api/logs/stream 与 /api/notify/stream 以 SSE 推送，避免前端轮询。

生产模式下，Rust 壳启动打包后的 Python sidecar，读取其 stdout 中的 BACKEND_PORT:<port> 完成端口注册，并在应用退出时通知后端优雅停止。tauri-plugin-single-instance 用于复用已有进程；project.config.json 的 closeToTray 控制关闭窗口时隐藏到托盘还是退出。

### 动态端口

scripts/tauri_dev.mjs 从 preferredDevPort 开始选择空闲端口，并把同一地址同时传给 Vite 和 Tauri。Vite 启用 strictPort，防止两端使用不同 URL。

后端从 backendPort 开始查找空闲端口。开发模式将端口写入带项目 ID 和工作区哈希的临时文件，避免多个模板副本互相覆盖；生产模式由 Rust 读取 stdout。TAURI_BACKEND_PORT 可临时覆盖后端首选端口。

### Sidecar 与 Portable 布局

scripts/build_backend.py 使用 PyInstaller onedir 模式生成后端。Windows 的运行文件集中在 _internal，scripts/post_bundle.py 修正 Tauri 构建目录中的布局，scripts/stage_release.py 再生成干净的 release-portable 目录和 release-manifest.json。冒烟脚本会直接启动 Portable 后端，验证动态端口、基础 API 和退出协议。

### UI 与内容安全

通用组件集中在 src/components/ui/，业务页只组合组件和状态。NotificationStack 通过 Context 统一接收前端及 SSE 通知；MarkdownView 的渲染管线会清理 URL 和 HTML，并支持标题锚点、本地文档导航及长内容渐进渲染；ClickableImage 使用统一灯箱状态实现缩放、平移和多图导航。

### 开发性能与发布安全

vite.config.ts 将依赖扫描入口限制为 index.html，并忽略日志、数据、文档、Python 环境和 Cargo target 等高变动目录，减少开发模式下的无关扫描与刷新。

归档脚本只打包 Portable 内容并生成 SHA-256 校验；清理脚本只接受工作区内的预定义路径。普通清理保留交付物，深度清理会先确认当前 Portable 版本已经归档，从而降低误删未发布构建的风险。
