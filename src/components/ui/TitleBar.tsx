import { useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ThemeButton } from './ThemeButton'

interface TitleBarProps {
  platform: 'windows' | 'macos'
  appTitle?: string
  editionLabel?: string
  documentTitle?: string
  documentMeta?: string
  contentOffset?: number
  children?: React.ReactNode
  actions?: React.ReactNode
}

export function TitleBar({
  platform,
  appTitle: appTitleText = 'Tauri React Python Template',
  editionLabel,
  documentTitle,
  documentMeta,
  contentOffset = 0,
  children,
  actions,
}: TitleBarProps) {
  const [maximized, setMaximized] = useState(false)
  const appWindow = getCurrentWindow()
  const isWindows = platform === 'windows'
  const isDevelopment = import.meta.env.DEV

  useEffect(() => {
    if (!isWindows) return

    appWindow.isMaximized().then(setMaximized).catch(() => {})
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized).catch(() => {})
    })
    return () => { unlisten.then(fn => fn()) }
  }, [appWindow, isWindows])

  const appTitle = (
    <>
      <img src="/app-icon.png" alt="" className="h-5 w-5 pointer-events-none rounded-sm" data-tauri-drag-region />
      <span className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 pointer-events-none" data-tauri-drag-region>
        {appTitleText}
      </span>
      {editionLabel && (
        <span
          className="pointer-events-none ml-0.5 inline-flex h-4 items-center rounded-full border border-violet-200 bg-violet-50 px-1.5 text-[9px] font-semibold leading-none tracking-[0.04em] text-violet-700 dark:border-violet-800 dark:bg-violet-950/70 dark:text-violet-300"
          data-tauri-drag-region
        >
          {editionLabel}
        </span>
      )}
      {isDevelopment && <span className="pointer-events-none ml-0.5 inline-flex h-4 items-center text-[9px] font-medium leading-none tracking-[0.08em] text-amber-600/70 dark:text-amber-300/65">DEV</span>}
    </>
  )

  const documentIdentity = documentTitle ? (
    <div
      className="flex max-w-full min-w-0 items-center justify-center gap-1.5 px-3 text-gray-700 dark:text-gray-200"
      title={documentMeta ? `${documentTitle}\n${documentMeta}` : documentTitle}
      data-tauri-drag-region
    >
      <svg className="h-3.5 w-3.5 shrink-0 text-blue-500/80" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M5 2.75A1.75 1.75 0 0 0 3.25 4.5v11A1.75 1.75 0 0 0 5 17.25h10a1.75 1.75 0 0 0 1.75-1.75V7.81a1.75 1.75 0 0 0-.513-1.237l-3.31-3.31A1.75 1.75 0 0 0 11.69 2.75H5Z" />
      </svg>
      <span className="pointer-events-none min-w-0 truncate text-xs font-medium" data-tauri-drag-region>{documentTitle}</span>
      {documentMeta && (
        <span className="pointer-events-none hidden shrink-0 truncate text-[10px] text-gray-400 xl:inline dark:text-gray-500" data-tauri-drag-region>
          · {documentMeta}
        </span>
      )}
    </div>
  ) : null

  return (
    <div
      className="relative z-50 flex h-8 shrink-0 select-none items-center border-b border-gray-200 bg-white transition-colors dark:border-gray-700 dark:bg-gray-900"
      data-tauri-drag-region
    >
      {isWindows ? <>
        <div className="ml-2.5 flex items-center gap-1.5" data-tauri-drag-region>{appTitle}</div>
        {children && <div className="ml-3 flex items-center gap-1">{children}</div>}
        <div className="flex-1" data-tauri-drag-region />
        {documentIdentity && (
          <div
            className="pointer-events-none absolute inset-y-0 flex min-w-0 items-center justify-center"
            style={{ left: `min(${contentOffset}px, 35vw)`, right: actions ? '232px' : '176px' }}
            data-tauri-drag-region
          >
            {documentIdentity}
          </div>
        )}
        {actions && <div className="ml-1 flex items-center">{actions}</div>}
        <ThemeButton />
        <div className="flex h-full">
          <button
            className="flex h-full w-11 items-center justify-center text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
            onClick={() => appWindow.minimize()}
            title="最小化"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="7.5" width="10" height="1" /></svg>
          </button>
          <button
            className="flex h-full w-11 items-center justify-center text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
            onClick={() => appWindow.toggleMaximize()}
            title={maximized ? '还原' : '最大化'}
          >
            {maximized
              ? <svg className="h-3.5 w-3.5" viewBox="0 0 30 30" fill="currentColor"><path d="M8 4 8 7 10 7 10 6 25 6 25 18 23 18 23 20 27 20 27 4ZM3 9 3 25 21 25 21 9ZM5 11 19 11 19 23 5 23Z" /></svg>
              : <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h10v10H3V3zm1 1v8h8V4H4z" /></svg>}
          </button>
          <button
            className="flex h-full w-11 items-center justify-center text-gray-500 transition-colors hover:bg-red-600 hover:text-white dark:text-gray-400"
            onClick={() => appWindow.close()}
            title="关闭"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M3.646 3.646a.5.5 0 0 1 .708 0L8 7.293l3.646-3.647a.5.5 0 0 1 .708.708L8.707 8l3.647 3.646a.5.5 0 0 1-.708.708L8 8.707l-3.646 3.647a.5.5 0 0 1-.708-.708L7.293 8 3.646 4.354a.5.5 0 0 1 0-.708z" /></svg>
          </button>
        </div>
      </> : <>
        <div className="w-[70px] shrink-0" data-tauri-drag-region />
        <div className="flex-1" data-tauri-drag-region />
        <div className="pointer-events-none absolute inset-0 grid grid-cols-[1fr_auto_1fr] items-center">
          <div />
          <div className="flex h-full min-w-0 items-center gap-1.5" data-tauri-drag-region>{documentIdentity ?? appTitle}</div>
          <div className="pointer-events-none flex items-center justify-end pr-2.5 justify-self-stretch">
            <div className="pointer-events-auto flex items-center gap-0.5">{children}{actions}<ThemeButton /></div>
          </div>
        </div>
      </>}
    </div>
  )
}
