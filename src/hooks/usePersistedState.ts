import { useState, useEffect } from 'react'

/**
 * localStorage 持久化 useState。
 *
 * - 初次渲染从 localStorage 读取已保存值；若不存在则使用 defaultValue
 * - 每次状态变化自动写回 localStorage
 * - 存储超配额或私有浏览模式下静默降级为普通 state（不影响功能）
 * - key 建议使用 `mt:{feature}:{field}` 命名空间，如 `mt:icons:outputDir`
 *
 * @example
 * const [dirPath, setDirPath] = usePersistedState('mt:icons:outputDir', '')
 * const [color, setColor]     = usePersistedState('mt:icons:bgColor', '#ffffff')
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // storage 超配额或无权限（隐私模式）—— 静默忽略
    }
  }, [key, state])

  return [state, setState]
}
