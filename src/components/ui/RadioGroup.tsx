export interface RadioOption<T extends string = string> {
  value: T
  label: string
  description?: string
}

interface RadioGroupProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: RadioOption<T>[]
  name: string
  disabled?: boolean
  /** 水平排列（默认竖向） */
  horizontal?: boolean
}

/**
 * RadioGroup — 单选按钮组（pill 样式）。
 *
 * @example
 * <RadioGroup
 *   name="mode"
 *   value={mode}
 *   onChange={setMode}
 *   options={[
 *     { value: 'text',    label: '文本识别' },
 *     { value: 'table',   label: '表格识别' },
 *     { value: 'formula', label: '公式识别' },
 *   ]}
 *   horizontal
 * />
 */
export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  name,
  disabled = false,
  horizontal = false,
}: RadioGroupProps<T>) {
  return (
    <div
      className={`flex gap-2 flex-wrap ${horizontal ? 'flex-row' : 'flex-col'}`}
      role="radiogroup"
    >
      {options.map((opt) => {
        const checked = opt.value === value
        return (
          <label
            key={opt.value}
            className={`
              inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer
              select-none transition-colors
              ${checked
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span
              className={`w-3 h-3 rounded-full border shrink-0 flex items-center justify-center
                ${checked
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-400 dark:border-gray-500'
                }`}
            >
              {checked && (
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </span>
            <span>{opt.label}</span>
            {opt.description && (
              <span className="text-xs opacity-60">{opt.description}</span>
            )}
          </label>
        )
      })}
    </div>
  )
}
