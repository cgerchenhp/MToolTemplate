import { useMemo, useState } from 'react'
import { marked } from 'marked'
import { openExternal } from '../../lib/openExternal'

/**
 * MarkdownView — Markdown 文本渲染原子控件
 *
 * - 使用 marked 将 Markdown 转为 HTML，以 Tailwind prose 样式展示
 * - 右上角提供"复制 MD"按钮，点击后变为"✓ 已复制"并在 1.5s 后恢复
 * - 传入 `value` 为空时显示占位提示
 *
 * 用法：
 *   <MarkdownView value={markdownText} />
 *   <MarkdownView value={markdownText} className="h-full overflow-auto" />
 */

// 配置 marked：关闭 mangle（已弃用），不让 Markdown 内联原始 HTML（安全）
marked.setOptions({ async: false })

interface MarkdownViewProps {
  value: string
  className?: string
  placeholder?: string
}

export function MarkdownView({ value, className, placeholder = '暂无内容' }: MarkdownViewProps) {
  const [copied, setCopied] = useState(false)

  const html = useMemo(() => {
    if (!value?.trim()) return ''
    return marked.parse(value, { async: false }) as string
  }, [value])

  function handleCopy() {
    if (!value?.trim()) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleLinkClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest('a')
    if (!target) return
    const href = target.getAttribute('href')
    if (!href) return
    // 只拦截外部 http/https 链接，用系统默认浏览器打开
    if (/^https?:\/\//i.test(href)) {
      e.preventDefault()
      void openExternal(href).catch(() => undefined)
    }
  }

  if (!html) {
    return (
      <div
        className={[
          'flex items-center justify-center text-sm text-gray-400 dark:text-gray-600 italic',
          'bg-white dark:bg-gray-900',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {placeholder}
      </div>
    )
  }

  return (
    <div className={['relative bg-white dark:bg-gray-900', className].filter(Boolean).join(' ')}>
      {/* ── 复制按钮 ──────────────────────────── */}
      <button
        type="button"
        onClick={handleCopy}
        title="复制 Markdown 原文"
        className="absolute right-1 top-1 z-10 flex items-center gap-1 rounded border border-gray-200
          bg-white/90 px-1.5 py-0.5 text-[10px] text-gray-500 shadow-sm backdrop-blur-sm
          transition hover:border-blue-400 hover:text-blue-500
          dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-400
          dark:hover:border-blue-400 dark:hover:text-blue-400"
      >
        {copied ? (
          <>
            <svg className="h-3 w-3 text-green-500" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
            </svg>
            <span className="text-green-500">已复制</span>
          </>
        ) : (
          <>
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
              <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
            </svg>
            复制 MD
          </>
        )}
      </button>

      {/* ── Markdown 渲染内容 ──────────────────── */}
      <div
        onClick={handleLinkClick}
        className={[
          // prose 排版基础
          'prose prose-sm max-w-none dark:prose-invert',
          // 内边距，避免内容贴近边框
          'px-4 py-3',
          // 代码块背景和文字随主题切换（typography 插件默认代码块始终深色，需手动覆盖）
          'prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800',
          'prose-pre:text-gray-800 dark:prose-pre:text-gray-100',
          // 行内代码颜色
          'prose-code:text-gray-800 dark:prose-code:text-gray-100',
          // 代码块样式
          'prose-code:before:content-none prose-code:after:content-none',
          // 链接颜色
          'prose-a:text-blue-600 dark:prose-a:text-blue-400',
        ]
          .filter(Boolean)
          .join(' ')}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
