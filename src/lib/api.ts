import { invoke } from '@tauri-apps/api/core'

export const isTauri = Boolean(
  (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
)
const FALLBACK_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 'http://127.0.0.1:7090'

let _resolvedUrl: string | null = null
// 单例 Promise：所有并发调用共享同一个 IPC，避免启动时多个 hook 重复等待
let _resolvePromise: Promise<string> | null = null

export async function resolveBackendUrl(): Promise<string> {
  if (_resolvedUrl) return _resolvedUrl
  if (!_resolvePromise) {
    _resolvePromise = (async () => {
      if (isTauri) {
        try {
          const port = await invoke<string>('get_backend_port')
          return `http://127.0.0.1:${port}`
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
