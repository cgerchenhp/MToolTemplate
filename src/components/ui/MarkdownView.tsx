import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { openExternal } from '../../lib/openExternal'
import {
  renderMarkdown,
  splitMarkdownForProgressiveRender,
  type MarkdownRenderOptions,
} from './markdownRendering'

export interface MarkdownViewProps {
  value: string
  className?: string
  placeholder?: string
  showCopyButton?: boolean
  sourcePath?: string
  localLinks?: Record<string, string>
  onNavigateDocument?: (path: string, anchor?: string) => void
  progressive?: boolean
  progressiveThreshold?: number
}

interface MarkdownContentProps {
  value: string
  renderOptions: MarkdownRenderOptions
  progressive: boolean
  progressiveThreshold: number
}

const MarkdownChunk = memo(function MarkdownChunk({
  value,
  renderOptions,
}: {
  value: string
  renderOptions: MarkdownRenderOptions
}) {
  const html = useMemo(
    () => renderMarkdown(value, renderOptions),
    [renderOptions, value],
  )
  return (
    <div
      className={[
        'prose prose-sm max-w-none dark:prose-invert',
        'prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800',
        'prose-pre:text-gray-800 dark:prose-pre:text-gray-100',
        'prose-code:text-gray-800 dark:prose-code:text-gray-100',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-a:text-blue-600 dark:prose-a:text-blue-400',
      ].join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})

function MarkdownContent({
  value,
  renderOptions,
  progressive,
  progressiveThreshold,
}: MarkdownContentProps) {
  const chunks = useMemo(
    () => progressive
      ? splitMarkdownForProgressiveRender(value, progressiveThreshold)
      : [value],
    [progressive, progressiveThreshold, value],
  )
  const [progress, setProgress] = useState(() => ({
    chunks,
    visibleCount: Math.min(2, chunks.length),
  }))

  if (progress.chunks !== chunks) {
    setProgress({ chunks, visibleCount: Math.min(2, chunks.length) })
  }

  const visibleCount = progress.chunks === chunks
    ? progress.visibleCount
    : Math.min(2, chunks.length)

  useEffect(() => {
    if (visibleCount >= chunks.length) return
    const frame = window.requestAnimationFrame(() => {
      setProgress(current => current.chunks === chunks
        ? { ...current, visibleCount: Math.min(current.visibleCount + 4, chunks.length) }
        : current)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [chunks, visibleCount])

  return (
    <div className="space-y-3 px-4 py-3">
      {chunks.slice(0, visibleCount).map((chunk, index) => (
        <MarkdownChunk
          key={`${index}:${chunk.length}:${chunk.slice(0, 24)}`}
          value={chunk}
          renderOptions={renderOptions}
        />
      ))}
    </div>
  )
}

/**
 * Safe Markdown renderer with heading anchors, document navigation, external
 * URL handling, and progressive rendering for very large documents.
 */
export function MarkdownView({
  value,
  className,
  placeholder = '暂无内容',
  showCopyButton = true,
  sourcePath,
  localLinks,
  onNavigateDocument,
  progressive = true,
  progressiveThreshold = 120_000,
}: MarkdownViewProps) {
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const renderOptions = useMemo(
    () => ({ sourcePath, localLinks }),
    [localLinks, sourcePath],
  )

  function handleCopy() {
    if (!value.trim()) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleLinkClick(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a')
    if (!anchor) return
    const linkKind = anchor.dataset.markdownLink

    if (linkKind === 'blocked') {
      event.preventDefault()
      return
    }
    if (linkKind === 'external') {
      const href = anchor.getAttribute('href')
      if (!href) return
      event.preventDefault()
      void openExternal(href).catch(() => undefined)
      return
    }
    if (linkKind === 'anchor') {
      const targetId = anchor.dataset.markdownAnchor
      if (!targetId) return
      event.preventDefault()
      rootRef.current
        ?.querySelector<HTMLElement>(`#${CSS.escape(targetId)}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (linkKind === 'document' && onNavigateDocument) {
      const path = anchor.dataset.documentPath
      if (!path) return
      event.preventDefault()
      onNavigateDocument(path, anchor.dataset.documentAnchor)
    }
  }

  if (!value.trim()) {
    return (
      <div
        className={[
          'flex items-center justify-center bg-white text-sm italic text-gray-400 dark:bg-gray-900 dark:text-gray-600',
          className,
        ].filter(Boolean).join(' ')}
      >
        {placeholder}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={['relative bg-white dark:bg-gray-900', className].filter(Boolean).join(' ')}
      onClick={handleLinkClick}
    >
      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          title="复制 Markdown 原文"
          className="absolute right-1 top-1 z-10 flex items-center gap-1 rounded border border-gray-200 bg-white/90 px-1.5 py-0.5 text-[10px] text-gray-500 shadow-sm backdrop-blur-sm transition hover:border-blue-400 hover:text-blue-500 dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-400 dark:hover:border-blue-400 dark:hover:text-blue-400"
        >
          {copied ? '✓ 已复制' : '复制 MD'}
        </button>
      )}
      <MarkdownContent
        value={value}
        renderOptions={renderOptions}
        progressive={progressive}
        progressiveThreshold={progressiveThreshold}
      />
    </div>
  )
}
