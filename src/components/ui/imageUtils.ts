/**
 * Convert raw RGBA pixel data to a PNG data URL via an off-screen Canvas.
 *
 * @param pixels RGBA bytes: 4 bytes per pixel, row-major order.
 * @param width Image width in pixels.
 * @param height Image height in pixels.
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

  // Construct from a plain array to avoid SharedArrayBuffer incompatibilities
  // with the ImageData constructor.
  const clamped = new Uint8ClampedArray(Array.isArray(pixels) ? pixels : Array.from(pixels))
  ctx.putImageData(new ImageData(clamped, width, height), 0, 0)
  return canvas.toDataURL('image/png')
}
