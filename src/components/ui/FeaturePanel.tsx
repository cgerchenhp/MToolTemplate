import { useState } from 'react'

interface FeaturePanelProps {
  title: string
  description?: string
  /** 折叠时在标题左侧显示的预览图（URL 字符串或任意 ReactNode） */
  icon?: string | React.ReactNode
  /** 初始展开状态，默认 true */
  defaultOpen?: boolean
  className?: string
  children: React.ReactNode
}

export function FeaturePanel({
  title,
  description,
  icon,
  defaultOpen = true,
  className,
  children,
}: FeaturePanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  /* ── Collapsed bar ─────────────────────────────────────────── */
  if (!open) {
    return (
      <div
      className={[
        'flex flex-col rounded-xl border border-gray-200 dark:border-gray-700/60',
        'bg-white dark:bg-gray-900 shadow-sm transition-colors w-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>

        {/* Optional preview icon */}
        {icon &&
          (typeof icon === 'string' ? (
            <img
              src={icon}
              alt=""
              className="h-5 w-5 shrink-0 rounded object-cover border border-gray-300 dark:border-gray-600"
            />
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
          ))}

        {/* Minimize button */}
        <button
          type="button"
          title="收起"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
            hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mt-0.5"
        >
          {/* maximize icon: two outward-facing arrows */}
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      
    </div>
    )
  }

  /* ── Expanded panel ────────────────────────────────────────── */
  return (
    <div
      className={[
        'flex flex-col rounded-xl border border-gray-200 dark:border-gray-700/60',
        'bg-white dark:bg-gray-900 shadow-sm transition-colors w-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/60 rounded-t-xl">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>

        {/* Minimize button */}
        <button
          type="button"
          title="收起"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
            hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mt-0.5"
        >
          {/* minimize icon: single horizontal line */}
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 8h10" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 p-3 overflow-visible rounded-b-xl">{children}</div>
    </div>
  )
}
