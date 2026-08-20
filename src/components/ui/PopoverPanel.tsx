import { useState, useRef, useEffect, useId } from 'react'

interface PopoverPanelProps {
  /**
   * 触发按钮的内容（渲染在按钮内部）。
   * 典型用法：传入一个 SVG 图标节点，PopoverPanel 负责渲染按钮外框和点击逻辑。
   */
  trigger: React.ReactNode
  /** 弹出面板的正文内容 */
  children: React.ReactNode
  /**
   * 面板水平对齐方式：
   * - `'left'`（默认）：面板左边缘与触发器左边缘对齐
   * - `'right'`：面板右边缘与触发器右边缘对齐
   */
  align?: 'left' | 'right'
  /** 触发按钮的额外 className（追加到默认样式上） */
  triggerClassName?: string
  /** 弹出面板的额外 className（追加到默认样式上） */
  panelClassName?: string
  /**
   * 控制面板打开/关闭（非受控模式时不传）。
   * 传入后组件进入受控模式，open / onOpenChange 需配套使用。
   */
  open?: boolean
  /** 受控模式下面板状态变化回调 */
  onOpenChange?: (open: boolean) => void
  /** 面板最小宽度（默认 220px） */
  minWidth?: number
}

/**
 * PopoverPanel — 触发器按钮 + 浮动设置面板的通用原子控件。
 *
 * 支持非受控（自管理开关）和受控（open / onOpenChange）两种模式。
 * 面板在触发器正下方弹出，支持 left / right 两种对齐方式。
 * 点击外部区域或按 Escape 自动关闭。
 *
 * @example
 * // 非受控（最常见用法）
 * <PopoverPanel trigger={<WrenchIcon />} align="right">
 *   <div>面板内容</div>
 * </PopoverPanel>
 *
 * // 受控
 * const [open, setOpen] = useState(false)
 * <PopoverPanel trigger={<MenuIcon />} open={open} onOpenChange={setOpen}>
 *   <MenuItem>选项</MenuItem>
 * </PopoverPanel>
 */
export function PopoverPanel({
  trigger,
  children,
  align = 'left',
  triggerClassName,
  panelClassName,
  open: controlledOpen,
  onOpenChange,
  minWidth = 220,
}: PopoverPanelProps) {
  const isControlled = controlledOpen !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen
  const panelId = useId()

  const containerRef = useRef<HTMLDivElement>(null)

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const toggle = () => setOpen(!isOpen)

  // Click-outside: 点击面板外部时关闭
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Escape 关闭
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const alignCls = align === 'right' ? 'right-0' : 'left-0'

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* 触发按钮 */}
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
        className={[
          'inline-flex items-center justify-center rounded p-1',
          'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          isOpen ? 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700' : '',
          triggerClassName ?? '',
        ].filter(Boolean).join(' ')}
      >
        {trigger}
      </button>

      {/* 浮动面板 */}
      {isOpen && (
        <div
          id={panelId}
          role="dialog"
          style={{ minWidth }}
          className={[
            'absolute top-full mt-1.5 z-50',
            alignCls,
            'rounded-lg border border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-800 shadow-lg shadow-black/10 dark:shadow-black/30',
            'py-2 px-3',
            panelClassName ?? '',
          ].filter(Boolean).join(' ')}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ── 常用图标（内联 SVG，避免引入图标库依赖） ──────────────────────

/** 扳手图标，用于"设置"触发器 */
export function WrenchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}
