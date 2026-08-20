import { useState } from 'react'
import { useBackendStatus } from './hooks/useBackendStatus'
import { useBackendLog } from './hooks/useBackendLog'
import { BackendStatusBadge } from './components/BackendStatusBadge'
import { Tabs } from './components/ui/Tabs'
import { ConsolePanel } from './components/ui/ConsolePanel'
import { BackendLogTab } from './components/tabs/BackendLogTab'
import { ManualTab } from './components/tabs/ManualTab'
import { GalleryTab } from './components/tabs/GalleryTab'
import { apiPost, isTauri } from './lib/api'
import { useNotify } from './hooks/useNotify'
import { useHotkey } from './hooks/useHotkey'
import { useUiScale } from './hooks/useUiScale'
import { NotificationProvider } from './components/ui/NotificationStack'
import { TitleBar } from './components/ui/TitleBar'
import { DragProvider } from './lib/DragProvider'

import './App.css'


const TABS = [
  { id: 'manual', label: 'Manual' },
  { id: 'gallery', label: 'Gallery' },
]
const TAB_PANELS = [
  { id: 'manual',  content: <ManualTab /> },
  { id: 'gallery', content: <GalleryTab />}
]
type PushBtnState = 'idle' | 'waiting' | 'success'
const PUSH_BTN_CLS: Record<PushBtnState, string> = {
  idle:    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
  waiting: 'bg-gray-400 text-white cursor-not-allowed',
  success: 'bg-green-600 text-white',
}

const PUSH_BTN_LABEL: Record<PushBtnState, string> = {
  idle:    '触发后端推送',
  waiting: '等待中...',
  success: '后端已响应 ✓',
}
function App() {
  const backendStatus = useBackendStatus()
  const logLines = useBackendLog()
  const [activeTab, setActiveTab] = useState('manual')
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [pushBtnState, setPushBtnState] = useState<PushBtnState>('idle')
  const { scale, isMin, isMax, zoomIn, zoomOut, resetZoom } = useUiScale()
  

  useNotify((msg) => {
    if (msg.type === 'button_update') {
      setPushBtnState('success')
      setTimeout(() => setPushBtnState('idle'), 3000)
    }
  })
  useHotkey('`', () => setConsoleOpen(v => !v), { ctrl: true })
  // Ctrl+= 或 Ctrl++ 放大；Ctrl+- 缩小；Ctrl+0 重置
  useHotkey('=', zoomIn,    { ctrl: true, ignoreInputs: false })
  useHotkey('+', zoomIn,    { ctrl: true, ignoreInputs: false })
  useHotkey('-', zoomOut,   { ctrl: true, ignoreInputs: false })
  useHotkey('0', resetZoom, { ctrl: true, ignoreInputs: false })

  async function triggerPush() {
    setPushBtnState('waiting')
    try {
      await apiPost('/api/notify/trigger', {})
      // SSE 可能断连导致永远收不到 button_update，兜底 10 秒后自动恢复
      setTimeout(() => setPushBtnState(prev => prev === 'waiting' ? 'idle' : prev), 10_000)
    } catch {
      setPushBtnState('idle')
    }
  }

  async function pingBackend() {
    const payload = { message: `Ping from frontend at ${new Date().toLocaleTimeString()}` }
    try {
      const data = await apiPost<{ message: string }>('/api/echo', payload)
      console.log('Ping response:', data)

    } catch (e) {
      const err = e instanceof Error ? { message: e.message } : { message: String(e) }
      console.error('Ping error:', err)
    }
  }
  const platform = navigator.platform.toUpperCase()
  const isWindows = platform.includes('WIN')
  const isMacOS = platform.includes('MAC')

  return (
    <DragProvider>
    <NotificationProvider>
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-50 transition-colors duration-200 dark:bg-gray-950">
      {/* Custom Title Bar */}
      {isTauri && (isWindows || isMacOS) && <TitleBar platform={isWindows ? 'windows' : 'macos'} />}

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <Tabs tabs={TABS} panels={TAB_PANELS} activeTab={activeTab} onTabChange={setActiveTab} />
      </main>

      {/* Console Panel */}
      <ConsolePanel open={consoleOpen} onClose={() => setConsoleOpen(false)}>
        <BackendLogTab lines={logLines} />
      </ConsolePanel>

      {/* Footer */}
      <footer className="flex items-center border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 shrink-0 transition-colors">
        {/* Console toggle button — left side, mimics VS Code / UE style */}
        <button
          className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded transition-colors select-none ${
            consoleOpen
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => setConsoleOpen(v => !v)}
          title="Toggle Console"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zm2.854 3.646a.5.5 0 1 0-.708.708L5.293 9l-2.147 2.146a.5.5 0 0 0 .708.708l2.5-2.5a.5.5 0 0 0 0-.708l-2.5-2.5zm4.146 3.354a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3z" />
          </svg>
          Console
        </button>

        <button className={`flex items-center gap-1.5 text-xs px-1 py-0.5 rounded transition-colors select-none mx-4 ${
          consoleOpen
            ? 'bg-blue-600 text-white'
            : 'hidden'
        }`} onClick={() => pingBackend()} title="Ping Backend">
          Ping
        </button>

        {/* SSE 推送演示按钮 */}
        <button
          className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded transition-colors select-none ${PUSH_BTN_CLS[pushBtnState]}`}
          onClick={triggerPush}
          disabled={pushBtnState !== 'idle'}
          title="点击后后端将在 2 秒后通过 SSE 更新此按钮"
        >
          {PUSH_BTN_LABEL[pushBtnState]}
        </button>

        <div className="flex items-center gap-3 ml-auto">
          {/* 缩放指示器 */}
          <span className="flex items-center gap-0.5 text-xs text-gray-400 select-none">
            <button
              onClick={zoomOut}
              disabled={isMin}
              title="缩小 (Ctrl+-)"
              className="px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >－</button>
            <button
              onClick={resetZoom}
              title="重置缩放 (Ctrl+0)"
              className="w-10 text-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >{scale}%</button>
            <button
              onClick={zoomIn}
              disabled={isMax}
              title="放大 (Ctrl+=)"
              className="px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >＋</button>
          </span>
          <span className="text-xs text-gray-400 select-none ">
            Tauri React Python Template © {new Date().getFullYear()}
          </span>
          <BackendStatusBadge
            status={backendStatus.status}
            latency={backendStatus.latency}
            url={backendStatus.url}
          />
        </div>
      </footer>
    </div>
    </NotificationProvider>
    </DragProvider>
  )
}

export default App
