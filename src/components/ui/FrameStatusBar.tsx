import { useMemo } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

/** OCR 帧处理状态 */
export type FrameStatus = 'processing' | 'discarded' | 'completed' | 'failed'

/** 单帧状态记录 */
export interface FrameDot {
  id: number
  status: FrameStatus
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const DOT_CLASS: Record<FrameStatus, string> = {
  processing: 'bg-blue-500 animate-pulse',
  discarded:  'bg-amber-400 dark:bg-amber-500',
  completed:  'bg-green-500',
  failed:     'bg-red-500',
}

const LEGEND_BG: Record<FrameStatus, string> = {
  processing: 'bg-blue-500',
  discarded:  'bg-amber-400',
  completed:  'bg-green-500',
  failed:     'bg-red-500',
}

const STATUS_LABEL: Record<FrameStatus, string> = {
  processing: '识别中',
  discarded:  '已丢弃',
  completed:  '完成',
  failed:     '失败',
}

// ── Component ──────────────────────────────────────────────────────────────────

interface FrameStatusBarProps {
  frames: FrameDot[]
  /**
   * 最多显示的帧数（超出时保留最新的，旧帧从左侧移出）。
   * 默认 60，约一行半显示宽度。
   */
  maxVisible?: number
  className?: string
}

/**
 * FrameStatusBar — 走马灯帧状态条。
 *
 * 显示 OCR 处理过程中各帧的状态：识别中 / 已丢弃 / 完成 / 失败。
 * 每帧用一个小方块表示，新帧从右侧推入，超出 `maxVisible` 时
 * 最旧的帧从左侧移出，形成走马灯效果。
 *
 * @example
 * <FrameStatusBar frames={frameDots} />
 */
export function FrameStatusBar({ frames, maxVisible = 60, className = '' }: FrameStatusBarProps) {
  // 新帧在 frames 数组前端，取前 maxVisible 个（最新的）
  const visible = frames.slice(0, maxVisible)

  const stats = useMemo(() => {
    const c: Record<FrameStatus, number> = { processing: 0, discarded: 0, completed: 0, failed: 0 }
    for (const f of frames) c[f.status]++
    return c
  }, [frames])

  if (frames.length === 0) return null

  const legendEntries = (['completed', 'discarded', 'failed', 'processing'] as FrameStatus[])
    .filter(s => stats[s] > 0)

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* 方块走马灯：新帧追加到右侧，flex-wrap 自然换行 */}
      <div className="flex flex-wrap gap-0.75 leading-none">
        {visible.map(f => (
          <div
            key={f.id}
            className={`w-2 h-2 rounded-sm shrink-0 transition-colors duration-200 ${DOT_CLASS[f.status]}`}
            title={`帧 #${f.id} · ${STATUS_LABEL[f.status]}`}
          />
        ))}
      </div>

      {/* 图例 + 统计 */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {legendEntries.map(s => (
          <span
            key={s}
            className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 select-none"
          >
            <span className={`w-1.5 h-1.5 rounded-sm shrink-0 ${LEGEND_BG[s]}`} />
            {stats[s]} {STATUS_LABEL[s]}
          </span>
        ))}
        {frames.length > maxVisible && (
          <span className="text-[10px] text-gray-300 dark:text-gray-600 select-none">
            （显示最近 {maxVisible} 帧，共 {frames.length} 帧）
          </span>
        )}
      </div>
    </div>
  )
}
