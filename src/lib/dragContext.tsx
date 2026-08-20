import { createContext, useContext, useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { isTauri } from './api'

/**
 * DragContext — 全局文件拖拽状态。
 *
 * 在应用根部挂载一次 `DragProvider`，所有 FileDropZone（及未来的其他 DropZone）
 * 通过 `useDragActive()` 消费，当窗口内有拖拽进行时统一高亮，无需每个控件重复注册
 * window 级事件。
 */
const DragContext = createContext(false)

export function DragProvider({ children }: { children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!isTauri) return

    const unlisteners: Array<() => void> = []

    listen('tauri://drag-enter', () => setIsDragging(true)).then((fn) =>
      unlisteners.push(fn),
    )
    listen('tauri://drag-leave', () => setIsDragging(false)).then((fn) =>
      unlisteners.push(fn),
    )
    listen('tauri://drag-drop', () => setIsDragging(false)).then((fn) =>
      unlisteners.push(fn),
    )

    return () => unlisteners.forEach((fn) => fn())
  }, [])

  return <DragContext.Provider value={isDragging}>{children}</DragContext.Provider>
}

/** 当前窗口内是否有活跃的文件拖拽操作 */
export const useDragActive = () => useContext(DragContext)
