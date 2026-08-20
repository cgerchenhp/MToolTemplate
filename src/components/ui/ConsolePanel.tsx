import { useCallback, useEffect, useRef, useState } from 'react'

interface ConsolePanelProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

const MIN_HEIGHT = 80
const DEFAULT_HEIGHT = 220

export function ConsolePanel({ open, children }: Omit<ConsolePanelProps, 'onClose'> & { onClose?: () => void }) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const draggingRef = useRef(false)
  const startYRef = useRef(0)
  const startHRef = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      draggingRef.current = true
      startYRef.current = e.clientY
      startHRef.current = height
      e.preventDefault()
    },
    [height],
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      // 向上拖 → panel 变高（delta 为正代表增高）
      const delta = startYRef.current - e.clientY
      const maxHeight = Math.round(window.innerHeight * 0.7)
      setHeight(Math.round(Math.min(maxHeight, Math.max(MIN_HEIGHT, startHRef.current + delta))))
    }
    const handleMouseUp = () => {
      draggingRef.current = false
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  if (!open) return null

  return (
    <div
      className="flex flex-col shrink-0 border-t border-gray-700 bg-gray-950"
      style={{ height }}
    >
      {/* ── Drag handle ── */}
      <div
        className="h-1 shrink-0 cursor-row-resize bg-gray-800 hover:bg-blue-500 active:bg-blue-400 transition-colors"
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      />



      {/* ── Log content ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
