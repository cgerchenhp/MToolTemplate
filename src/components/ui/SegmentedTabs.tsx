import type { ReactNode } from 'react'

interface SegmentedTabItem<T extends string> {
  id: T
  label: ReactNode
  count?: number
}

interface SegmentedTabsProps<T extends string> {
  items: SegmentedTabItem<T>[]
  value: T
  onChange: (value: T) => void
}

/** Compact controlled tabs for switching views inside a page. */
export function SegmentedTabs<T extends string>({ items, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <div className="inline-flex items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800" role="tablist">
      {items.map(item => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                active
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-300'
              }`}>
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
