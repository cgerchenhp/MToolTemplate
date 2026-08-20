/**
 * NotificationContext.ts — 独立 context 模块
 *
 * 与 NotificationStack.tsx 分离的目的：在 Vite HMR 模式下，
 * 修改 NotificationStack.tsx 不会重建 createContext 产生的对象，
 * 避免已渲染的 Provider 与新渲染的消费者 context ID 失配导致白屏。
 */
import { createContext } from 'react'

export type NotifyLevel = 'info' | 'success' | 'warning' | 'error'

export interface NotifyAction {
  label: string
  onClick: () => void
}

export interface NotifyOptions {
  level?: NotifyLevel
  /** 可选标题，加粗显示在消息上方 */
  title?: string
  /** 自动消失的毫秒数，默认 4 000 */
  duration?: number
  /** 可选操作按钮，点击后执行回调并自动关闭通知 */
  action?: NotifyAction
}

export interface NotifyFn {
  (message: string, options?: NotifyOptions): void
  info:    (message: string, title?: string) => void
  success: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  error:   (message: string, title?: string) => void
}

export const NotificationContext = createContext<NotifyFn | null>(null)
