
import asyncio
import atexit
import json
import logging
import os
import platform
import queue
import re
import socket
import sys
import tempfile
import threading
import time

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# 初始化日志（必须在所有业务模块导入之前完成）
from core.log import get_log_queue, init_logging
from core.runtime_config import configured_backend_port
init_logging()

logger = logging.getLogger(__name__)

IS_PACKAGED = getattr(sys, "_MEIPASS", None) is not None

app = FastAPI(title="Backend API")

app.add_middleware(
    CORSMiddleware,
    # Native clients do not send an Origin header. Browser access is limited
    # to the Tauri WebView and local development servers so arbitrary web pages
    # cannot call a local App backend.
    allow_origins=[
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
    ],
    allow_origin_regex=r"^https?://(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dev 模式：uvicorn reload=True 会 fork 子进程并 import 本模块（非 __main__），
# 子进程必须在模块级别就能看到所有路由；因此仅 dev 模式提前注册路由。
# 生产模式：uvicorn 在同一进程单进程运行，路由在 __main__ 中打印 BACKEND_PORT
# 之后才注册，以缩短 Tauri 拿到端口的等待时间。
if not IS_PACKAGED:
    from routers import notify as notify_router
    app.include_router(notify_router.router)


def _dev_project_key() -> str:
    """Return the per-workspace key supplied by the development launchers."""
    raw = os.environ.get("TAURI_DEV_PROJECT_KEY", "tauri-react-python-template")
    sanitized = re.sub(r"[^A-Za-z0-9_-]+", "-", raw).strip("-")
    return sanitized or "tauri-react-python-template"


# Copied template apps use different project/path keys and cannot overwrite
# each other's development port-discovery files.
_DEV_PORT_FILE = os.path.join(
    tempfile.gettempdir(), f"{_dev_project_key()}.backend.port"
)


def _find_free_port(start: int, search_span: int = 200) -> int:
    """从项目配置的首选端口开始，在一个有界范围内寻找可用端口。"""
    end = min(start + search_span, 65535)
    for port in range(start, end + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No free port found in range {start}-{end}")


def _dev_reload_enabled() -> bool:
    """Return whether the development server should use Uvicorn reload.

    Uvicorn reload can propagate a Windows control event to the surrounding
    npm.cmd or VS Code task. Keep Windows development stable by default while
    retaining hot reload on other platforms and an explicit override.
    """
    configured = os.environ.get("BACKEND_RELOAD")
    if configured is not None:
        return configured.strip().lower() in {"1", "true", "yes", "on"}
    return platform.system() != "Windows"


_SIDECAR_SHUTDOWN_COMMAND = "shutdown"
_PACKAGED_GRACEFUL_SHUTDOWN_TIMEOUT_SECONDS = 2


def _watch_sidecar_commands(server: uvicorn.Server, input_stream=None) -> None:
    """Stop Uvicorn when Tauri requests shutdown or closes the command pipe."""
    stream = input_stream if input_stream is not None else sys.stdin
    for line in stream:
        if line.strip() == _SIDECAR_SHUTDOWN_COMMAND:
            logger.info("Tauri requested a graceful backend shutdown")
            server.should_exit = True
            return

    # EOF means the native parent disappeared without sending the command.
    logger.info("Tauri command channel closed; shutting down orphaned backend")
    server.should_exit = True


def _run_packaged_server(selected_port: int) -> None:
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=selected_port,
        log_level="warning",
        # Long-lived SSE responses must not keep packaged shutdown waiting
        # indefinitely after the App asks Uvicorn to exit.
        timeout_graceful_shutdown=_PACKAGED_GRACEFUL_SHUTDOWN_TIMEOUT_SECONDS,
    )
    server = uvicorn.Server(config)
    threading.Thread(
        target=_watch_sidecar_commands,
        args=(server,),
        name="tauri-shutdown-listener",
        daemon=True,
    ).start()
    server.run()
    logger.info("Packaged backend shutdown completed")


def _cleanup():
    try:
        # Do not remove a newer process's file if this project was restarted.
        with open(_DEV_PORT_FILE, encoding="utf-8") as file:
            if file.read().strip() != str(port):
                return
        os.remove(_DEV_PORT_FILE)
    except FileNotFoundError:
        pass


@app.get("/api/hello")
def hello():
    return {"message": "Hello from Python FastAPI!"}


@app.get("/api/sysinfo")
def sysinfo():
    return {
        "os": platform.system(),
        "os_version": platform.version(),
        "python_version": platform.python_version(),
        "machine": platform.machine(),
    }

@app.get("/api/logs/stream")
async def log_stream():
    """SSE 端点：将后端日志实时推送给前端。"""
    _log_queue = get_log_queue()

    async def generate():
        # 发送连接成功标志
        yield f"data: {json.dumps({'stream': 'stdout', 'level': 'SYSTEM', 'text': '── log stream connected ──'})}\n\n"
        while True:
            try:
                item = _log_queue.get_nowait()
                yield f"data: {json.dumps(item)}\n\n"
            except queue.Empty:
                await asyncio.sleep(0.1)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class EchoRequest(BaseModel):
    message: str


@app.post("/api/echo")
def echo(req: EchoRequest):
    logger.info("[echo] R: %s", req.message)
    reply = req.message + " (echo from backend)"
    logger.info("[echo] T: %s", reply)
    return {"message": reply}


@app.post("/api/debug/emit-logs")
def debug_emit_logs():
    """发射各等级的测试日志，供前端 Console 调试使用。"""
    logger.debug("This is a DEBUG message — verbose diagnostic info")
    logger.info("This is an INFO message — normal operation event")
    logger.warning("This is a WARNING message — something looks off")
    logger.error("This is an ERROR message — something failed")
    logger.critical("This is a CRITICAL message — system may be broken")
    return {"emitted": 5}


if __name__ == "__main__":
    t0 = time.perf_counter()
    print(f"[backend] Python: {sys.version}")
    print(f"[backend] Platform: {platform.platform()} ({platform.machine()})")
    print(f"[backend] argv: {sys.argv}")
    print(f"[backend] CWD: {os.getcwd()}")
    print(f"[backend] __file__: {__file__}")
    print(f"[backend] PyInstaller _MEIPASS: {getattr(sys, '_MEIPASS', None)}")
    print(f"[backend] TMPDIR: {os.environ.get('TMPDIR')}")
    sys.stdout.flush()

    t1 = time.perf_counter()
    preferred_port = configured_backend_port()
    port = _find_free_port(start=preferred_port)
    t2 = time.perf_counter()

    # 写临时文件供 dev 模式 Tauri 读取
    with open(_DEV_PORT_FILE, "w") as f:
        f.write(str(port))
    atexit.register(_cleanup)

    # ★ 尽早通知 Tauri 端口
    #   生产模式：此时重量级 router 尚未导入，Tauri 可立即解除 get_backend_port 的等待。
    #   开发模式：router 已在模块级导入完毕，这里时机与以前相同。
    print(f"BACKEND_PORT:{port}", flush=True)
    sys.stdout.flush()

    t3 = time.perf_counter()
    print(f"[backend] Port chosen: {port} (preferred: {preferred_port}, find_free_port: {t2-t1:.3f}s)")
    print(f"[backend] BACKEND_PORT announced at {t3-t0:.3f}s since entry")
    sys.stdout.flush()

    # BACKEND_DEBUG=1 时禁用 reload：uvicorn reload 会 fork 子进程，
    # debugpy 无法在子进程中命中断点。Windows 默认也禁用 reload，避免
    # Uvicorn 的控制事件终止外层 npm.cmd / VS Code 后台任务。
    is_debug = os.environ.get("BACKEND_DEBUG", "0") == "1"
    reload_enabled = _dev_reload_enabled() and not is_debug

    if IS_PACKAGED:
        # ★ 生产模式：在 BACKEND_PORT 打印之后才加载重量级路由
        #   uvicorn 单进程运行，直接传 app 对象，路由此时注册完全有效。
        from routers import notify as notify_router

        app.include_router(notify_router.router)

        t4 = time.perf_counter()
        print(f"[backend] Routers loaded: {t4-t3:.3f}s  total: {t4-t0:.3f}s")
        sys.stdout.flush()

        _run_packaged_server(port)
    elif not reload_enabled:
        reason = (
            "debugpy single-process"
            if is_debug
            else "stable Windows npm/VS Code task mode"
        )
        print(f"[backend] Reload disabled ({reason})", flush=True)
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    else:
        uvicorn.run(
            "main:app",
            host="127.0.0.1",
            port=port,
            reload=True,
            reload_dirs=[os.path.dirname(os.path.abspath(__file__))],
            log_level="info",
        )
