# Tauri + React + Python 桌面应用模板

基于 **Tauri 2 + React 19 + FastAPI** 的桌面应用起点模板。前端使用 TypeScript + Tailwind CSS v4，后端使用 Python + FastAPI，通过 Tauri 打包为原生桌面应用。

当前包含一个 **Gallery（组件画廊）** 示例页，展示所有内置 UI 组件。

## 目录结构

```
├── src/                    # React 前端源码
│   ├── components/         # UI 组件（tabs/ 业务页签，ui/ 通用控件）
│   ├── hooks/              # 自定义 React Hooks
│   └── lib/                # API 客户端、拖拽上下文
├── backend/                # Python FastAPI 后端
│   ├── core/               # 日志等基础模块
│   ├── routers/            # API 路由（按功能拆分）
│   └── tests/              # pytest 测试
├── src-tauri/              # Tauri 桌面壳（Rust）
│   ├── src/                # Rust 源码（sidecar 启动、端口发现）
│   └── capabilities/       # Tauri 权限声明
├── scripts/                # 构建脚本（PyInstaller、后处理）
└── .vscode/                # VS Code 任务配置
```

## 前置要求

- **Node.js** ≥ 20
- **Python** ≥ 3.11（建议使用 venv）
- **Rust** ≥ 1.77（Tauri 2 要求）
- **系统依赖**：参考 [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

## 快速开始

```bash
# 1. 安装前端依赖
npm install

# 2. 从模板创建应用后先运行一次，统一设置名称和端口
npm run project:init

# 3. 创建 Python 虚拟环境并安装后端依赖
python -m venv .venv
# Windows:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt

# 4. 启动开发环境（推荐 VS Code 任务）
#    VS Code: Ctrl+Shift+B → "Dev: Start All"
#    或分别启动：
#      终端 1: npm run dev:backend
#      终端 2: npm run tauri:dev
```

## VS Code 任务

| 任务名 | 说明 |
|--------|------|
| `Backend: Dev` | 启动 Python 后端（自动激活 venv） |
| `Frontend: Tauri Dev` | 启动 Tauri 开发窗口 + Vite HMR |
| `Dev: Start All` | 并行启动上述两者（默认构建任务） |
| `Build: Release` | 生产构建（Tauri + PyInstaller） |

## 项目维护命令

```bash
# 交互式设置应用名称、项目 ID、identifier 和端口
npm run project:init

# 版本号同步更新 package.json、package-lock.json、Tauri 与 Cargo 元数据
npm run version:bump              # patch：0.2.0 -> 0.2.1
npm run version:bump -- minor     # minor：0.2.0 -> 0.3.0
npm run version:bump -- major     # major：0.2.0 -> 1.0.0

# 检查项目源码编码；strict 模式会将 UTF-8 BOM 视为错误
npm run check:utf8
npm run check:utf8:strict
```

## 架构概览

### 前后端通信

```
┌─────────────┐     REST / SSE      ┌─────────────┐
│  React 前端  │ ◄──────────────────► │ FastAPI 后端 │
│  (Webview)   │   http://127.0.0.1  │  (Sidecar)   │
└─────────────┘                      └─────────────┘
        ▲                                    ▲
        │  IPC (get_backend_port)            │
        └──── Tauri Rust 壳 ─────────────────┘
              (启动 & 管理后端进程)
```

- **REST API**: `apiGet()` / `apiPost()` — 见 `src/lib/api.ts`
- **SSE 日志流**: `/api/logs/stream` — 后端日志实时推送到前端 Console
- **SSE 通知流**: `/api/notify/stream` — 后端主动推送结构化消息

### 端口发现机制

前端开发服务器由 `scripts/tauri_dev.mjs` 启动。脚本从 `project.config.json` 的首选端口开始搜索空闲端口，并将同一个端口同时传给 Vite 和 Tauri；Vite 启用 `strictPort`，不会静默跳到另一个 URL。

后端启动时从 `project.config.json` 的 `backendPort` 开始搜索可用端口（默认 **7090**，最多向上搜索 200 个端口），找到后：

- **生产模式**: 通过 stdout 输出 `BACKEND_PORT:xxxx`，Tauri Rust 壳读取并存入状态
- **开发模式**: 写入包含项目 ID 与工作区路径哈希的临时文件，Tauri 按需读取并验证端口仍可用；不同模板副本不会互相覆盖

前端通过 Tauri IPC 命令 `get_backend_port` 获取实际端口，然后构建 `http://127.0.0.1:{port}` 基础 URL。

## 端口配置清单

本项目涉及以下端口设置，创建新应用时需要了解：

| 端口 | 文件 | 用途 | 何时使用 |
|------|------|------|----------|
| **5175** | `project.config.json` → `preferredDevPort` | Vite 首选起始端口，忙时自动向上查找 | **仅开发期** |
| **动态** | `scripts/tauri_dev.mjs` | 将实际端口同步给 Vite 与 Tauri `devUrl` | **仅开发期** |
| **7090** | `project.config.json` → `backendPort` | 后端首选起始端口 | 开发 & 生产 |
| **动态** | `vite.config.ts` | 从 `backendPort` 生成浏览器模式 fallback URL | 仅浏览器直接访问 |

**5175 只是首选开发端口**：如果已被占用，启动器会选择后续空闲端口，并将最终 URL 同时配置给 Vite 和 Tauri。可以用 `npm run tauri:dev -- --port 5210` 强制指定；指定端口被占用时会直接报错。生产构建不需要此端口。

**后端端口可配置**：修改 `project.config.json` 的 `backendPort` 可为每个模板实例分配不同端口；`TAURI_BACKEND_PORT` 环境变量可在单次运行时覆盖它。后端从该端口开始搜索第一个空闲端口，前端通过 IPC 获取实际端口。`project:init` 在项目 ID 改变时也会生成新的项目专属端口。

## 用此模板创建新应用

### 1. 初始化应用

复制模板后运行：

```bash
npm run project:init
```

该命令会交互式设置应用显示名称、项目 ID 和 Tauri identifier，并同步修改 `package.json`、`package-lock.json`、Tauri 配置、Cargo binary 名称、界面标题以及项目专属临时日志名。首选开发端口和后端端口会根据项目 ID 自动生成，也可以非交互执行：

```bash
npm run project:init -- \
  --name "My Tool" \
  --project-id my-tool \
  --identifier com.example.my-tool \
  --port 5210 \
  --backend-port 23456 \
  --close-to-tray
```

`--close-to-tray` 让关闭主窗口时将应用隐藏到托盘，`--no-close-to-tray` 恢复“关闭即退出”；对应配置为 `project.config.json` 中的 `closeToTray`，模板默认关闭。使用 `--dry-run` 可以只预览结果。应用图标仍需按项目替换 `src-tauri/icons/` 和 `public/app-icon.png`。

### 2. 添加新路由

```python
# backend/routers/my_feature.py
from fastapi import APIRouter
router = APIRouter(prefix="/api/my-feature", tags=["my-feature"])

@router.get("/status")
def status():
    return {"ok": True}
```

在 `backend/main.py` 中注册：

```python
# Dev 模式（模块级）
if not IS_PACKAGED:
    from routers import my_feature
    app.include_router(my_feature.router)

# 生产模式（__main__ 中，BACKEND_PORT 打印之后）
if IS_PACKAGED:
    from routers import my_feature
    app.include_router(my_feature.router)
```

### 3. 添加新页签

在 `src/App.tsx` 中的 `TABS` 和 `TAB_PANELS` 数组中添加条目：

```tsx
const TABS = [
  { id: 'manual', label: 'Manual' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'my-feature', label: '新功能' },  // ← 新增
]
const TAB_PANELS = [
  { id: 'manual',     content: <ManualTab /> },
  { id: 'gallery',    content: <GalleryTab /> },
  { id: 'my-feature', content: <MyFeatureTab /> },  // ← 新增
]
```

## 内置 UI 组件

Gallery 页签中展示了所有可用组件：

- **容器**: `FeaturePanel`, `CollapsibleSection`
- **表单**: `TextInput`, `NumberInput`, `TextareaInput`, `ColorField`, `CheckboxField`, `SelectField`, `RadioGroup`
- **选择器**: `FilePicker`, `DirPicker`, `FileDropZone`
- **显示**: `ImageView`, `ImageGrid`, `ClickableImage`, `JsonTree`, `MarkdownView`, `FileTree`, `Badge`, `Alert`, `MetricCard`
- **布局**: `FormField`, `InfoRow`, `SectionTitle`, `FrameStatusBar`, `SegmentedTabs`
- **交互**: `Button`, `PopoverPanel`, `NotificationStack`, `AsyncWaitingNotice`, `renderedHtmlExport`
- **系统**: `TitleBar`, `ThemeButton`, `BackendStatusBadge`, `ConsolePanel`, `Tabs`

其中 `ClickableImage` 的灯箱支持缩放、平移和多图键盘导航；`MarkdownView` 默认执行 URL/HTML 安全清理，并支持标题锚点、本地文档导航和超长内容渐进渲染；`FileTree` 可通过 `renderLabel`、`stripExtensions`、`allowCompare` 等属性适配不同类型的层级资源。`TitleBar` 提供应用标题、版本标签、中部文档身份和操作区插槽，`Tabs` 同时支持内部懒挂载和外部受控的 `mountedTabs`。

## 生产构建

```bash
npm run tauri:build
```

此命令依次执行：

1. `tsc -b && vite build` — 编译前端
2. `python scripts/build_backend.py` — PyInstaller 打包后端
3. `tauri build` — 打包 Tauri 桌面应用
4. `python scripts/post_bundle.py` — 将 `_internal/` 复制到正确位置
5. `python scripts/stage_release.py` — 生成干净的 Portable 目录和发布清单

Tauri 原始构建位于 `src-tauri/target/release/`，可交付目录位于 `src-tauri/target/release-portable/`。Windows Portable 布局为：

```text
src-tauri/target/release-portable/
├── <project-id>.exe       # Tauri 主程序
├── _internal/
│   ├── backend.exe        # Python 后端
│   └── ...                # PyInstaller 运行时依赖
├── release-manifest.json  # 版本、平台、入口和文件统计
└── README-PORTABLE.txt
```

Windows 的 `backend.exe` 不再与主程序同目录；Rust 壳会从 `_internal/backend.exe` 启动它。macOS Portable 目录包含完整 `.app` bundle。

构建完成后可以验证 Portable backend 的动态端口、基础接口和优雅退出：

```bash
npm run release:smoke
```

## 测试

```bash
cd backend
python -m pytest tests/ -v
```

## 许可证

MIT
