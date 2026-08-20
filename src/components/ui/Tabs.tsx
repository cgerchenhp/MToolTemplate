import { useState } from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabPanel {
  id: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  panels: TabPanel[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function Tabs({ tabs, panels, activeTab, onTabChange }: TabsProps) {
  // 懒挂载：记录哪些 tab 已被激活过，首次激活才渲染内容，之后保持挂载（保留状态）
  const [mounted, setMounted] = useState<Set<string>>(() => new Set([activeTab]))

  function handleTabChange(id: string) {
    setMounted(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
    onTabChange(id)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-gray-200 bg-white transition-colors dark:border-gray-700 dark:bg-gray-900 items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={[
              "px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels — 懒挂载：首次点击才渲染，之后保持 mounted 保留状态 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {panels.map((panel) => (
          mounted.has(panel.id) ? (
            <div key={panel.id} className={panel.id !== activeTab ? "hidden" : "h-full overflow-y-auto"}>
              {panel.content}
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
}
