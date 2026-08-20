interface CheckboxFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** 复选框旁边的说明文字 */
  label: string
  disabled?: boolean
}

/**
 * CheckboxField — 带内联标签的复选框控件。
 *
 * 整行可点击，避免用户需要精准点击小型复选框。
 * checkbox 尺寸 (h-4 w-4) 与 label 字号 (text-sm) 与标准输入框 (text-sm) 对齐，
 * 在 FormField 包裹后可与同行的 TextInput / SelectField 等控件视觉等高。
 *
 * @example
 * <CheckboxField checked={bold} onChange={setBold} label="使用粗体字体" />
 */
export function CheckboxField({ checked, onChange, label, disabled }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 py-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    </label>
  )
}
