import { selectCls } from './inputStyles'

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  /** 空选项提示文字，被选中时 value 为空字符串 */
  placeholder?: string
  disabled?: boolean
}

/**
 * SelectField — 统一样式的下拉选择控件。
 *
 * 需配合 FormField 使用以显示字段标签。
 *
 * @example
 * <FormField label="输出格式">
 *   <SelectField
 *     value={format}
 *     onChange={setFormat}
 *     options={[
 *       { value: 'png', label: 'PNG' },
 *       { value: 'webp', label: 'WebP' },
 *     ]}
 *   />
 * </FormField>
 */
export function SelectField({ value, onChange, options, placeholder, disabled }: SelectFieldProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={selectCls}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
