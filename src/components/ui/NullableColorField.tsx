import { monoFlexInputCls } from './inputStyles'

interface NullableColorFieldProps {
  /** 十六进制颜色字符串；null 表示"不设置/不修改" */
  value: string | null
  onChange: (value: string | null) => void
  /** value 为 null 时点击后的初始颜色 */
  defaultColor?: string
  disabled?: boolean
}

/**
 * NullableColorField — 可为空的颜色拾取器。
 *
 * - `value === null`：显示白底＋红色对角线色块，视觉上表示「无颜色」，点击后置为 `defaultColor`。
 * - `value !== null`：与 ColorField 相同的原生拾取器＋十六进制文本框，
 *   色块右上角有红色 ✕ 徽标，点击可将值清回 null。
 *
 * 适用于颜色**可选**的场景（如覆盖前景色、可选背景色）。
 * 颜色必填时请使用 `ColorField`。
 *
 * @example
 * <FormField label="背景色">
 *   <NullableColorField value={bgColor} onChange={setBgColor} />
 * </FormField>
 */
export function NullableColorField({
  value,
  onChange,
  defaultColor = '#ffffff',
  disabled,
}: NullableColorFieldProps) {
  const isNull = value === null

  return (
    <div className="flex gap-1.5 items-center">
      {/* h-8 w-8 固定容器尺寸，group/swatch 限制 hover 范围 */}
      <div className="relative shrink-0 h-8 w-8 group/swatch">
        {/* 始终用 input[type=color]，保证两种状态尺寸完全一致（button 在部分 WebView 下高度不稳定）*/}
        <input
          type="color"
          value={isNull ? defaultColor : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          title={isNull ? '点击设置颜色' : '点击选择颜色'}
          className="h-8 w-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* null 状态覆层：底色 + 红色对角线；pointer-events-none 让点击穿透到 input */}
        {isNull && (
          <>
            {/* 底色层：亮色模式白色，暗色模式 gray-700 */}
            <div className="absolute inset-0 rounded pointer-events-none border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            {/* 对角线层 */}
            <div
              className="absolute inset-0 rounded pointer-events-none"
              style={{
                background:
                  'linear-gradient(to bottom right, transparent calc(50% - 1px), #ef4444 calc(50% - 1px), #ef4444 calc(50% + 1px), transparent calc(50% + 1px))',
              }}
            />
          </>
        )}

        {/* 非 null 状态：hover 时显示 ✕ 清除按钮
            非 hover：opacity-0 + pointer-events-none，对点击完全透明
            hover  ：opacity-100 + pointer-events-auto，可点击 */}
        {!isNull && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            title="清除颜色"
            className="absolute -top-1.5 -right-1.5 z-10 w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed opacity-0 pointer-events-none group-hover/swatch:opacity-100 group-hover/swatch:pointer-events-auto"
          >
            <span className="text-[8px] font-bold leading-none">✕</span>
          </button>
        )}
      </div>

      {/* 始终渲染文本框，保证两种状态高度一致 */}
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => value !== null && onChange(e.target.value)}
        disabled={disabled || isNull}
        placeholder="—"
        className={`${monoFlexInputCls} h-8`}
      />
    </div>
  )
}
