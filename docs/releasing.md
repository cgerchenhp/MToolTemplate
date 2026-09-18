# 发布与维护

本文档记录版本管理、Portable 构建、冒烟验证、归档和清理流程。

## 版本管理

版本号需要同步到 `package.json`、`package-lock.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 和 `src-tauri/Cargo.lock`。

```bash
npm run version:bump
npm run version:bump -- minor
npm run version:bump -- major
npm run version:bump -- --set 1.2.3
```

不带参数时升级 patch 版本。`--set` 可以指定精确的 `x.y.z` 版本，但目标版本必须严格大于当前版本；脚本会先检查所有版本文件是否一致，发现不一致时拒绝修改。

## 本地构建

```bash
npm run tauri:build
```

该命令依次完成前端构建、PyInstaller 后端打包、Tauri 构建、sidecar 后处理和 Portable 目录整理。

Windows 输出结构：

```text
src-tauri/target/release-portable/
├── <project-id>.exe
├── _internal/
│   ├── backend.exe
│   └── ...
├── release-manifest.json
└── README-PORTABLE.txt
```

`backend.exe` 位于 `_internal` 中，发布时必须让主程序与整个 `_internal` 目录保持相对位置不变。macOS 输出为完整的 `.app` bundle。

## 推荐发布流程

```bash
npm run tauri:build
npm run release:smoke
npm run release:archive
npm run cleanup
```

`release:smoke` 会启动 Portable 后端，验证动态端口、基础 API 和优雅退出流程。`release:archive` 会生成 ZIP 文件和对应的 `.sha256` 校验文件。

归档保存在 `artifacts/`，文件名包含 project ID、版本、平台和 `portable` 标识。

## 清理策略

```bash
npm run storage:report
npm run storage:report -- --deep
npm run cleanup -- --dry-run
npm run cleanup
npm run cleanup:deep
```

普通清理会删除构建中间文件和缓存，但保留 `src-tauri/target/release-portable` 与 `artifacts/`。深度清理会额外删除完整的 `src-tauri/target` 与 Portable 目录，但保留 `node_modules` 和 `.venv`。

如果当前 Portable 版本尚未归档，深度清理会拒绝执行。只有明确要丢弃该版本时，才应使用 `--force`。
