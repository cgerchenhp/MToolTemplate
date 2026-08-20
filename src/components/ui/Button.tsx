import { btnBaseCls } from './inputStyles'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  /** 加载中状态：显示旋转图标并禁用点击 */
  loading?: boolean
  /** 占满父容器宽度 */
  fullWidth?: boolean
  type?: 'button' | 'submit'
  title?: string
}

const VARIANT_CLS: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
  secondary:
    'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 ' +
    'hover:bg-gray-100 dark:hover:bg-gray-700',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  ghost:
    'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
}

const SIZE_CLS: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-1.5 text-sm',
}

/**
 * Button — 统一样式的操作按钮，支持 variant / size / loading 三维变体。
 *
 * @example
 * <Button onClick={submit}>提交</Button>
 * <Button variant="secondary" onClick={cancel}>取消</Button>
 * <Button variant="danger" size="sm">删除</Button>
 * <Button loading fullWidth>生成中…</Button>
 */
export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  type = 'button',
  title,
}: ButtonProps) {
  const cls = [
    btnBaseCls,
    VARIANT_CLS[variant],
    SIZE_CLS[size],
    fullWidth ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={cls} title={title}>
      {loading && (
        <svg
          className="h-3.5 w-3.5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3a9 9 0 0 1 9 9"
            className="opacity-75"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
