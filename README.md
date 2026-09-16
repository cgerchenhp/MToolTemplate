# Tauri + React + Python 桌面应用模板

用于快速创建本地桌面工具的基础工程，技术栈为 Tauri 2、React 19、TypeScript、Tailwind CSS v4、Python 和 FastAPI。模板已集成前后端开发、Python sidecar 打包、动态端口、Portable 发布、归档和清理流程。

模板自带 Gallery 示例页，用于浏览和验证通用 UI 组件。开始业务开发前，请先运行初始化命令并替换应用图标。

## 核心能力

- React 前端与 FastAPI 本地后端，通过 REST 和 SSE 通信
- Tauri 负责窗口、托盘、单实例以及后端进程生命周期
- 一条命令同步应用名称、项目 ID、identifier 和开发端口
- Windows 与 macOS Portable 构建、冒烟验证、ZIP 归档及 SHA-256 校验
- 可复用的表单、文件选择、图像、Markdown、树形数据、通知和布局组件

## 环境要求

| 工具 | 要求 |
|------|------|
| Node.js | `^20.19.0` 或 `>=22.12.0` |
| Python | `>=3.11` |
| Rust | `>=1.77.2` |
| 系统组件 | 按 [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/) 安装 |

Portable 发布目前支持 Windows 和 macOS。

## 快速开始

```bash
npm install
npm run project:init
python -m venv .venv
```

安装 Python 依赖：

```powershell
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

```bash
# macOS / Linux
source .venv/bin/activate
pip install -r requirements.txt
```

使用 VS Code 时，按 `Ctrl+Shift+B` 并选择 `Dev: Start All`。也可以在两个终端中分别启动：

```bash
# 终端 1
npm run dev:backend

# 终端 2
npm run tauri:dev
```

`project:init` 会同步 `project.config.json`、`package.json`、Tauri 配置、Cargo binary 名称和窗口标题。非交互示例：

```bash
npm run project:init -- --name "My Tool" --project-id my-tool --identifier com.example.my-tool --close-to-tray
```

更换项目 ID 时会自动生成项目专属端口；初始化后只需替换 `src-tauri/icons/` 中的应用图标。

## 常用命令

| 命令 | 用途 |
|------|------|
| `npm run dev:backend` | 启动 FastAPI 开发后端 |
| `npm run tauri:dev` | 启动 Tauri、React 和 Vite 开发环境 |
| `npm run build` | TypeScript 检查并构建前端 |
| `npm run lint` | 运行 ESLint |
| `npm run check:utf8:strict` | 检查 UTF-8 并拒绝 BOM |
| `python -m pytest backend/tests -v` | 运行后端测试 |

版本、发布和维护命令见 [发布与维护](docs/releasing.md)。

## 工程结构

```text
├── src/
│   ├── components/ui/       # 通用 UI 组件
│   ├── components/tabs/     # 页面和业务页签
│   ├── hooks/               # React Hooks
│   └── lib/                 # API、拖拽等公共逻辑
├── backend/
│   ├── core/                # 日志与运行配置
│   ├── routers/             # FastAPI 路由
│   └── tests/               # 后端测试
├── src-tauri/
│   ├── src/                 # Rust 桌面壳与 sidecar 管理
│   └── capabilities/        # Tauri 权限声明
├── scripts/                 # 初始化、构建、发布和清理脚本
├── docs/                    # 架构与发布文档
├── project.config.json      # 项目名称、端口和托盘行为
└── requirements.txt         # Python 依赖
```

主要扩展入口：

- 在 `src/components/tabs/` 添加业务页，并在 `src/App.tsx` 注册。
- 通用控件位于 `src/components/ui/`，Gallery 页展示了实际用法。
- 在 `backend/routers/` 添加 API 路由，并在 `backend/main.py` 注册。
- 前端统一通过 `src/lib/api.ts` 访问后端。

## 构建与发布

```bash
npm run tauri:build
npm run release:smoke
npm run release:archive
```

`tauri:build` 会完成前端构建、PyInstaller 后端打包、Tauri 构建和 Portable 目录整理。Windows 主要产物为 `src-tauri/target/release-portable/`，归档保存在 `artifacts/`。

发布时必须保持主程序与 `_internal/` 目录的相对位置不变。macOS 输出为完整的 `.app` bundle。完整流程见 [发布与维护](docs/releasing.md)。

## 关键设计

- Rust 启动 Python sidecar，并通过 stdout 中的 `BACKEND_PORT:<port>` 完成端口注册和生命周期管理。
- 开发模式会动态选择前后端空闲端口，避免多个模板副本发生冲突。
- PyInstaller 使用 onedir 模式，Windows sidecar 和运行依赖位于 `_internal/`。
- Markdown 渲染会清理 URL 和 HTML；归档与深度清理脚本带有安全校验。

实现细节见 [架构说明](docs/architecture.md) 和 [后端文档](backend/README.md)。

## 许可证

[MIT](LICENSE)
