import { monoFlexInputCls } from './inputStyles'

interface ColorFieldProps {
  /** 十六进制颜色字符串，如 "#1A1A2E" */
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/**
 * ColorField — 原生颜色拾取器 + 十六进制文本输入的组合控件。
 *
 * 色板与文本框双向同步：拖动色板或手动输入十六进制值均可更新颜色。
 * 适用于颜色值必填的场景；若颜色可为空，请使用 NullableColorField。
 *
 * @example
 * <FormField label="背景色">
 *   <ColorField value={bgColor} onChange={setBgColor} />
 * </FormField>
 */
export function ColorField({ value, onChange, disabled }: ColorFieldProps) {
  return (
    <div className="flex gap-1.5 items-center">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-8 w-8 shrink-0 rounded border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={monoFlexInputCls}
      />
    </div>
  )
}
