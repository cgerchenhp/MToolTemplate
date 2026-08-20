# Backend 开发文档

本后端基于 **Python + FastAPI + Uvicorn**，作为 此 App 桌面应用（Tauri + React）的本地计算服务

---

## 目录结构

```
backend/
├── main.py              # 应用入口：FastAPI 实例、中间件、启动逻辑
├── README.md            # 本文档
├── core/                # 核心业务逻辑（不直接依赖 FastAPI）
│   ├── __init__.py
│   ├── log.py           # 日志初始化（init_logging / get_log_queue）
├── routers/             # 按业务域拆分的路由模块
│   ├── __init__.py
└── requirements.txt     # 运行时依赖
```

---

## 快速启动

```bash
# 安装依赖
pip install -r backend/requirements.txt

# 启动开发服务
python backend/main.py
```

启动后会在控制台输出 `BACKEND_PORT:<port>`，前端通过环境变量 `VITE_BACKEND_URL` 或默认地址 `http://127.0.0.1:7090` 连接。

---

## API 规范

### 路径前缀

所有端点统一以 `/api` 开头：

| 方法   | 路径                        | 说明                         |
|--------|-----------------------------|------------------------------|
| GET    | `/api/hello`                | 健康检查（前端心跳探测）      |
| GET    | `/api/sysinfo`              | 返回操作系统与 Python 版本信息 |

### 响应结构

成功时返回具体数据对象；失败时统一返回：

```json
{
  "error": "<错误码>",
  "message": "<可读描述>"
}
```

HTTP 状态码：`400` 参数错误，`422` 请求体校验失败，`500` 服务器内部错误。

---

## 开发原则

1. **职责分离**：路由层（`routers/`）只负责参数提取与响应序列化；业务逻辑全部放入对应 `services/` 模块，保持可独立测试。

2. **类型安全**：所有请求体与响应体使用 Pydantic 模型定义，严禁使用裸 `dict` 作为接口契约。

3. **本地优先**：整个服务仅监听 `127.0.0.1`，不对外暴露，CORS 在生产构建中应收紧至仅允许 `tauri://localhost`。

4. **无状态设计**：单次请求完成所有处理，避免在内存中缓存用户数据；大文件处理完毕后立即释放资源。

5. **失败快速**：在函数入口处校验参数（文件格式、尺寸限制等），遇到不符合预期的输入立即返回 `400`，不进入后续计算流程。

6. **依赖最小化**：引入新的第三方库前先评估是否可用标准库或已有依赖实现，避免依赖树膨胀影响打包体积。

---

### 错误处理

```python
from fastapi import HTTPException

# 推荐写法：明确状态码与可读消息
raise HTTPException(status_code=400, detail="不支持的图片格式，仅接受 JPEG/PNG/WEBP")
```

使用 FastAPI 的全局 `exception_handler` 捕获未预期异常，记录日志后返回统一 `500` 格式，**不要**将原始堆栈信息暴露给调用方。

### 日志

日志配置集中在 `core/log.py`，基于 Python 标准库 `logging` 实现，遵循**配置一次、到处使用**的原则。

#### 架构原理

Python logger 采用层级继承机制。`init_logging()` 在应用启动时向**根 logger** 注册两个 handler：

- `StreamHandler` — 输出到控制台；
- `_QueueHandler` — 将每条记录放入内存队列，由 SSE 端点 `/api/logs/stream` 实时推送给前端。

所有子 logger（即各模块通过 `getLogger(__name__)` 获取的）都会自动继承这两个 handler，无需任何额外配置。

#### 在新模块中使用日志

```python
import logging

logger = logging.getLogger(__name__)

def some_function():
    logger.info("处理中: %s", some_value)
    logger.warning("注意: %s", warning_msg)
    logger.exception("发生错误")  # 自动附加 traceback
```

> **不要** 从 `main.py` 或其他模块导入 logger 实例；直接使用 `logging.getLogger(__name__)` 即可。

#### 日志级别

- 开发模式（`reload=True`）：`INFO` — 打印所有请求与业务日志；
- 生产 sidecar 模式（打包后）：`WARNING` — 减少噪音，仅保留警告与错误。

级别可在 `main.py` 的 `init_logging(level=...)` 调用处统一调整。

### 测试

- 使用 `pytest` + `httpx.AsyncClient` 对 `routers/` 进行单元测试，业务逻辑层在不启动 HTTP 服务器的情况下直接测试 `services/`。
- 测试文件放在 `backend/tests/`，命名规则 `test_<模块名>.py`。

---

## 依赖说明

| 包 | 用途 |
|----|------|
| `fastapi` | Web 框架与路由 |
| `uvicorn` | ASGI 服务器 |
| `pydantic` | 数据校验（FastAPI 内置） |

新增依赖时同步更新 `requirements.txt`，并在此表格中补充说明。
