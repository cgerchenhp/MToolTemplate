import type { BackendConnectionStatus } from '../hooks/useBackendStatus'

const STATUS_CONFIG: Record<
  BackendConnectionStatus,
  { dotClass: string; label: string; animate: boolean }
> = {
  connecting: { dotClass: 'bg-yellow-400', label: '连接中…', animate: true },
  connected:  { dotClass: 'bg-green-500',  label: '后端已连接', animate: false },
  disconnected: { dotClass: 'bg-red-500',  label: '后端未连接', animate: false },
}

interface BackendStatusBadgeProps {
  status: BackendConnectionStatus
  latency: number | null
  url: string
}

export function BackendStatusBadge({ status, latency, url }: BackendStatusBadgeProps) {
  const { dotClass, animate } = STATUS_CONFIG[status]

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 select-none"
      title={status === 'connected' ? `后端已连接: ${url} (${latency} ms)` : `后端地址: ${url}`}
      // title={`后端地址: ${url}`}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotClass}${animate ? ' animate-pulse' : ''}`}
      />
      {/* <span>{label}</span>
      {status === 'connected' && latency !== null && (
        <span className="text-gray-400">({latency} ms)</span>
      )} */}
    </div>
  )
}
