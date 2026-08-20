interface SectionTitleProps {
  children: React.ReactNode
}

/**
 * SectionTitle — 面板内的次级分区标题。
 *
 * 用于在 FeaturePanel 内部划分各内容区块（提示词、生成参数、EXIF 等）。
 * 比 FeaturePanel 的主标题层级低一级。
 *
 * @example
 * <SectionTitle>正向提示词</SectionTitle>
 * <p className="mt-1 ...">...</p>
 */
export function SectionTitle({ children }: SectionTitleProps) {
  return <p className="font-semibold text-gray-700 dark:text-gray-300">{children}</p>
}
