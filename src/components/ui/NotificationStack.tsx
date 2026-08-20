import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  NotificationContext,
  type NotifyAction,
  type NotifyFn,
  type NotifyLevel,
  type NotifyOptions,
} from './NotificationContext'

// re-export types so existing imports from this file still work
export type { NotifyAction, NotifyFn, NotifyLevel, NotifyOptions }

// ── Internal item type ────────────────────────────────────────────────────────

interface NotificationItem {
  id: string
  level: NotifyLevel
  title?: string
  message: string
  duration: number
  action?: NotifyAction
  exiting: boolean
}

// ── Provider ─────────────────────────────────────────────────────────────────

const EXIT_MS = 350

function useNotificationTimers() {
  const autoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const exitTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const cancelAutoTimer = useCallback((id: string) => {
    const timer = autoTimers.current.get(id)
    if (!timer) return
    clearTimeout(timer)
    autoTimers.current.delete(id)
  }, [])
  const setAutoTimer = useCallback((id: string, timer: ReturnType<typeof setTimeout>) => {
    autoTimers.current.set(id, timer)
  }, [])
  const setExitTimer = useCallback((id: string, timer: ReturnType<typeof setTimeout>) => {
    exitTimers.current.set(id, timer)
  }, [])
  const deleteExitTimer = useCallback((id: string) => {
    exitTimers.current.delete(id)
  }, [])

  useEffect(() => {
    const auto = autoTimers.current
    const exit = exitTimers.current
    return () => {
      auto.forEach(clearTimeout)
      exit.forEach(clearTimeout)
    }
  }, [])

  return { cancelAutoTimer, deleteExitTimer, setAutoTimer, setExitTimer }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const { cancelAutoTimer, deleteExitTimer, setAutoTimer, setExitTimer } = useNotificationTimers()

  const dismiss = useCallback((id: string) => {
    cancelAutoTimer(id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, exiting: true } : n))
    const t = setTimeout(() => {
      setItems(prev => prev.filter(n => n.id !== id))
      deleteExitTimer(id)
    }, EXIT_MS)
    setExitTimer(id, t)
  }, [cancelAutoTimer, deleteExitTimer, setExitTimer])

  const notify = useCallback((message: string, options?: NotifyOptions) => {
    const id = crypto.randomUUID()
    const duration = options?.duration ?? 4000
    setItems(prev => [
      ...prev,
      { id, level: options?.level ?? 'info', title: options?.title, message, duration, action: options?.action, exiting: false },
    ])
    const t = setTimeout(() => dismiss(id), duration)
    setAutoTimer(id, t)
  }, [dismiss, setAutoTimer])

  const notifyFn = useMemo<NotifyFn>(() => {
    return Object.assign(
      (message: string, options?: NotifyOptions) => notify(message, options),
      {
        info: (message: string, title?: string) => notify(message, { level: 'info', title }),
        success: (message: string, title?: string) => notify(message, { level: 'success', title }),
        warning: (message: string, title?: string) => notify(message, { level: 'warning', title }),
        error: (message: string, title?: string) => notify(message, { level: 'error', title }),
      },
    )
  }, [notify])

  return (
    <NotificationContext.Provider value={notifyFn}>
      {children}
      <NotificationStackView items={items} onDismiss={dismiss} />
    </NotificationContext.Provider>
  )
}

// ── Visual Styles ─────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<NotifyLevel, { accent: string; icon: string; border: string; iconEl: React.ReactNode }> = {
  info: {
    accent: 'bg-blue-500', icon: 'text-blue-500', border: 'border-blue-200 dark:border-blue-700',
    iconEl: (<svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" /></svg>),
  },
  success: {
    accent: 'bg-green-500', icon: 'text-green-500', border: 'border-green-200 dark:border-green-700',
    iconEl: (<svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg>),
  },
  warning: {
    accent: 'bg-yellow-500', icon: 'text-yellow-500', border: 'border-yellow-200 dark:border-yellow-600',
    iconEl: (<svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>),
  },
  error: {
    accent: 'bg-red-500', icon: 'text-red-500', border: 'border-red-200 dark:border-red-700',
    iconEl: (<svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" /></svg>),
  },
}

// ── NotificationCard ──────────────────────────────────────────────────────────

function NotificationCard({ item, onDismiss }: { item: NotificationItem; onDismiss: (id: string) => void }) {
  const s = LEVEL_STYLES[item.level]
  return (
    <div className={`relative flex w-80 rounded-lg border shadow-lg overflow-hidden bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 ${s.border} ${item.exiting ? 'toast-exit' : 'toast-enter'}`}>
      <div className={`w-1 shrink-0 ${s.accent}`} />
      <div className="flex-1 px-3 pt-3 pb-4 min-w-0">
        <div className="flex items-start gap-2.5">
          <span className={s.icon}>{s.iconEl}</span>
          <div className="flex-1 min-w-0">
            {item.title && <p className="text-sm font-semibold leading-tight mb-0.5">{item.title}</p>}
            <p className="text-sm leading-snug wrap-break-word">{item.message}</p>
            {item.action && (
              <button
                onClick={() => { item.action!.onClick(); onDismiss(item.id) }}
                className={`mt-2 text-xs font-semibold underline-offset-2 underline transition-colors ${s.icon} hover:opacity-75`}
              >
                {item.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => onDismiss(item.id)}
            className="shrink-0 -mt-0.5 -mr-1 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="关闭"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z" />
            </svg>
          </button>
        </div>
      </div>
      <div className={`absolute bottom-0 left-1 right-0 h-0.5 ${s.accent} toast-progress origin-left`} style={{ animationDuration: `${item.duration}ms` }} />
    </div>
  )
}

// ── NotificationStackView ─────────────────────────────────────────────────────

function NotificationStackView({ items, onDismiss }: { items: NotificationItem[]; onDismiss: (id: string) => void }) {
  if (items.length === 0) return null
  return (
    <div className="fixed bottom-12 right-4 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite" aria-label="通知">
      {items.map(item => (
        <div key={item.id} className="pointer-events-auto">
          <NotificationCard item={item} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
