import asyncio
import json
import logging
import queue
import threading

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notify", tags=["notify"])

# 广播订阅者集合：每个 SSE 连接拥有独立 queue，push 时广播到全部
_subscribers: set[queue.Queue] = set()
_sub_lock = threading.Lock()


# ── 消息格式 ─────────────────────────────────────────────────────────────────

class NotifyMessage(BaseModel):
    """后端 → 前端的结构化推送消息。

    type   : 消息类型标识，前端根据此字段分发处理逻辑。
    payload: 类型相关的载荷，具体字段由 type 决定。
处理中
第 10 次调用
11:51:03

    已定义的 type 及其 payload 结构：
    - "connected"     : {} — SSE 连接建立确认（由服务端自动发送）
    - "button_update" : {"label": str, "variant": "success"|"warning"|"danger"}
                         — 指示前端更新指定按钮的文字和颜色
    """

    type: str = Field(..., description="消息类型标识")
    payload: dict = Field(default_factory=dict, description="类型相关载荷")


# ── 推送工具函数 ──────────────────────────────────────────────────────────────

def push_notification(msg: NotifyMessage) -> None:
    """从任意模块调用，向前端推送一条结构化通知。

    采用广播模式：消息会被复制到每个活跃 SSE 连接的独立队列中，
    避免单队列被已断连的旧消费者抢占导致消息丢失。

    Example::
        push_notification(NotifyMessage(
            type="button_update",
            payload={"label": "处理完成 ✓", "variant": "success"},
        ))
    """
    data = msg.model_dump()
    with _sub_lock:
        for q in list(_subscribers):
            try:
                q.put_nowait(data)
            except queue.Full:
                logger.warning("[notify] subscriber queue full, dropping message")
    logger.info("[notify] pushed: type=%s → %d subscribers", msg.type, len(_subscribers))


# ── 路由 ─────────────────────────────────────────────────────────────────────

@router.get("/stream")
async def notify_stream():
    """SSE 端点：保持长连接，将结构化通知实时推送到前端。

    每个连接拥有独立队列，push_notification() 会广播到所有活跃连接，
    避免断连重连期间消息被旧消费者抢占丢失。
    """

    async def generate():
        sub_q: queue.Queue = queue.Queue(maxsize=256)
        with _sub_lock:
            _subscribers.add(sub_q)
        logger.info("[notify] SSE subscriber added (total=%d)", len(_subscribers))

        try:
            # 连接建立确认
            connected = NotifyMessage(type="connected", payload={})
            yield f"data: {json.dumps(connected.model_dump())}\n\n"

            while True:
                try:
                    item = sub_q.get_nowait()
                    yield f"data: {json.dumps(item)}\n\n"
                except queue.Empty:
                    await asyncio.sleep(0.1)
        finally:
            with _sub_lock:
                _subscribers.discard(sub_q)
            logger.info("[notify] SSE subscriber removed (total=%d)", len(_subscribers))

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/push", response_model=NotifyMessage)
def push_message(msg: NotifyMessage) -> NotifyMessage:
    """接收外部推送（例如 VS Code 插件），将消息转发到 SSE 流。"""
    push_notification(msg)
    return msg


class TriggerResponse(BaseModel):
    status: str = Field(..., description="调度状态")
    delay_seconds: int = Field(..., description="预计推送延迟（秒）")


@router.post("/trigger", response_model=TriggerResponse)
async def trigger_demo() -> TriggerResponse:
    """演示接口：立即返回，2 秒后通过 SSE 向前端推送 button_update 通知。

    用于验证「后端主动推送 → 前端响应」的完整链路。
    """

    async def _delayed_push():
        await asyncio.sleep(2)
        push_notification(NotifyMessage(
            type="button_update",
            payload={"label": "后端已响应 ✓", "variant": "success"},
        ))

    asyncio.create_task(_delayed_push())
    return TriggerResponse(status="scheduled", delay_seconds=2)
