import { invoke } from '@tauri-apps/api/core'

export const isTauri = Boolean(
  (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
)
const FALLBACK_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 'http://127.0.0.1:7090'
const BACKEND_READY_TIMEOUT_MS = 30_000
const BACKEND_READY_RETRY_MS = 150
const BACKEND_READY_PROBE_TIMEOUT_MS = 1_000

let _resolvedUrl: string | null = null
// 单例 Promise：所有并发调用共享同一个 IPC，避免启动时多个 hook 重复等待
let _resolvePromise: Promise<string> | null = null

/**
 * The sidecar announces its port before importing heavyweight routers and
 * starting Uvicorn. Wait for the HTTP server to accept requests so initial
 * hooks do not fail once and then remain without data.
 */
async function waitForBackendReady(baseUrl: string): Promise<void> {
  const deadline = Date.now() + BACKEND_READY_TIMEOUT_MS

  while (Date.now() < deadline) {
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      BACKEND_READY_PROBE_TIMEOUT_MS,
    )
    try {
      const response = await fetch(`${baseUrl}/api/hello`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (response.ok) return
    } catch {
      // The sidecar may still be importing dependencies or starting Uvicorn.
    } finally {
      clearTimeout(timeoutId)
    }
    await new Promise(resolve => setTimeout(resolve, BACKEND_READY_RETRY_MS))
  }
}

export async function resolveBackendUrl(): Promise<string> {
  if (_resolvedUrl) return _resolvedUrl
  if (!_resolvePromise) {
    _resolvePromise = (async () => {
      if (isTauri) {
        try {
          const port = await invoke<string>('get_backend_port')
          const url = `http://127.0.0.1:${port}`
          await waitForBackendReady(url)
          return url
        } catch {
          // fall through to fallback
        }
      }
      return FALLBACK_URL
    })().then(url => {
      _resolvedUrl = url
      return url
    })
  }
  return _resolvePromise
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  const base = await resolveBackendUrl()
  const res = await fetch(`${base}${path}`, { method: 'GET' })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(res.status, detail?.detail ?? res.statusText)
  }
  return res.json() as Promise<TResponse>
}

export async function apiPost<TResponse>(
  path: string,
  body: unknown
): Promise<TResponse> {
  const base = await resolveBackendUrl()
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(res.status, detail?.detail ?? res.statusText)
  }
  return res.json() as Promise<TResponse>
}
