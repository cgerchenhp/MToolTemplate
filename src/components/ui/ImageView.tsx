import { useRef, useState } from 'react'
import { FileDropZone } from './FileDropZone'
import { useDragActive } from '../../lib/dragContext'

// ── Utility ──────────────────────────────────────────────────────────────────

/**
 * Convert raw RGBA pixel data to a PNG data URL via an off-screen Canvas.
 *
 * @param pixels  RGBA bytes: 4 bytes per pixel, row-major order.
 *                Accepts Uint8ClampedArray, Uint8Array, or number[].
 * @param width   Image width in pixels.
 * @param height  Image height in pixels.
 * @returns       `data:image/png;base64,…` string, ready to use as `<img src>`.
 *
 * @example
 * // Backend sends { pixels: [...], width: 64, height: 64 }
 * const dataUrl = pixelsToDataUrl(response.pixels, response.width, response.height)
 * setImageSrc(dataUrl)
 */
export function pixelsToDataUrl(
  pixels: Uint8ClampedArray | Uint8Array | number[],
  width: number,
  height: number,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')
  // Always construct from plain Array to guarantee Uint8ClampedArray<ArrayBuffer>
  // (avoids SharedArrayBuffer type incompatibility with ImageData constructor)
  const clamped = new Uint8ClampedArray(Array.isArray(pixels) ? pixels : Array.from(pixels))
  ctx.putImageData(new ImageData(clamped, width, height), 0, 0)
  return canvas.toDataURL('image/png')
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ImageViewProps {
  /**
   * Image source — accepts:
   * - `data:image/…;base64,…` — base64 data URL from backend
   * - `file:///…` or absolute path — converted via Tauri `convertFileSrc`
   * - Any HTTP/HTTPS URL
   * - `null` / `undefined` — shows empty/drop placeholder
   */
  src?: string | null
  /**
   * Called with the file path when a file is dropped onto this component.
   * The caller is responsible for reading the file (e.g. via backend API)
   * and calling `src` setter with the resulting data URL.
   */
  onDrop?: (path: string) => void
  /** Enable Tauri file-drop support. Default: false. */
  withDrop?: boolean
  /** Accepted extensions when withDrop is true, e.g. ['.png', '.jpg']. */
  accept?: string[]
  /** Placeholder / overlay hint text shown when empty. */
  hint?: string
  /**
   * Container width. Accepts px number or any CSS string (e.g. '100%', '320px').
   * Default: '100%'.
   */
  width?: number | string
  /**
   * Container height. Accepts px number or any CSS string.
   * Default: 200.
   */
  height?: number | string
  /**
   * How the image fits its container. Default: 'contain'.
   * 'contain' preserves aspect ratio and shows full image.
   * 'cover'   fills the box, may crop.
   */
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  /** Show natural dimensions badge on hover. Default: true. */
  showInfo?: boolean
  alt?: string
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * ImageView — image display + optional file-drop zone.
 *
 * Accepts data URLs (base64), file paths, and HTTP URLs as `src`.
 * Use the exported `pixelsToDataUrl()` helper to convert raw RGBA pixel arrays
 * (e.g. from a backend pixel buffer) into a data URL before passing here.
 *
 * @example
 * // Display a base64 data URL returned by the backend
 * <ImageView src={response.data_url} width={320} height={240} />
 *
 * // File drop zone — caller handles reading the dropped file
 * <ImageView
 *   src={imageSrc}
 *   withDrop
 *   accept={['.png', '.jpg', '.webp']}
 *   onDrop={(path) => fetchImageFromBackend(path).then(setSrc)}
 *   hint="拖放图片文件"
 * />
 *
 * // Pixel array from backend
 * const dataUrl = pixelsToDataUrl(response.pixels, response.width, response.height)
 * <ImageView src={dataUrl} />
 */
export function ImageView({
  src,
  onDrop,
  withDrop = false,
  accept,
  hint,
  width = '100%',
  height = 200,
  fit = 'contain',
  showInfo = true,
  alt = '',
  className = '',
}: ImageViewProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [hovered, setHovered] = useState(false)
  const isDraggingGlobal = useDragActive()

  const containerStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  function handleLoad() {
    const img = imgRef.current
    if (img) setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
  }

  // ── Outer highlight when anything is being dragged globally ──────────────
  const globalHighlight =
    withDrop && isDraggingGlobal && !src

  const inner = (
    <div
      style={containerStyle}
      className={[
        'relative flex items-center justify-center overflow-hidden rounded-lg',
        'border-2 transition-colors duration-150',
        // Border style:
        src
          ? 'border-gray-200 dark:border-gray-700/60'
          : globalHighlight
          ? 'border-dashed border-blue-400 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-900/20'
          : 'border-dashed border-gray-300 dark:border-gray-600',
        className,
      ].join(' ')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {src ? (
        <>
          {/* ── Image ─────────────────────────────────────── */}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            onLoad={handleLoad}
            style={{ objectFit: fit, width: '100%', height: '100%' }}
            className="block"
            draggable={false}
          />

          {/* ── Dimensions badge (hover) ───────────────────── */}
          {showInfo && hovered && naturalSize && (
            <div className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-mono pointer-events-none select-none">
              {naturalSize.w} × {naturalSize.h}
            </div>
          )}
        </>
      ) : (
        /* ── Empty / drop placeholder ─────────────────────── */
        <div className="flex flex-col items-center gap-1.5 text-gray-400 dark:text-gray-500 pointer-events-none select-none">
          <svg
            className={[
              'h-9 w-9 transition-colors',
              globalHighlight ? 'text-blue-400 dark:text-blue-500' : '',
            ].join(' ')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span className="text-xs text-center px-4 leading-snug">
            {hint ?? (withDrop ? '拖放图片文件至此' : '暂无图像')}
          </span>
        </div>
      )}
    </div>
  )

  if (withDrop) {
    return (
      <FileDropZone
        accept={accept}
        onFilesDropped={(paths) => onDrop?.(paths[0])}
        hint={hint}
      >
        {inner}
      </FileDropZone>
    )
  }

  return inner
}
