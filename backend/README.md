# Backend 开发文档

后端基于 Python、FastAPI 和 Uvicorn，作为 Tauri 桌面应用的本地服务，只监听 `127.0.0.1`。

## 目录结构

```text
backend/
├── main.py              # FastAPI 实例、通用端点、启动与退出逻辑
├── core/
│   ├── log.py           # 日志初始化和 SSE 日志队列
│   └── runtime_config.py  # 端口和项目配置读取
├── routers/
│   └── notify.py        # 通知推送和 SSE 路由
└── tests/               # 后端测试
```

运行时与打包依赖统一位于项目根目录的 `requirements.txt`。

## 快速启动

```bash
pip install -r requirements.txt
python backend/main.py
```

也可以在项目根目录运行：

```bash
npm run dev:backend
```

启动后会在控制台输出 `BACKEND_PORT:<port>`。前端通过 Tauri IPC 获取端口，也可以通过 `VITE_BACKEND_URL` 覆盖默认后端地址。

## API

所有端点统一以 `/api` 开头。

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/hello` | 健康检查 |
| `GET` | `/api/sysinfo` | 操作系统、Python 和机器信息 |
| `GET` | `/api/logs/stream` | 后端日志 SSE |
| `POST` | `/api/echo` | 消息回声，用于验证请求链路 |
| `POST` | `/api/debug/emit-logs` | 发送各等级测试日志 |
| `GET` | `/api/notify/stream` | 结构化通知 SSE |
| `POST` | `/api/notify/push` | 向后端推送一条通知 |
| `POST` | `/api/notify/trigger` | 延迟发送演示通知 |

## 响应约定

业务端点直接返回数据对象。请求体校验失败时由 FastAPI 返回 `422` 和 `detail`；主动抛出 `HTTPException` 时同样使用 `detail` 描述错误：

```python
from fastapi import HTTPException

raise HTTPException(status_code=400, detail="不支持的图片格式")
```

当前模板没有统一包装成 `{ "error": ..., "message": ... }` 的全局异常处理器。如果项目需要固定错误协议，应在 `main.py` 中显式注册异常处理器并同步更新本说明。

## 开发原则

1. 路由层负责参数提取与响应序列化，复杂逻辑放入独立模块，避免继续膨胀 `main.py`。
2. 请求体和响应体使用 Pydantic 模型定义，保持接口契约明确。
3. 服务仅监听回环地址；CORS 默认只允许 Tauri WebView、localhost 和 `127.0.0.1`。
4. 单次请求完成处理，避免在内存中长期缓存用户数据。
5. 在入口处校验文件格式、尺寸和路径等输入，失败时尽早返回。
6. 不把 API Key、Token 或本地绝对路径写入源码和测试数据。

## 日志

日志配置集中在 `core/log.py`。`init_logging()` 在应用启动时向根 logger 注册：

- `StreamHandler`：输出到控制台。
- `_QueueHandler`：写入内存队列，由 `/api/logs/stream` 推送到前端。

业务模块直接使用标准 logging：

```python
import logging

logger = logging.getLogger(__name__)
logger.info("处理中: %s", value)
```

不要从 `main.py` 或其他模块导入 logger 实例。

## 测试

测试位于 `backend/tests/`，文件命名使用 `test_<模块名>.py`。

```bash
python -m pytest backend/tests -v
```

当前运行环境还需要安装 `pytest`。如果测试夹具未来引入 HTTP 客户端或其他测试依赖，应同步维护开发依赖说明。

## 依赖说明

| 包 | 用途 |
|----|------|
| `fastapi` | Web 框架与路由 |
| `uvicorn` | ASGI 服务器 |
| `pydantic` | 数据校验 |
| `pyinstaller` | 发布阶段的 Python sidecar 打包 |

新增依赖时同步更新 `requirements.txt` 和本表。
