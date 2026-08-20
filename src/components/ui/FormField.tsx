interface FormFieldProps {
  /** 标签文字 */
  label: string
  /** 追加在 label 后的浅色补充说明，例如 "(1–3 个字符)" */
  hint?: string
  children: React.ReactNode
}

/**
 * FormField — 带标签的表单字段包装器。
 *
 * 统一各字段的标签样式，可附加淡色提示文字。
 * 所有表单控件应用 FormField 包裹，避免在各处内联重复写 label。
 *
 * @example
 * <FormField label="输出目录">
 *   <DirPicker value={dir} onChange={setDir} />
 * </FormField>
 *
 * <FormField label="圆角" hint="(-1=自动)">
 *   <NumberInput value={r} onChange={(v) => setR(Number(v))} />
 * </FormField>
 */
export function FormField({ label, hint, children }: FormFieldProps) {
  return (
    <div>
      <p className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
        {hint && (
          <span className="text-gray-400 dark:text-gray-500 font-normal"> {hint}</span>
        )}
      </p>
      {children}
    </div>
  )
}
