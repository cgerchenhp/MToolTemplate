import type { ReactNode } from 'react'

type MetricTone = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'violet'

interface MetricCardProps {
  label: string
  value: ReactNode
  detail?: ReactNode
  icon?: ReactNode
  tone?: MetricTone
}

const TONE_CLS: Record<MetricTone, { card: string; value: string; icon: string }> = {
  blue: {
    card: 'border-blue-200 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/30',
    value: 'text-blue-700 dark:text-blue-300',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  },
  green: {
    card: 'border-green-200 bg-green-50/70 dark:border-green-800 dark:bg-green-950/30',
    value: 'text-green-700 dark:text-green-300',
    icon: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300',
  },
  yellow: {
    card: 'border-yellow-200 bg-yellow-50/70 dark:border-yellow-800 dark:bg-yellow-950/20',
    value: 'text-yellow-700 dark:text-yellow-300',
    icon: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  },
  red: {
    card: 'border-red-200 bg-red-50/70 dark:border-red-800 dark:bg-red-950/40',
    value: 'text-red-700 dark:text-red-300',
    icon: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  },
  gray: {
    card: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900',
    value: 'text-gray-800 dark:text-gray-100',
    icon: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  },
  violet: {
    card: 'border-violet-200 bg-violet-50/70 dark:border-violet-800 dark:bg-violet-950/40',
    value: 'text-violet-700 dark:text-violet-300',
    icon: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
  },
}

/** Compact dashboard metric shared by overview-style pages. */
export function MetricCard({ label, value, detail, icon, tone = 'gray' }: MetricCardProps) {
  const toneCls = TONE_CLS[tone]
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${toneCls.card}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${toneCls.icon}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className={`text-xl font-bold leading-none tabular-nums ${toneCls.value}`}>{value}</div>
          <div className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-300">{label}</div>
          {detail && <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{detail}</div>}
        </div>
      </div>
    </div>
  )
}
