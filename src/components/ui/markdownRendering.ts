import { marked } from 'marked'

export interface MarkdownRenderOptions {
  sourcePath?: string
  localLinks?: Record<string, string>
}

const UNSAFE_ELEMENTS = 'script,style,iframe,object,embed,form,input,button,textarea,select,meta,link,base'

export function renderMarkdown(value: string, options: MarkdownRenderOptions = {}): string {
  const parsed = marked.parse(value, { async: false, gfm: true }) as string
  const documentNode = new DOMParser().parseFromString(parsed, 'text/html')

  documentNode.body.querySelectorAll(UNSAFE_ELEMENTS).forEach(element => element.remove())
  documentNode.body.querySelectorAll<HTMLElement>('*').forEach(element => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLocaleLowerCase()
      if (name.startsWith('on') || name === 'style' || name === 'srcdoc') {
        element.removeAttribute(attribute.name)
      }
    }
  })

  const headingIds = new Map<string, number>()
  documentNode.body.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6').forEach(heading => {
    if (heading.id) return
    const baseId = slugifyHeading(heading.textContent || 'section')
    const count = headingIds.get(baseId) ?? 0
    headingIds.set(baseId, count + 1)
    heading.id = count === 0 ? baseId : `${baseId}-${count + 1}`
  })

  documentNode.body.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(anchor => {
    const href = anchor.getAttribute('href')?.trim() ?? ''
    if (!isSafeUrl(href, false)) {
      anchor.removeAttribute('href')
      anchor.setAttribute('aria-disabled', 'true')
      anchor.dataset.markdownLink = 'blocked'
      return
    }

    anchor.removeAttribute('target')
    if (/^https?:\/\//i.test(href)) {
      anchor.dataset.markdownLink = 'external'
      anchor.rel = 'noopener noreferrer'
      return
    }
    if (/^(mailto|tel):/i.test(href)) {
      anchor.dataset.markdownLink = 'external'
      return
    }
    if (href.startsWith('#')) {
      anchor.dataset.markdownLink = 'anchor'
      anchor.dataset.markdownAnchor = decodeFragment(href.slice(1))
      return
    }

    const mappedPath = options.localLinks?.[href]
    const documentPath = mappedPath ?? resolveRelativeDocumentPath(options.sourcePath, href)
    if (documentPath) {
      const [path, fragment] = documentPath.split('#', 2)
      anchor.dataset.markdownLink = 'document'
      anchor.dataset.documentPath = path
      if (fragment) anchor.dataset.documentAnchor = decodeFragment(fragment)
    }
  })

  documentNode.body.querySelectorAll<HTMLImageElement>('img[src]').forEach(image => {
    const source = image.getAttribute('src')?.trim() ?? ''
    if (!isSafeUrl(source, true)) image.removeAttribute('src')
  })

  return documentNode.body.innerHTML
}

export function splitMarkdownForProgressiveRender(
  value: string,
  threshold = 120_000,
  targetCharacters = 16_000,
  maximumCharacters = 32_000,
): string[] {
  if (value.length < threshold) return [value]

  const lines = value.match(/[^\n]*\n|[^\n]+$/g) ?? [value]
  const definitions = lines.filter(line => /^\s{0,3}\[[^\]]+\]:\s+\S+/.test(line)).join('')
  const chunks: string[] = []
  let current = ''
  let inFence = false

  const flush = () => {
    if (!current.trim()) return
    chunks.push(definitions ? `${current.trimEnd()}\n\n${definitions}` : current)
    current = ''
  }

  for (const line of lines) {
    const trimmed = line.trimStart()
    const isHeading = /^#{1,6}\s/.test(trimmed)
    if (!inFence && isHeading && current.length >= targetCharacters) flush()
    current += line
    if (/^(```|~~~)/.test(trimmed)) inFence = !inFence
    if (!inFence && current.length >= maximumCharacters) flush()
  }
  flush()
  return chunks.length > 0 ? chunks : [value]
}

function isSafeUrl(value: string, image: boolean): boolean {
  if (!value) return false
  const compact = [...value].filter(character => {
    const code = character.charCodeAt(0)
    return code > 0x20 && code !== 0x7f
  }).join('')
  if (/^(javascript|vbscript|file):/i.test(compact)) return false
  if (/^data:/i.test(compact)) return image && /^data:image\/(png|gif|jpeg|webp|svg\+xml);/i.test(compact)
  return true
}

function slugifyHeading(value: string): string {
  const slug = value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'section'
}

function resolveRelativeDocumentPath(sourcePath: string | undefined, href: string): string | undefined {
  if (!sourcePath || /^([a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return undefined
  try {
    const normalizedSource = sourcePath.replaceAll('\\', '/').replace(/^\/+/, '')
    const resolved = new URL(href, `https://mtool.local/${normalizedSource}`)
    return `${decodeURIComponent(resolved.pathname.slice(1))}${resolved.hash}`
  } catch {
    return undefined
  }
}

function decodeFragment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
