import { useState, useEffect, useCallback } from 'react'

/** 可用缩放级别（相对于 16px 基准的百分比） */
const SCALE_LEVELS = [50, 58, 67, 77, 89, 100, 115, 132, 152, 175, 200] as const
const DEFAULT_INDEX = 5 // 100%
const STORAGE_KEY = 'ui-scale-index'

export function useUiScale() {
  const [index, setIndex] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      const idx = parseInt(stored, 10)
      if (idx >= 0 && idx < SCALE_LEVELS.length) return idx
    }
    return DEFAULT_INDEX
  })

  // 将百分比写入 html font-size，Tailwind rem 单位自动跟随
  useEffect(() => {
    document.documentElement.style.fontSize = `${SCALE_LEVELS[index]}%`
    localStorage.setItem(STORAGE_KEY, String(index))
  }, [index])

  const zoomIn = useCallback(() => setIndex(i => Math.min(i + 1, SCALE_LEVELS.length - 1)), [])
  const zoomOut = useCallback(() => setIndex(i => Math.max(i - 1, 0)), [])
  const resetZoom = useCallback(() => setIndex(DEFAULT_INDEX), [])

  return {
    scale: SCALE_LEVELS[index],
    isMin: index === 0,
    isMax: index === SCALE_LEVELS.length - 1,
    zoomIn,
    zoomOut,
    resetZoom,
  }
}
