type BadgeVariant = 'blue' | 'green' | 'yellow' | 'red' | 'gray'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
}

const VARIANT_CLS: Record<BadgeVariant, string> = {
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  red:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  gray:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

/**
 * Badge — 小型状态徽标，用于标记分类、状态或数量。
 *
 * @example
 * <Badge variant="green">已完成</Badge>
 * <Badge variant="yellow">处理中</Badge>
 * <Badge variant="red">失败</Badge>
 * <Badge>默认</Badge>
 */
export function Badge({ children, variant = 'gray' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${VARIANT_CLS[variant]}`}
    >
      {children}
    </span>
  )
}
