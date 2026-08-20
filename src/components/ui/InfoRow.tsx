interface InfoRowProps {
  label: string
  value: string
  /**
   * 紧凑模式 — 用于 CollapsibleSection 内的属性列表。
   * 字号更小、纵向 padding 极小，搭配 divide-y 容器呈现 UE DetailView 风格。
   * 容器需使用 `grid grid-cols-[6rem_1fr]`（或自定义列宽）。
   */
  dense?: boolean
}

/**
 * InfoRow — 键值对行，渲染两个相邻的 span 元素（React Fragment）。
 *
 * **普通模式**：放置在 `grid grid-cols-2` 容器内，配合 `gap-y-1`。
 * **dense 模式**：放置在 `grid grid-cols-[6rem_1fr] divide-y` 容器内，呈现 UE DetailView 风格。
 *
 * @example
 * // 普通
 * <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3">
 *   <InfoRow label="格式" value="PNG" />
 * </div>
 *
 * // dense（配合 CollapsibleSection）
 * <div className="grid grid-cols-[6rem_1fr] divide-y divide-gray-100 dark:divide-gray-700/40">
 *   <InfoRow dense label="尺寸" value="16 × 16 px" />
 * </div>
 */
export function InfoRow({ label, value, dense }: InfoRowProps) {
  if (dense) {
    return (
      <>
        <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 truncate">
          {label}
        </span>
        <span className="px-2 py-0.5 text-xs text-gray-800 dark:text-gray-200 font-medium break-all">
          {value}
        </span>
      </>
    )
  }
  return (
    <>
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-800 dark:text-gray-200 font-medium break-all">{value}</span>
    </>
  )
}
