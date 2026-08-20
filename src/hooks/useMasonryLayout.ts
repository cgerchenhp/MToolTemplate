import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'

interface CardPosition {
  left: number
  top: number
  width: number
}

interface MasonryLayout {
  containerRef: React.RefObject<HTMLDivElement | null>
  cardRefs: React.RefObject<(HTMLDivElement | null)[]>
  positions: CardPosition[]
  containerHeight: number
}

export function useMasonryLayout(cardCount: number, colMinWidth = 388, gap = 8): MasonryLayout {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [positions, setPositions] = useState<CardPosition[]>([])
  const [containerHeight, setContainerHeight] = useState(0)

  const recalculate = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const style = getComputedStyle(container)
    const pl = parseFloat(style.paddingLeft) || 0
    const pr = parseFloat(style.paddingRight) || 0
    const pt = parseFloat(style.paddingTop) || 0
    const pb = parseFloat(style.paddingBottom) || 0

    const availableWidth = container.clientWidth - pl - pr
    const colCount = Math.max(1, Math.floor((availableWidth + gap) / (colMinWidth + gap)))
    const colWidth = (availableWidth - gap * (colCount - 1)) / colCount
    const colHeights = Array(colCount).fill(pt)

    const newPositions: CardPosition[] = []

    for (let i = 0; i < cardCount; i++) {
      const colIndex = i % colCount
      const left = pl + colIndex * (colWidth + gap)
      const top = colHeights[colIndex]

      newPositions.push({ left, top, width: colWidth })

      const cardEl = cardRefs.current[i]
      const cardHeight = cardEl ? cardEl.offsetHeight : 0
      colHeights[colIndex] += cardHeight + (cardHeight > 0 ? gap : 0)
    }

    setPositions(newPositions)
    setContainerHeight(Math.max(...colHeights) - gap + pb)
  }, [cardCount, colMinWidth, gap])

  // ── 初始同步计算（在浏览器首次绘制前完成）────────────────────
  // 使用 useLayoutEffect 确保 positions 在第一帧就已就绪，
  // 避免首帧 visibility:hidden → 下一帧才可见 导致的高 LCP。
  useLayoutEffect(() => {
    // DOM measurement must synchronously update layout before the browser paints.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recalculate()
  }, [recalculate])

  // ── 后续 ResizeObserver：监听容器和卡片尺寸变化 ──────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const containerObserver = new ResizeObserver(recalculate)
    containerObserver.observe(container)

    const cardObservers: ResizeObserver[] = []
    cardRefs.current.forEach((card) => {
      if (!card) return
      const obs = new ResizeObserver(recalculate)
      obs.observe(card)
      cardObservers.push(obs)
    })

    return () => {
      containerObserver.disconnect()
      cardObservers.forEach((obs) => obs.disconnect())
    }
  }, [recalculate])

  return { containerRef, cardRefs, positions, containerHeight }
}
