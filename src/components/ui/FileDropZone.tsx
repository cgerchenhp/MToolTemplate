import { useRef, useState, useEffect, useCallback } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useDragActive } from '../../lib/dragContext'
import { isTauri } from '../../lib/api'

export interface FileDropZoneProps {
  /** File extensions to accept, e.g. ['.svg', '.png']. Omit to accept any file. */
  accept?: string[]
  /** Called with accepted absolute file paths after a successful drop. */
  onFilesDropped: (paths: string[]) => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
  /** Custom text shown in the drop overlay. */
  hint?: string
}

interface TauriDragPayload {
  paths: string[]
  position: { x: number; y: number }
}

interface TauriDragOverPayload {
  position: { x: number; y: number }
}

export function FileDropZone({
  accept,
  onFilesDropped,
  children,
  className,
  disabled,
  hint,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const isActiveRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingGlobal = useDragActive()

  const filterPaths = useCallback(
    (paths: string[]) => {
      if (!accept || accept.length === 0) return paths
      return paths.filter((p) =>
        accept.some((ext) => p.toLowerCase().endsWith(ext.toLowerCase())),
      )
    },
    [accept],
  )

  /** Check whether a position from a Tauri drag event is over this element.
   *  Tauri v2 drag positions are in physical pixels; divide by devicePixelRatio
   *  to get CSS/logical pixels that match getBoundingClientRect(). */
  const isPositionOver = useCallback((pos: { x: number; y: number }) => {
    if (!containerRef.current) return false
    const rect = containerRef.current.getBoundingClientRect()
    const scale = window.devicePixelRatio || 1
    const x = pos.x / scale
    const y = pos.y / scale
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }, [])

  useEffect(() => {
    if (disabled || !isTauri) return

    const unlisteners: Array<() => void> = []

    // File enters window — check if cursor is already over this zone
    listen<TauriDragPayload>('tauri://drag-enter', (e) => {
      const over = isPositionOver(e.payload.position)
      setIsDragOver(over)
      isActiveRef.current = over
    }).then((fn) => unlisteners.push(fn))

    // File moves — continuously update which zone is "active"
    listen<TauriDragOverPayload>('tauri://drag-over', (e) => {
      const over = isPositionOver(e.payload.position)
      setIsDragOver(over)
      isActiveRef.current = over
    }).then((fn) => unlisteners.push(fn))

    // File leaves the window entirely
    listen('tauri://drag-leave', () => {
      setIsDragOver(false)
      isActiveRef.current = false
    }).then((fn) => unlisteners.push(fn))

    // File dropped
    listen<TauriDragPayload>('tauri://drag-drop', (e) => {
      const wasActive = isActiveRef.current
      setIsDragOver(false)
      isActiveRef.current = false

      if (!wasActive) return
      const accepted = filterPaths(e.payload.paths)
      console.log('[FileDropZone] drop — all paths:', e.payload.paths, ' accepted:', accepted)
      if (accepted.length > 0) onFilesDropped(accepted)
    }).then((fn) => unlisteners.push(fn))

    return () => unlisteners.forEach((fn) => fn())
  }, [disabled, filterPaths, isPositionOver, onFilesDropped])

  // Keep HTML5 onDragOver preventDefault to stop the browser from trying to
  // navigate to the dropped file URL (belt-and-suspenders).
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  return (
    <div
      ref={containerRef}
      className={[
        'relative transition-all duration-150',
        isDragOver && !disabled
          ? 'ring-2 ring-blue-500 ring-offset-1 rounded-xl'
          : isDraggingGlobal && !disabled
          ? 'ring-2 ring-dashed ring-blue-400/60 rounded-xl'
          : '',
        className ?? '',
      ].join(' ')}
      onDragOver={handleDragOver}
    >
      {children}
      {/* 全局拖拽活跃但未悬停：轻提示层 */}
      {isDraggingGlobal && !isDragOver && !disabled && (
        <div className="absolute inset-0 z-10 rounded-xl border-2 border-dashed border-blue-400/50 bg-blue-50/10 dark:bg-blue-950/20 pointer-events-none" />
      )}
      {isDragOver && !disabled && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-500 bg-blue-50/90 dark:bg-blue-950/80 pointer-events-none">
          <div className="flex flex-col items-center gap-1.5 rounded-lg bg-white/95 dark:bg-gray-900/95 px-5 py-3 shadow-xl">
            <svg
              className="h-5 w-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
              {hint ?? '释放以添加文件'}
            </span>
            {accept && accept.length > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {accept.join(' · ')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}



