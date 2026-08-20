import { useEffect, useRef } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { FileDropZone } from './FileDropZone'
import { flexInputCls, browseBtnCls } from './inputStyles'

interface FilePickerProps {
  value: string
  onChange: (path: string) => void
  /**
   * 接受的文件扩展名（带前导点），如 ['.svg', '.png']。
   * 留空表示接受任意文件类型。
   */
  accept?: string[]
  placeholder?: string
  /** 启用 Tauri 文件拖放支持（默认 false） */
  withDrop?: boolean
  /** 拖放覆盖层提示文字，仅 withDrop=true 时有效 */
  dropHint?: string
  disabled?: boolean
  /** 浏览按钮文字，默认 "浏览" */
  buttonLabel?: string
  /** 按钮 loading 状态，为 true 时禁用按钮 */
  loading?: boolean
}

/**
 * FilePicker — 文件路径选择控件。
 *
 * 组合了可编辑文本框与"浏览"按钮，可选启用 Tauri 文件拖放。
 * 需配合 FormField 使用以显示字段标签。
 *
 * @example
 * // 基础用法（无拖放）
 * <FormField label="SVG 文件">
 *   <FilePicker value={path} onChange={setPath} accept={['.svg']} />
 * </FormField>
 *
 * // 启用拖放
 * <FormField label="SVG 文件">
 *   <FilePicker
 *     value={path}
 *     onChange={setPath}
 *     accept={['.svg']}
 *     withDrop
 *     dropHint="拖放 SVG 文件"
 *   />
 * </FormField>
 */
export function FilePicker({
  value,
  onChange,
  accept,
  placeholder = '选择、拖放文件，或直接粘贴路径…',
  withDrop = false,
  dropHint,
  disabled,
  buttonLabel = '浏览',
  loading,
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = inputRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [value])

  async function browse() {
    const filters = accept?.length
      ? [{ name: '文件', extensions: accept.map((e) => e.replace(/^\./, '')) }]
      : undefined
    const selected = await open({ multiple: false, filters })
    if (selected) onChange(selected as string)
  }

  const inner = (
    <div className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={flexInputCls}
      />
      <button onClick={browse} disabled={disabled || loading} className={browseBtnCls}>
        {buttonLabel}
      </button>
    </div>
  )

  if (withDrop) {
    return (
      <FileDropZone
        accept={accept}
        onFilesDropped={(paths) => onChange(paths[0])}
        hint={dropHint}
        disabled={disabled}
      >
        {inner}
      </FileDropZone>
    )
  }

  return inner
}
