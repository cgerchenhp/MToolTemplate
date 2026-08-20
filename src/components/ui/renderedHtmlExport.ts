export interface RenderedHtmlDocumentOptions {
  title?: string
  sourceMarkdown?: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const PRESERVED_STYLE_PROPERTIES = new Set([
  'align-content', 'align-items', 'align-self', 'aspect-ratio',
  'background-attachment', 'background-clip', 'background-color', 'background-image',
  'background-origin', 'background-position', 'background-repeat', 'background-size',
  'border-collapse', 'border-radius', 'box-shadow', 'box-sizing', 'color',
  'column-gap', 'display', 'fill', 'flex', 'flex-basis', 'flex-direction', 'flex-grow',
  'flex-shrink', 'flex-wrap', 'font-family', 'font-size', 'font-style', 'font-weight',
  'gap', 'height', 'justify-content', 'line-height', 'list-style', 'list-style-position',
  'list-style-type', 'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top',
  'max-height', 'max-width', 'min-height', 'min-width', 'object-fit', 'object-position',
  'opacity', 'overflow', 'overflow-wrap', 'overflow-x', 'overflow-y', 'padding',
  'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'position', 'row-gap',
  'stroke', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'stroke-width',
  'table-layout', 'text-align', 'text-decoration', 'text-decoration-color',
  'text-decoration-line', 'text-decoration-thickness', 'text-transform', 'transform',
  'vertical-align', 'visibility', 'white-space', 'width', 'word-break', 'z-index',
])

const INHERITED_STYLE_PROPERTIES = new Set([
  'color', 'font-family', 'font-size', 'font-style', 'font-weight', 'line-height',
  'text-align', 'text-decoration', 'text-decoration-color', 'text-decoration-line',
  'text-decoration-thickness', 'text-transform', 'visibility', 'white-space', 'word-break',
])

const SKIPPED_STYLE_VALUES = new Set([
  '', '0px', 'auto', 'baseline', 'hidden', 'none', 'normal', 'nowrap',
  'rgba(0, 0, 0, 0)', 'row', 'static', 'stretch', 'transparent', 'visible',
])

function shouldPreserveStyleProperty(property: string): boolean {
  return PRESERVED_STYLE_PROPERTIES.has(property) || property.startsWith('grid-') || property.startsWith('inset-')
}

function hasPaintedLine(width: string, style: string): boolean {
  return width !== '' && width !== '0px' && style !== '' && style !== 'none' && style !== 'hidden'
}

function getBorderStyles(computed: CSSStyleDeclaration): string {
  let cssText = ''
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const width = computed.getPropertyValue(`border-${side}-width`)
    const style = computed.getPropertyValue(`border-${side}-style`)
    if (!hasPaintedLine(width, style)) continue
    cssText += `border-${side}-width:${width};border-${side}-style:${style};border-${side}-color:${computed.getPropertyValue(`border-${side}-color`)};`
  }
  return cssText
}

function cloneWithInlineStyles(node: Node): Node {
  if (node.nodeType === Node.TEXT_NODE) return node.cloneNode(true)
  if (!(node instanceof Element)) return node.cloneNode(true)

  const clone = node.cloneNode(false) as Element
  if (clone instanceof HTMLElement || clone instanceof SVGElement) {
    const computed = window.getComputedStyle(node)
    const parentComputed = node.parentElement ? window.getComputedStyle(node.parentElement) : null
    let cssText = getBorderStyles(computed)
    for (let index = 0; index < computed.length; index += 1) {
      const property = computed.item(index)
      if (!shouldPreserveStyleProperty(property)) continue
      if ((property === 'width' || property === 'height') && !(node instanceof SVGElement || ['IMG', 'CANVAS', 'VIDEO'].includes(node.tagName))) continue
      const value = computed.getPropertyValue(property)
      if (SKIPPED_STYLE_VALUES.has(value)) continue
      if (parentComputed && INHERITED_STYLE_PROPERTIES.has(property) && value === parentComputed.getPropertyValue(property)) continue
      cssText += `${property}:${value};`
    }
    if (cssText) clone.setAttribute('style', cssText)
  }

  node.childNodes.forEach(child => clone.appendChild(cloneWithInlineStyles(child)))
  return clone
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function inlineImages(root: HTMLElement): Promise<void> {
  await Promise.all(Array.from(root.querySelectorAll('img')).map(async image => {
    const src = image.getAttribute('src')
    if (!src || src.startsWith('data:')) return
    try {
      const response = await fetch(src)
      if (response.ok) image.setAttribute('src', await blobToDataUrl(await response.blob()))
    } catch {
      // Keep the original URL when a local or remote image cannot be read.
    }
  }))
}

function removeExportOnlyUi(root: HTMLElement): void {
  root.querySelectorAll('[data-export-ui="true"]').forEach(node => node.remove())
}

/**
 * Creates a self-contained HTML snapshot from already-rendered content.
 * Computed styles and reachable images are inlined, so the exported file can
 * be opened without the original application running.
 */
export async function buildRenderedHtmlDocument(
  source: HTMLElement,
  options: RenderedHtmlDocumentOptions = {},
): Promise<string> {
  const body = cloneWithInlineStyles(source) as HTMLElement
  removeExportOnlyUi(body)
  await inlineImages(body)

  const title = escapeHtml(options.title ?? 'Export')
  const sourceMarkdown = options.sourceMarkdown
    ? `<details class="source-markdown"><summary>Markdown source</summary><pre>${escapeHtml(options.sourceMarkdown)}</pre></details>`
    : ''

  return [
    '<!doctype html>', '<html lang="zh-CN">', '<head>', '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />', `<title>${title}</title>`,
    '<style>body{margin:24px;background:#fff;color:#111827;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}h1,h2,h3,h4,h5,h6,p,blockquote,figure,pre{margin:0;}img,svg{max-width:100%;}pre{white-space:pre-wrap;}.source-markdown{margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;}.source-markdown summary{cursor:pointer;color:#6b7280;font-size:12px;}.source-markdown pre{margin-top:8px;overflow:auto;background:#f3f4f6;border-radius:8px;padding:12px;font-size:12px;}</style>',
    '</head>', '<body>', body.outerHTML, sourceMarkdown, '</body>', '</html>',
  ].join('\n')
}

/** Copies both rich HTML and a text fallback to the clipboard. */
export async function copyHtmlToClipboard(html: string): Promise<void> {
  const ClipboardItemCtor = (window as Window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem
  if (ClipboardItemCtor && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItemCtor({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([html], { type: 'text/plain' }),
      }),
    ])
    return
  }
  await navigator.clipboard.writeText(html)
}

/** Triggers a browser download for exported HTML. */
export function downloadHtml(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/html;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
