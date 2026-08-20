import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { isTauri } from './api'
import { DragContext } from './dragContext'

/** Provide one window-level Tauri drag listener to all drop-zone controls. */
export function DragProvider({ children }: { children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!isTauri) return

    const unlisteners: Array<() => void> = []
    listen('tauri://drag-enter', () => setIsDragging(true)).then((fn) => unlisteners.push(fn))
    listen('tauri://drag-leave', () => setIsDragging(false)).then((fn) => unlisteners.push(fn))
    listen('tauri://drag-drop', () => setIsDragging(false)).then((fn) => unlisteners.push(fn))

    return () => unlisteners.forEach((unlisten) => unlisten())
  }, [])

  return <DragContext.Provider value={isDragging}>{children}</DragContext.Provider>
}
