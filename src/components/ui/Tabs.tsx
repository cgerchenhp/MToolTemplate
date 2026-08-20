import { useState } from 'react'

interface Tab {
  id: string
  label: string
}

interface TabPanel {
  id: string
  content: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  panels: TabPanel[]
  activeTab: string
  onTabChange: (id: string) => void
  /** Optional controlled set of panels that should remain mounted. */
  mountedTabs?: ReadonlySet<string>
  /** Allows a parent layout to supply its own tab navigation. */
  showTabBar?: boolean
}

export function Tabs({
  tabs,
  panels,
  activeTab,
  onTabChange,
  mountedTabs,
  showTabBar = true,
}: TabsProps) {
  const [internalMounted, setInternalMounted] = useState<Set<string>>(() => new Set([activeTab]))

  function handleTabChange(id: string) {
    if (!mountedTabs) {
      setInternalMounted(previous => {
        if (previous.has(id)) return previous
        const next = new Set(previous)
        next.add(id)
        return next
      })
    }
    onTabChange(id)
  }

  const effectiveMounted = mountedTabs ?? internalMounted

  return (
    <div className="flex h-full flex-col">
      {showTabBar && (
        <div
          className="flex shrink-0 items-center border-b border-gray-200 bg-white transition-colors dark:border-gray-700 dark:bg-gray-900"
          role="tablist"
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={[
                'px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {panels.map(panel => (
          effectiveMounted.has(panel.id) || panel.id === activeTab ? (
            <div
              key={panel.id}
              role="tabpanel"
              hidden={panel.id !== activeTab}
              className={panel.id !== activeTab ? 'hidden' : 'h-full overflow-y-auto'}
            >
              {panel.content}
            </div>
          ) : null
        ))}
      </div>
    </div>
  )
}
