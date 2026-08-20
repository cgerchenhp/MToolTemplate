import { useState, useContext, createContext, useEffect, useRef } from 'react'

/**
 * Internal context: parent CollapsibleSection broadcasts a forced open state
 * (true/false) to all descendant CollapsibleSections when Ctrl+Click is used.
 * null = no forced state, each section manages itself.
 */
const CollapsibleForceCtx = createContext<boolean | null>(null)

interface CollapsibleSectionProps {
  /** 标题文字 */
  title: string
  /** 折叠时显示在右侧的摘要行，展开时隐藏 */
  summary?: string
  /** 折叠时在标题前显示的预览图（URL 字符串或任意 ReactNode），用于快速辨识 */
  icon?: string | React.ReactNode
  /** 初始展开状态，默认 true */
  defaultOpen?: boolean
  /** 开闭状态变化时的回调 */
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

/**
 * CollapsibleSection — 可折叠的属性区块，风格参考 Unreal Engine DetailView。
 *
 * 折叠时标题右侧显示摘要信息；展开时呈现子内容，左侧有蓝色竖线标记。
 * 推荐配合 dense 模式的 InfoRow（`grid grid-cols-[6rem_1fr]`）使用。
 *
 * @example
 * <CollapsibleSection title="Image #1" summary="16 × 16 · 32 bit" icon="/thumb.png" defaultOpen={false}>
 *   <div className="grid grid-cols-[6rem_1fr] divide-y divide-gray-100 dark:divide-gray-700/40">
 *     <InfoRow dense label="尺寸" value="16 × 16 px" />
 *     <InfoRow dense label="位深" value="32 bit" />
 *   </div>
 * </CollapsibleSection>
 */
export function CollapsibleSection({
  title,
  summary,
  icon,
  defaultOpen = true,
  onOpenChange,
  children,
}: CollapsibleSectionProps) {
  const forcedByParent = useContext(CollapsibleForceCtx)
  const [open, setOpen] = useState(defaultOpen)
  // Force state to push down to child CollapsibleSections (null = let them self-manage)
  const [childForce, setChildForce] = useState<boolean | null>(null)

  // Use a ref to always hold the latest onOpenChange, avoiding stale closures
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => { onOpenChangeRef.current = onOpenChange })

  // When a parent Ctrl+Clicks and forces us open/closed, sync our state and propagate further
  useEffect(() => {
    if (forcedByParent !== null) {
      setOpen(forcedByParent)
      setChildForce(forcedByParent)
      onOpenChangeRef.current?.(forcedByParent)
    }
  }, [forcedByParent])

  function handleClick(e: React.MouseEvent) {
    const next = !open
    setOpen(next)
    onOpenChange?.(next)
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+Click: recursively force all descendant CollapsibleSections
      setChildForce(next)
    } else {
      // Normal click: release forced state so children manage themselves again
      setChildForce(null)
    }
  }

  return (
    <CollapsibleForceCtx.Provider value={childForce}>
    <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700/60">
      {/* ── Header ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleClick}
        title="单击展开/折叠；Ctrl+单击递归展开/折叠所有子区块"
        className="flex w-full items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-left
          hover:bg-gray-200 dark:hover:bg-gray-700/80 transition-colors select-none"
      >
        {/* Chevron */}
        <svg
          className={`h-3 w-3 shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-150 ${
            open ? 'rotate-90' : ''
          }`}
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M6 4l4 4-4 4V4z" />
        </svg>

        {/* Collapsed preview icon — hidden when expanded */}
        {!open && icon && (
          typeof icon === 'string' ? (
            <img
              src={icon}
              alt=""
              className="h-5 w-5 shrink-0 rounded object-cover border border-gray-300 dark:border-gray-600"
            />
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
          )
        )}

        {/* Title */}
        <span className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
          {title}
        </span>

        {/* Summary — only visible when collapsed */}
        {!open && summary && (
          <span className="text-xs text-gray-400 dark:text-gray-500 truncate ml-2 max-w-[50%] text-right">
            {summary}
          </span>
        )}
      </button>

      {/* ── Body ───────────────────────────────────────────────── */}
      {open && (
        <div className="border-l-2 border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-900">
          {children}
        </div>
      )}
    </div>
    </CollapsibleForceCtx.Provider>
  )
}
