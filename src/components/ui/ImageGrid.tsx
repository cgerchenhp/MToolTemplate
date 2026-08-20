import { useState, type CSSProperties } from 'react'
import { ClickableImage, ImageLightbox } from './ClickableImage'

export interface ImageGridItem {
  src: string
  alt?: string
}

function getColumnCount(count: number): number {
  if (count <= 1) return 1
  if (count <= 3) return count
  if (count === 4) return 2
  return 3
}

/** Grid style helper for a responsive, bounded image grid. */
// eslint-disable-next-line react-refresh/only-export-components
export function getImageGridStyle(count: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(${getColumnCount(count)}, minmax(0, 1fr))`,
    width: '100%',
    maxWidth: '100%',
  }
}

interface ImageGridProps {
  images: ImageGridItem[]
  className?: string
  tileClassName?: string
}

/** Image collection with a shared, keyboard-navigable lightbox. */
export function ImageGrid({ images, className = '', tileClassName = '' }: ImageGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  if (images.length === 0) return null

  const isSingleImage = images.length === 1
  const tileSize = isSingleImage ? '' : images.length <= 4 ? 'h-32 sm:h-40' : 'h-28 sm:h-32'

  return (
    <div className={`grid max-w-full gap-1.5 ${className}`} style={getImageGridStyle(images.length)}>
      {images.map((image, index) => isSingleImage ? (
        <div key={`${image.src}-${index}`} className="flex max-w-full items-start">
          <ClickableImage
            src={image.src}
            alt={image.alt}
            onOpen={() => setActiveIndex(index)}
            className={['max-h-[60vh] max-w-full rounded-lg border border-gray-200 object-contain shadow-sm dark:border-gray-700', tileClassName].filter(Boolean).join(' ')}
          />
        </div>
      ) : (
        <ClickableImage
          key={`${image.src}-${index}`}
          src={image.src}
          alt={image.alt}
          onOpen={() => setActiveIndex(index)}
          className={['w-full rounded-lg border border-gray-200 object-contain shadow-sm dark:border-gray-700', tileSize, tileClassName].filter(Boolean).join(' ')}
        />
      ))}
      {activeIndex !== null && (
        <ImageLightbox
          src={images[activeIndex].src}
          alt={images[activeIndex].alt}
          images={images}
          activeIndex={activeIndex}
          onNavigate={setActiveIndex}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </div>
  )
}
