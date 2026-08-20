import { textareaCls } from './inputStyles'

interface TextareaInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 初始行数，默认 3 */
  rows?: number
  maxLength?: number
  disabled?: boolean
}

/**
 * TextareaInput — 统一样式的多行文本输入框。
 *
 * 支持垂直拖拽调整高度（`resize-y`）。
 * 需配合 FormField 使用以显示字段标签。
 *
 * @example
 * <FormField label="备注">
 *   <TextareaInput value={note} onChange={setNote} rows={4} placeholder="输入说明…" />
 * </FormField>
 */
export function TextareaInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  disabled,
}: TextareaInputProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
      className={textareaCls}
    />
  )
}
