import { inputCls } from './inputStyles'

interface NumberInputProps {
  /**
   * 当前值。支持传入 number 或 string。
   * 对于允许为空的可选数字字段（如"自动"），将状态定义为 string 并直接传入。
   */
  value: number | string
  /**
   * 回调接收原始字符串，由调用方决定是否转换为数字。
   * - 数字状态：`onChange={(v) => setState(Number(v))}`
   * - 字符串状态（允许空值）：`onChange={setState}`
   */
  onChange: (raw: string) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
}

/**
 * NumberInput — 统一样式的数字输入框。
 *
 * @example
 * // 数字状态
 * <NumberInput value={cornerRadius} onChange={(v) => setCornerRadius(Number(v))} />
 *
 * // 字符串状态（允许为空，空 = 自动）
 * <NumberInput value={fontSize} onChange={setFontSize} placeholder="自动" />
 *
 * // 带范围约束
 * <NumberInput value={padding} onChange={(v) => setPadding(Number(v))} min={0} max={0.5} step={0.05} />
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  disabled,
}: NumberInputProps) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      className={inputCls}
    />
  )
}
