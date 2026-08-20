import { open } from '@tauri-apps/plugin-dialog'
import { flexInputCls, browseBtnCls } from './inputStyles'

interface DirPickerProps {
  value: string
  onChange: (path: string) => void
  placeholder?: string
  disabled?: boolean
}

/**
 * DirPicker — 目录路径选择控件。
 *
 * 组合了可编辑文本框与"浏览"按钮，调用系统目录选择对话框。
 * 需配合 FormField 使用以显示字段标签。
 *
 * @example
 * <FormField label="输出目录">
 *   <DirPicker value={outputDir} onChange={setOutputDir} />
 * </FormField>
 */
export function DirPicker({
  value,
  onChange,
  placeholder = '选择目录，或直接粘贴路径…',
  disabled,
}: DirPickerProps) {
  async function browse() {
    const selected = await open({ directory: true, multiple: false })
    if (selected) onChange(selected as string)
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={flexInputCls}
      />
      <button onClick={browse} disabled={disabled} className={browseBtnCls}>
        浏览
      </button>
    </div>
  )
}
