import { useEffect, useRef } from 'react'
import { resolveBackendUrl } from '../lib/api'

/**
 * 后端 → 前端结构化推送消息格式。
 * 与 backend/routers/notify.py 中的 NotifyMessage 一一对应。
 *
 * 已定义的 type：
 * - "connected"     : SSE 连接建立确认（自动忽略，不触发回调）
 * - "button_update" : payload = { label: string, variant: "success" | "warning" | "danger" }
 */
export interface NotifyMessage {
  type: string
  payload: Record<string, unknown>
}

/**
 * 订阅后端 SSE 通知流。
 *
 * 组件挂载时建立 EventSource 长连接，卸载时自动关闭。
 * `onMessage` 使用 ref 捕获，无需 useCallback 包裹。
 *
 * @example
 * useNotify((msg) => {
 *   if (msg.type === 'button_update') { ... }
 * })
 */
export function useNotify(onMessage: (msg: NotifyMessage) => void): void {
  // 使用 ref 持有最新回调，避免重新创建 EventSource
  const callbackRef = useRef(onMessage)
  callbackRef.current = onMessage

  useEffect(() => {
    let es: EventSource | null = null
    let cancelled = false

    resolveBackendUrl().then(base => {
      if (cancelled) return
      es = new EventSource(`${base}/api/notify/stream`)

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as NotifyMessage
          // "connected" 是连接确认，不触发业务回调
          if (msg.type !== 'connected') {
            callbackRef.current(msg)
          }
        } catch {
          // 忽略非 JSON 帧
        }
      }

      es.onerror = () => {
        // 断线后浏览器会自动重连，此处仅打日志
        console.warn('[useNotify] SSE connection error, browser will retry')
      }
    })

    return () => {
      cancelled = true
      es?.close()
    }
  }, []) // 仅在挂载/卸载时执行
}
