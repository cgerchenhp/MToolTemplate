import { useEffect, useRef, useState } from 'react'
import { resolveBackendUrl } from '../lib/api'

export interface LogLine {
  id: number
  stream: 'stdout' | 'stderr'
  level: string  // 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'SYSTEM'
  text: string
}

const MAX_LINES = 500

export function useBackendLog(): LogLine[] {
  const [lines, setLines] = useState<LogLine[]>([])
  const counter = useRef(0)

  useEffect(() => {
    let es: EventSource | null = null
    let cancelled = false

    resolveBackendUrl().then(base => {
      if (cancelled) return
      es = new EventSource(`${base}/api/logs/stream`)
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as {
            stream: 'stdout' | 'stderr'
            text: string
            level?: string
          }
          const line: LogLine = {
            id: counter.current++,
            stream: data.stream,
            level: data.level ?? (data.stream === 'stderr' ? 'ERROR' : 'INFO'),
            text: data.text,
          }
          setLines(prev => {
            const next = [...prev, line]
            return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next
          })
        } catch {
          // ignore malformed events
        }
      }
      es.onerror = () => {
        // EventSource 会自动重试，无需手动处理
      }
    })

    return () => {
      cancelled = true
      es?.close()
    }
  }, [])

  return lines
}
