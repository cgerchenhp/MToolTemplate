/**
 * 全局共享的 Tailwind 样式常量，统一各原子控件外观。
 * 所有表单控件应从此处引用样式，禁止在业务组件中内联重复定义。
 */

/** 全宽普通文本 / 数字输入框 */
export const inputCls =
  'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
  'px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

/** flex 弹性文本输入框（用于与按钮并排的行内输入） */
export const flexInputCls =
  'flex-1 min-w-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
  'px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

/** 等宽字体版 flex 输入框（用于颜色十六进制值、路径等） */
export const monoFlexInputCls =
  'flex-1 min-w-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
  'px-2 py-1.5 text-sm font-mono text-gray-900 dark:text-gray-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

/** 次要操作按钮（浏览、打开等） */
export const browseBtnCls =
  'shrink-0 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 ' +
  'text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

/** 主操作按钮基础样式（不含颜色，由 Button 组件按 variant 叠加） */
export const btnBaseCls =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors ' +
  'whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed select-none'

/** 全宽 select 下拉框 */
export const selectCls =
  'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
  'px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

/** 全宽多行文本框 */
export const textareaCls =
  'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
  'px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors resize-y'
