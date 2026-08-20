import { inputCls } from './inputStyles'

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  /**
   * 使用 flex-1 min-w-0 样式，适合嵌入行内 flex 容器。
   * 默认 false，使用全宽 w-full 样式。
   */
  flex?: boolean
}

/**
 * TextInput — 统一样式的单行文本输入框。
 *
 * @example
 * // 全宽（默认）
 * <TextInput value={text} onChange={setText} placeholder="请输入…" />
 *
 * // 行内 flex 模式（与按钮并排时使用）
 * <div className="flex gap-2">
 *   <TextInput flex value={path} onChange={setPath} />
 *   <button>浏览</button>
 * </div>
 */
export function TextInput({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  flex = false,
}: TextInputProps) {
  const cls = flex
    ? 'flex-1 min-w-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
      'px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ' +
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
      'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
    : inputCls

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      className={cls}
    />
  )
}
