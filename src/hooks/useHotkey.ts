import { useEffect, useRef } from 'react'

export interface HotkeyOptions {
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  /** 是否阻止浏览器/系统默认行为，默认 true */
  preventDefault?: boolean
  /** 当焦点在输入类元素（input / textarea / select / contentEditable）时忽略快捷键，默认 true */
  ignoreInputs?: boolean
}

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * 绑定全局键盘快捷键。
 *
 * 使用 ref 保存最新 handler，避免因 handler 引用变化而重复注册/注销监听器。
 * 组件卸载时自动清理事件监听器。
 *
 * @param key        目标键名，与 KeyboardEvent.key 精确匹配，区分大小写
 * @param handler    快捷键触发时执行的回调
 * @param options    修饰键和行为选项
 *
 * @example
 * // Ctrl+` 切换 Console 面板
 * useHotkey('`', () => setConsoleOpen(v => !v), { ctrl: true })
 *
 * // Ctrl+Shift+P 打开命令面板
 * useHotkey('P', openCommandPalette, { ctrl: true, shift: true })
 */
export function useHotkey(
  key: string,
  handler: () => void,
  options: HotkeyOptions = {},
): void {
  const {
    ctrl = false,
    meta = false,
    shift = false,
    alt = false,
    preventDefault = true,
    ignoreInputs = true,
  } = options

  // 用 ref 保存最新 handler，避免重新注册监听器
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== key) return
      if (ctrl && !e.ctrlKey) return
      if (meta && !e.metaKey) return
      if (shift && !e.shiftKey) return
      if (alt && !e.altKey) return

      if (ignoreInputs) {
        const target = e.target as HTMLElement
        if (INPUT_TAGS.has(target.tagName) || target.isContentEditable) return
      }

      if (preventDefault) e.preventDefault()
      handlerRef.current()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, ctrl, meta, shift, alt, preventDefault, ignoreInputs])
}
