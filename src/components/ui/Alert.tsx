type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps {
  variant?: AlertVariant
  /** 可选标题，加粗显示在内容上方 */
  title?: string
  children: React.ReactNode
  /** 提供此回调时，在右上角显示关闭按钮。 */
  onClose?: () => void
}

const STYLE: Record<AlertVariant, { wrap: string; icon: React.ReactNode }> = {
  info: {
    wrap: 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
    icon: (
      <svg className="h-4 w-4 shrink-0 mt-px" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  success: {
    wrap: 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/50',
    icon: (
      <svg className="h-4 w-4 shrink-0 mt-px" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  warning: {
    wrap: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50',
    icon: (
      <svg className="h-4 w-4 shrink-0 mt-px" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  error: {
    wrap: 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50',
    icon: (
      <svg className="h-4 w-4 shrink-0 mt-px" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
}

/**
 * Alert — 带图标的提示横幅，用于展示操作结果或重要说明。
 *
 * @example
 * <Alert variant="error">文件不存在，请重新选择。</Alert>
 * <Alert variant="success" title="导出完成">已保存到输出目录。</Alert>
 * <Alert variant="warning">该操作不可撤销。</Alert>
 * <Alert variant="info">支持拖拽文件到此区域。</Alert>
 */
export function Alert({ variant = 'info', title, children, onClose }: AlertProps) {
  const { wrap, icon } = STYLE[variant]
  return (
    <div className={`flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${wrap}`}>
      {icon}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p className="leading-snug">{children}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
          aria-label="关闭"
          title="关闭"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      )}
    </div>
  )
}
