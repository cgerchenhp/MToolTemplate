import { useEffect, useState } from 'react'

export interface WaitingStage {
  afterSeconds: number
  message: string
}

export interface AsyncWaitingNoticeProps {
  title?: string
  stages?: readonly WaitingStage[]
  compact?: boolean
  showElapsed?: boolean
  formatElapsed?: (elapsedSeconds: number) => string
  className?: string
}

const DEFAULT_STAGES: readonly WaitingStage[] = [
  { afterSeconds: 0, message: '请求已发送，正在等待处理结果。' },
  { afterSeconds: 5, message: '处理时间可能稍长，请稍候。' },
  { afterSeconds: 20, message: '服务仍在处理；网络或任务负载较高时可能需要更久。' },
]

/** Pending-state notice whose detail evolves as the task takes longer. */
export function AsyncWaitingNotice({
  title = '正在处理…',
  stages = DEFAULT_STAGES,
  compact = false,
  showElapsed = true,
  formatElapsed = seconds => `${seconds} 秒`,
  className,
}: AsyncWaitingNoticeProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const detail = [...stages]
    .sort((left, right) => right.afterSeconds - left.afterSeconds)
    .find(stage => elapsedSeconds >= stage.afterSeconds)?.message

  return (
    <div
      className={[
        'border border-blue-200 bg-white/95 text-blue-950 shadow-lg shadow-blue-950/10 backdrop-blur dark:border-blue-900 dark:bg-gray-900/95 dark:text-blue-100',
        compact
          ? 'flex max-w-[min(34rem,calc(100vw-2rem))] items-center gap-3 rounded-xl px-3 py-2'
          : 'w-full max-w-md rounded-2xl px-5 py-4 text-left',
        className,
      ].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <svg className={['shrink-0 animate-spin text-blue-500', compact ? 'h-4 w-4' : 'h-5 w-5'].join(' ')} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className={compact ? 'truncate text-xs font-medium' : 'text-sm font-semibold'}>{title}</p>
        {detail && <p className={['text-gray-500 dark:text-gray-400', compact ? 'mt-0.5 truncate text-[10px]' : 'mt-1 text-xs leading-5'].join(' ')}>{detail}</p>}
      </div>
      {showElapsed && (
        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium tabular-nums text-blue-600 dark:bg-blue-950/70 dark:text-blue-300" aria-hidden="true">
          {elapsedSeconds > 0 ? formatElapsed(elapsedSeconds) : '已发送'}
        </span>
      )}
    </div>
  )
}
