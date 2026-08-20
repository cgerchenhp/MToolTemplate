import { useCallback, useEffect, useState, type CSSProperties, type MouseEvent } from 'react'

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

/** Full-screen image lightbox with keyboard navigation. */
export function ImageLightbox({
  src,
  alt,
  onClose,
  images,
  activeIndex = 0,
  onNavigate,
}: ImageLightboxProps) {
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null)
  const currentImage = images?.[activeIndex] ?? { src, alt }
  const canNavigateBack = Boolean(onNavigate && activeIndex > 0)
  const canNavigateForward = Boolean(onNavigate && images && activeIndex < images.length - 1)
  const navigateTo = useCallback((index: number) => {
    setImageMeta(null)
    onNavigate?.(index)
  }, [onNavigate])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft' && canNavigateBack) navigateTo(activeIndex - 1)
      if (event.key === 'ArrowRight' && canNavigateForward) navigateTo(activeIndex + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeIndex, canNavigateBack, canNavigateForward, navigateTo, onClose])

  const navigate = (index: number) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    navigateTo(index)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <button
        type="button"
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-xl leading-none text-white transition-colors hover:bg-black/70"
        onClick={onClose}
        aria-label="关闭图片预览"
        title="关闭"
      >
        ×
      </button>
      <div className="relative flex flex-col items-center px-4" onClick={event => event.stopPropagation()}>
        {images && images.length > 1 && (
          <>
            <button type="button" className="absolute left-5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-2xl leading-none text-white transition-colors hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-30" onClick={navigate(activeIndex - 1)} disabled={!canNavigateBack} aria-label="上一张图片" title="上一张图片（←）">‹</button>
            <button type="button" className="absolute right-5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-2xl leading-none text-white transition-colors hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-30" onClick={navigate(activeIndex + 1)} disabled={!canNavigateForward} aria-label="下一张图片" title="下一张图片（→）">›</button>
          </>
        )}
        <img
          src={currentImage.src}
          alt={currentImage.alt ?? '图片预览'}
          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          onLoad={event => {
            const image = event.currentTarget
            setImageMeta({ width: image.naturalWidth, height: image.naturalHeight })
          }}
        />
        {(currentImage.alt || imageMeta || (images && images.length > 1)) && (
          <div className="mt-2 max-w-[90vw] text-center">
            {currentImage.alt && <p className="truncate text-sm text-gray-300">{currentImage.alt}</p>}
            {imageMeta && <p className="mt-0.5 text-xs text-gray-400">{imageMeta.width} × {imageMeta.height}</p>}
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
