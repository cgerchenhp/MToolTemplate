import { useState, useEffect } from 'react'
import { resolveBackendUrl } from '../lib/api'

export type BackendConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface BackendStatusInfo {
  status: BackendConnectionStatus
  latency: number | null
  url: string
}

const PING_INTERVAL_MS = 5000
const TIMEOUT_MS = 3000

export function useBackendStatus(): BackendStatusInfo {
  const [status, setStatus] = useState<BackendConnectionStatus>('connecting')
  const [latency, setLatency] = useState<number | null>(null)
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval>

    const start = async () => {
      const resolvedUrl = await resolveBackendUrl()
      if (cancelled) return
      setUrl(resolvedUrl)

      const ping = async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
        const t0 = Date.now()

        try {
          const res = await fetch(`${resolvedUrl}/api/hello`, {
            signal: controller.signal,
            cache: 'no-store',
          })
          clearTimeout(timeoutId)
          if (!cancelled) {
            if (res.ok) {
              setStatus('connected')
              setLatency(Date.now() - t0)
            } else {
              setStatus('disconnected')
              setLatency(null)
            }
          }
        } catch {
          clearTimeout(timeoutId)
          if (!cancelled) {
            setStatus('disconnected')
            setLatency(null)
          }
        }
      }

      ping()
      intervalId = setInterval(ping, PING_INTERVAL_MS)
    }

    start()

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [])

  return { status, latency, url }
}
