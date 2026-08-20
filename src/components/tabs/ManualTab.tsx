import { apiPost, ApiError } from '../../lib/api'
import { useState } from 'react'

interface EchoResponse {
  message: string
}

interface EmitLogsResponse {
  emitted: number
}

export function ManualTab() {
  const [backendResult, setResult] = useState<EchoResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [emitting, setEmitting] = useState(false)

  async function handleGetHealth() {
    const payload = { message: "Hello from frontend!" }
    console.log('[ManualTab] Sending to backend:', payload)
    setLoading(true)
    setIsError(false)
    try {
      const data = await apiPost<EchoResponse>('/api/echo', payload)
      console.log('[ManualTab] Received from backend:', data)
      setResult(data)
    } catch (e) {
      const err = e instanceof ApiError ? { message: e.message } : { message: String(e) }
      console.error('[ManualTab] Error:', err)
      setResult(err)
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleEmitLogs() {
    setEmitting(true)
    try {
      const data = await apiPost<EmitLogsResponse>('/api/debug/emit-logs', {})
      console.log('[ManualTab] Emitted', data.emitted, 'log lines')
    } catch (e) {
      console.error('[ManualTab] emit-logs error:', e)
    } finally {
      setEmitting(false)
    }
  }

  return (
    <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 auto-rows-min">
      <button
        className="bg-blue-500 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
        onClick={handleGetHealth}
        disabled={loading}
      >
        {loading ? 'Sending…' : 'Send Echo'}
      </button>
      {backendResult && (
        <p className={isError ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>
          {backendResult.message}
        </p>
      )}

      <button
        className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
        onClick={handleEmitLogs}
        disabled={emitting}
      >
        {emitting ? '发送中…' : '发射测试日志（各级别）'}
      </button>
    </div>
  )
}
