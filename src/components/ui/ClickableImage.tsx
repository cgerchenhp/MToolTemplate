import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

const MIN_LIGHTBOX_ZOOM = 1
const MAX_LIGHTBOX_ZOOM = 4
const LIGHTBOX_ZOOM_STEP = 0.25

export interface LightboxImage {
  src: string
  alt?: string
}

interface ImageLightboxProps {
  src: string
  alt?: string
  onClose: () => void
  images?: LightboxImage[]
  activeIndex?: number
  onNavigate?: (index: number) => void
}

/** Full-screen image lightbox with zoom, pan, and keyboard navigation. */
export function ImageLightbox({
  src,
  alt,
  onClose,
  images,
  activeIndex = 0,
  onNavigate,
}: ImageLightboxProps) {
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null)
  const [renderedImageSize, setRenderedImageSize] = useState<{ width: number; height: number } | null>(null)
  const [zoom, setZoom] = useState(MIN_LIGHTBOX_ZOOM)
  const [isPanning, setIsPanning] = useState(false)
  const imageViewportRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
  const zoomAnchorRef = useRef<{ widthRatio: number; heightRatio: number; centerX: number; centerY: number } | null>(null)
  const currentImage = images?.[activeIndex] ?? { src, alt }
  const canNavigateBack = Boolean(onNavigate && activeIndex > 0)
  const canNavigateForward = Boolean(onNavigate && images && activeIndex < images.length - 1)

  const navigateTo = useCallback((index: number) => {
    setImageMeta(null)
    setRenderedImageSize(null)
    setZoom(MIN_LIGHTBOX_ZOOM)
    onNavigate?.(index)
  }, [onNavigate])

  const zoomAtViewportCenter = useCallback((direction: 1 | -1) => {
    const viewport = imageViewportRef.current
    const nextZoom = Math.min(
      MAX_LIGHTBOX_ZOOM,
      Math.max(MIN_LIGHTBOX_ZOOM, zoom + direction * LIGHTBOX_ZOOM_STEP),
    )
    if (!viewport || nextZoom === zoom) return

    const centerX = viewport.clientWidth / 2
    const centerY = viewport.clientHeight / 2
    zoomAnchorRef.current = {
      widthRatio: viewport.scrollWidth > 0 ? (viewport.scrollLeft + centerX) / viewport.scrollWidth : 0.5,
      heightRatio: viewport.scrollHeight > 0 ? (viewport.scrollTop + centerY) / viewport.scrollHeight : 0.5,
      centerX,
      centerY,
    }
    setZoom(nextZoom)
  }, [zoom])

  useLayoutEffect(() => {
    const viewport = imageViewportRef.current
    const anchor = zoomAnchorRef.current
    if (!viewport || !anchor) return
    viewport.scrollLeft = anchor.widthRatio * viewport.scrollWidth - anchor.centerX
    viewport.scrollTop = anchor.heightRatio * viewport.scrollHeight - anchor.centerY
    zoomAnchorRef.current = null
  }, [zoom])

  useEffect(() => {
    const viewport = imageViewportRef.current
    if (!viewport) return
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || event.deltaY === 0) return
      event.preventDefault()
      event.stopPropagation()
      zoomAtViewportCenter(event.deltaY < 0 ? 1 : -1)
    }
    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [zoomAtViewportCenter])

  const beginPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = imageViewportRef.current
    if (!viewport || event.button !== 0 || zoom <= MIN_LIGHTBOX_ZOOM) return
    event.preventDefault()
    event.stopPropagation()
    panRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsPanning(true)
  }

  const updatePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = imageViewportRef.current
    const pan = panRef.current
    if (!viewport || !pan || pan.pointerId !== event.pointerId) return
    event.preventDefault()
    viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.x)
    viewport.scrollTop = pan.scrollTop - (event.clientY - pan.y)
  }

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    panRef.current = null
    setIsPanning(false)
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onClose()
        return
      }
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (canNavigateForward) navigateTo(activeIndex + 1)
        else onClose()
        return
      }
      if (event.key === '+' || event.code === 'NumpadAdd') {
        event.preventDefault()
        event.stopImmediatePropagation()
        zoomAtViewportCenter(1)
        return
      }
      if (event.key === '-' || event.code === 'NumpadSubtract') {
        event.preventDefault()
        event.stopImmediatePropagation()
        zoomAtViewportCenter(-1)
        return
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (event.key === 'ArrowLeft' && canNavigateBack) navigateTo(activeIndex - 1)
        if (event.key === 'ArrowRight' && canNavigateForward) navigateTo(activeIndex + 1)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [activeIndex, canNavigateBack, canNavigateForward, navigateTo, onClose, zoomAtViewportCenter])

  const navigate = (index: number) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    navigateTo(index)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      data-image-lightbox="true"
      role="dialog"
      aria-modal="true"
      aria-label={alt ? `图片预览：${alt}` : '图片预览'}
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-xl leading-none text-white transition-colors hover:bg-black/70"
        onClick={onClose}
        aria-label="关闭图片预览"
        title="关闭"
      >
        ×
      </button>
      <div className="relative h-full w-full" onClick={event => event.stopPropagation()}>
        {images && images.length > 1 && (
          <>
            <button type="button" className="absolute left-5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-2xl leading-none text-white transition-colors hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-30" onClick={navigate(activeIndex - 1)} disabled={!canNavigateBack} aria-label="上一张图片" title="上一张图片（←）">‹</button>
            <button type="button" className="absolute right-5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-2xl leading-none text-white transition-colors hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-30" onClick={navigate(activeIndex + 1)} disabled={!canNavigateForward} aria-label="下一张图片" title="下一张图片（→）">›</button>
          </>
        )}
        <div
          ref={imageViewportRef}
          className={[
            'h-full w-full touch-none overflow-auto overscroll-contain',
            zoom > MIN_LIGHTBOX_ZOOM
              ? isPanning ? 'cursor-grabbing' : 'cursor-grab'
              : 'cursor-default',
          ].join(' ')}
          data-image-lightbox-zoom={Math.round(zoom * 100)}
          onPointerDown={beginPan}
          onPointerMove={updatePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onLostPointerCapture={() => {
            panRef.current = null
            setIsPanning(false)
          }}
        >
          <div className="grid h-max min-h-full w-max min-w-full place-items-center">
            <img
              src={currentImage.src}
              alt={currentImage.alt ?? '图片预览'}
              draggable={false}
              className="max-h-screen max-w-full shrink-0 select-none object-contain shadow-2xl"
              style={renderedImageSize ? {
                width: `${renderedImageSize.width * zoom}px`,
                height: `${renderedImageSize.height * zoom}px`,
                maxWidth: 'none',
                maxHeight: 'none',
              } : undefined}
              onLoad={event => {
                const image = event.currentTarget
                setImageMeta({ width: image.naturalWidth, height: image.naturalHeight })
                const bounds = image.getBoundingClientRect()
                setRenderedImageSize({ width: bounds.width, height: bounds.height })
              }}
            />
          </div>
        </div>
        {(currentImage.alt || imageMeta || (images && images.length > 1)) && (
          <div className="pointer-events-none absolute inset-x-16 bottom-3 mx-auto max-w-[min(90vw,56rem)] rounded-lg bg-black/55 px-3 py-1.5 text-center backdrop-blur-sm">
            {currentImage.alt && <p className="truncate text-sm text-gray-300">{currentImage.alt}</p>}
            {imageMeta && <p className="mt-0.5 text-xs text-gray-400">{imageMeta.width} × {imageMeta.height} · {Math.round(zoom * 100)}%</p>}
            {images && images.length > 1 && <p className="mt-0.5 text-xs text-gray-400">{activeIndex + 1} / {images.length}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

interface ClickableImageProps {
  src: string
  alt?: string
  className?: string
  style?: CSSProperties
  /** Lets an enclosing ImageGrid manage the lightbox state. */
  onOpen?: () => void
}

/** Image that opens a full-screen lightbox when clicked. */
export function ClickableImage({ src, alt, className = '', style, onOpen }: ClickableImageProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-zoom-in select-none transition-opacity hover:opacity-90 ${className}`}
        style={style}
        draggable={false}
        title={alt ? `${alt}（点击放大）` : '点击放大'}
        onClick={() => (onOpen ? onOpen() : setOpen(true))}
      />
      {open && !onOpen && <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  )
}
