import {
  useState, useEffect, useRef, useCallback, startTransition, memo,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'

/**
 * JsonTree — JSON 树状结构查看器
 *
 * 用法示例：
 *   const expandState = smart_expand_json(data)
 *   <JsonTree value={data} initialExpandState={expandState} />
 *
 * 展开状态 key 格式（ExpandState）：
 *   ""                              → 根对象（不使用）
 *   "text_chunks"                   → 根级对象键
 *   "text_chunks/c2pa.actions.v2"   → 嵌套对象键（/ 分隔）
 *   "chunks[2]"                     → 根级数组元素
 *   "text_chunks/actions[0]/desc"   → 混合路径
 */

export type ExpandState = Record<string, boolean>

// ─────────────────────────────────────────────────────────────────────────────
// smart_expand_json — 根据内容自动计算折叠状态
// ─────────────────────────────────────────────────────────────────────────────

/** 这些键对应的节点默认折叠（通常是大型二进制/哈希列表等噪音数据） */
const _COLLAPSE_KEYS = new Set([
  'chunks',          // PNG 原始 Chunk 列表（通常 35+ 个 IDAT）
  'c2pa.hash.boxes', // 每个 Chunk 的 SHA-256 哈希列表
  'c2pa.hash.data',  // 数据哈希详情
])

function _build(value: unknown, path: string, depth: number, out: ExpandState): void {
  if (value === null || typeof value !== 'object') return

  const isArr = Array.isArray(value)
  const size = isArr
    ? (value as unknown[]).length
    : Object.keys(value as Record<string, unknown>).length

  // 数组元素（path 末尾含 [N]）不做 key 规则匹配，只做尺寸/深度规则
  const isArrayItem = /\[\d+\]$/.test(path)
  const key = isArrayItem ? '' : (path.split('/').at(-1) ?? '')

  let open = true
  if (_COLLAPSE_KEYS.has(key)) open = false
  else if (isArr && size > 8) open = false
  else if (depth >= 3) open = false
  else if (depth >= 2 && size > 5) open = false

  out[path] = open

  // 始终递归，使子节点也有预设状态（即使父节点折叠）
  if (isArr) {
    ;(value as unknown[]).forEach((item, i) => {
      const childPath = path ? `${path}[${i}]` : `[${i}]`
      _build(item, childPath, depth + 1, out)
    })
  } else {
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      const childPath = path ? `${path}/${k}` : k
      _build(v, childPath, depth + 1, out)
    })
  }
}

/**
 * 根据 JSON 内容计算默认展开/折叠状态。
 *
 * 策略：
 * - 深度 0-1：全部展开
 * - 深度 2，节点 ≤ 5 个键：展开；否则折叠
 * - 深度 ≥ 3：折叠
 * - 超过 8 项的数组：折叠
 * - 特定语义 key（chunks, c2pa.hash.boxes 等）：折叠
 *
 * @returns ExpandState — 可直接传给 JsonTree.initialExpandState
 */
export function smart_expand_json(value: unknown): ExpandState {
  const out: ExpandState = {}
  _build(value, '', 0, out)
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// 内部渲染组件
// ─────────────────────────────────────────────────────────────────────────────

/** 原始值着色渲染 */
function Prim({ v, truncate = true }: { v: unknown; truncate?: boolean }) {
  const [tipRect, setTipRect] = useState<DOMRect | null>(null)
  const spanRef = useRef<HTMLSpanElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])

  if (v === null)
    return <span className="text-gray-400 dark:text-gray-500 italic">null</span>
  if (typeof v === 'boolean')
    return <span className="text-violet-600 dark:text-violet-400">{String(v)}</span>
  if (typeof v === 'number')
    return <span className="text-amber-600 dark:text-amber-400">{v}</span>
  if (typeof v === 'string') {
    const shouldTruncate = truncate && v.length > 160
    const display = shouldTruncate ? `${v.slice(0, 160)}…` : v

    const showTip = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (spanRef.current) setTipRect(spanRef.current.getBoundingClientRect())
    }
    const hideTip = () => {
      hideTimer.current = setTimeout(() => setTipRect(null), 300)
    }
    const cancelHide = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }

    const tooltip =
      shouldTruncate && tipRect
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                left: Math.min(tipRect.left, window.innerWidth - 424),
                top:
                  window.innerHeight - tipRect.bottom < 200
                    ? Math.max(tipRect.top - 248, 4)
                    : tipRect.bottom + 4,
                zIndex: 9999,
                maxWidth: 400,
              }}
              className="p-2 rounded-md shadow-xl bg-gray-900 text-gray-100 text-[11px] font-mono whitespace-pre-wrap break-all border border-gray-600 max-h-60 overflow-y-auto scrollbar-dark"
              onMouseEnter={cancelHide}
              onMouseLeave={hideTip}
            >
              {v}
            </div>,
            document.body,
          )
        : null

    return (
      <>
        <span
          ref={spanRef}
          className="text-emerald-700 dark:text-emerald-400 break-all"
          onMouseEnter={shouldTruncate ? showTip : undefined}
          onMouseLeave={shouldTruncate ? hideTip : undefined}
        >
          &quot;{display}&quot;
        </span>
        {tooltip}
      </>
    )
  }
  return <span>{String(v)}</span>
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

/** 顶部路径面包屑，固定高度避免树内容跳动 */
function Breadcrumb({ path }: { path: string }) {
  const parts = path ? path.split('/') : null
  return (
    <div className="px-2 h-6 flex items-center overflow-hidden shrink-0 border-b border-gray-200 dark:border-gray-700 text-[10px] font-mono select-none">
      {parts ? (
        parts.map((part, i) => (
          <span key={i} className="flex items-center shrink-0">
            {i > 0 && (
              <span className="mx-0.5 text-gray-300 dark:text-gray-600">/</span>
            )}
            <span className="text-gray-600 dark:text-gray-300">{part}</span>
          </span>
        ))
      ) : (
        <span className="text-gray-300 dark:text-gray-700 italic">—</span>
      )}
    </div>
  )
}

// ─── CopyBtn ──────────────────────────────────────────────────────────────────

/** hover 时出现的复制按钮，使用父级 group/row 组触发 */
function CopyBtn({
  copied,
  onClick,
}: {
  copied: boolean
  onClick: (e: MouseEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="复制路径 + 值"
      className="ml-auto shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity
        text-[11px] leading-none px-1 py-0.5 rounded
        text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
        hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      {copied ? '✓' : '⎘'}
    </button>
  )
}

// ─── collectExpandablePaths ──────────────────────────────────────────────────

/**
 * 收集 value 自身及所有后代中「可展开」节点的路径（非叶节点）。
 * 用于 Ctrl+点击时批量设置展开状态。
 */
function collectExpandablePaths(value: unknown, path: string): string[] {
  const paths: string[] = [path]
  function walk(v: unknown, p: string) {
    if (v === null || typeof v !== 'object') return
    if (Array.isArray(v)) {
      ;(v as unknown[]).forEach((item, i) => {
        const cp = p ? `${p}[${i}]` : `[${i}]`
        if (item !== null && typeof item === 'object') {
          paths.push(cp)
          walk(item, cp)
        }
      })
    } else {
      Object.entries(v as Record<string, unknown>).forEach(([k, vv]) => {
        const cp = p ? `${p}/${k}` : k
        if (vv !== null && typeof vv === 'object') {
          paths.push(cp)
          walk(vv, cp)
        }
      })
    }
  }
  walk(value, path)
  return paths
}

// ─── TreeNode ─────────────────────────────────────────────────────────────────

interface NodeProps {
  label: string
  path: string
  value: unknown
  depth: number
  state: ExpandState
  truncate: boolean
  toggle: (path: string) => void
  /** Ctrl+点击时调用，递归展开/折叠当前节点及所有后代 */
  toggleDeep: (path: string, value: unknown, open: boolean) => void
  onHover: (path: string) => void
}

/** 三角图标占位宽度（px），叶节点用空 span 对齐 */
const TOGGLE_W = 'w-3.5 h-3.5 shrink-0'

/** 单个树节点（键-值对），递归渲染 */
const TreeNode = memo(function TreeNode({ label, path, value, depth, state, truncate, toggle, toggleDeep, onHover }: NodeProps) {
  const [copied, setCopied] = useState(false)

  const isExpandable = value !== null && typeof value === 'object'
  const padLeft = depth * 14

  async function handleCopy(e: MouseEvent) {
    e.stopPropagation()
    const text =
      value !== null && typeof value === 'object'
        ? `${path}\n${JSON.stringify(value, null, 2)}`
        : `${path}: ${JSON.stringify(value)}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const rowCls =
    'flex items-center gap-1 min-w-0 py-px pr-1 rounded-sm ' +
    'hover:bg-gray-100 dark:hover:bg-gray-800/60 group/row'

  if (!isExpandable) {
    return (
      <div
        style={{ paddingLeft: padLeft }}
        className={rowCls}
        onMouseEnter={() => onHover(path)}
      >
        {/* 对齐占位（与三角按钮同宽） */}
        <span className={TOGGLE_W} />
        <span className="shrink-0 text-sky-700 dark:text-sky-300 font-medium">
          {label}
        </span>
        <span className="text-gray-300 dark:text-gray-600 shrink-0">:</span>
        <span className="flex-1 min-w-0 overflow-hidden">
          <Prim v={value} truncate={truncate} />
        </span>
        <CopyBtn copied={copied} onClick={handleCopy} />
      </div>
    )
  }

  const isArr = Array.isArray(value)
  const size = isArr
    ? (value as unknown[]).length
    : Object.keys(value as Record<string, unknown>).length

  if (size === 0) {
    return (
      <div
        style={{ paddingLeft: padLeft }}
        className={rowCls}
        onMouseEnter={() => onHover(path)}
      >
        <span className={TOGGLE_W} />
        <span className="shrink-0 text-sky-700 dark:text-sky-300 font-medium">
          {label}
        </span>
        <span className="text-gray-300 dark:text-gray-600 shrink-0">:</span>
        <span className="text-gray-400 dark:text-gray-500 flex-1">
          {isArr ? '[]' : '{}'}
        </span>
        <CopyBtn copied={copied} onClick={handleCopy} />
      </div>
    )
  }

  const expanded = state[path] ?? depth < 2

  return (
    <div>
      {/* 折叠头行 */}
      <div
        style={{ paddingLeft: padLeft }}
        className={rowCls}
        onMouseEnter={() => onHover(path)}
      >
        {/* 三角切换按钮；Ctrl+点击递归展开/折叠全部子节点 */}
        <button
          type="button"
          title="展开/折叠；Ctrl+点击递归展开/折叠全部子节点"
          onClick={(e) => {
            if (e.ctrlKey) toggleDeep(path, value, !expanded)
            else toggle(path)
          }}
          className={`${TOGGLE_W} flex items-center justify-center
            text-gray-400 dark:text-gray-500 hover:text-sky-500 dark:hover:text-sky-400`}
        >
          <svg
            className={`h-3 w-3 transition-transform duration-100 ${expanded ? 'rotate-90' : ''}`}
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M6 4l4 4-4 4V4z" />
          </svg>
        </button>
        {/* 标签 + 折叠摘要（点击切换） */}
        <button
          type="button"
          onClick={(e) => {
            if (e.ctrlKey) toggleDeep(path, value, !expanded)
            else toggle(path)
          }}
          className="flex items-center gap-1 min-w-0 text-left flex-1"
        >
          <span className="text-sky-700 dark:text-sky-300 font-medium break-all">
            {label}
          </span>
          <span className="text-gray-300 dark:text-gray-600 shrink-0">:</span>
          {!expanded && (
            <span className="text-gray-400 dark:text-gray-500 text-[11px] shrink-0">
              {isArr ? `[${size}]` : `{${size}}`}
            </span>
          )}
        </button>
        <CopyBtn copied={copied} onClick={handleCopy} />
      </div>

      {/* 子节点 */}
      {expanded && (
        <div>
          {isArr
            ? (value as unknown[]).map((item, i) => (
                <TreeNode
                  key={i}
                  label={`[${i}]`}
                  path={path ? `${path}[${i}]` : `[${i}]`}
                  value={item}
                  depth={depth + 1}
                  state={state}
                  truncate={truncate}
                  toggle={toggle}
                  toggleDeep={toggleDeep}
                  onHover={onHover}
                />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <TreeNode
                  key={k}
                  label={k}
                  path={path ? `${path}/${k}` : k}
                  value={v}
                  depth={depth + 1}
                  state={state}
                  truncate={truncate}
                  toggle={toggle}
                  toggleDeep={toggleDeep}
                  onHover={onHover}
                />
              ))}
        </div>
      )}
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// JsonTree — 公共组件
// ─────────────────────────────────────────────────────────────────────────────

interface JsonTreeProps {
  value: unknown
  /**
   * 展开/折叠初始状态，key 为路径字符串，value 为 true（展开）/false（折叠）。
   * 可由 smart_expand_json() 计算得出。
   * 当此 prop 引用发生变化时，组件内部状态自动重置（适合数据切换场景）。
   */
  initialExpandState?: ExpandState
  /**
   * 字符串值超过 160 字符时是否截断显示（默认 true）。
   * 截断时悬停节点会弹出 tooltip 显示完整内容。
   * 设为 false 则始终展示完整字符串。
   */
  truncateStrings?: boolean
  className?: string
}

/**
 * JsonTree — 交互式 JSON 树状查看器。
 *
 * - 对象键和数组元素均可折叠/展开（三角按钮或点击标签）
 * - 顶部 breadcrumb 栏实时显示鼠标悬停行的完整路径
 * - 所有层级的标签与同级对齐（折叠三角不影响缩进）
 * - 悬停行出现 ⎘ 按钮，复制「路径 + 值」到剪贴板
 * - 字符串/数字/布尔/null 按类型着色
 * - 搭配 smart_expand_json() 可自动计算合理的初始状态
 *
 * @example
 * const expandState = smart_expand_json(data)
 * <JsonTree value={data} initialExpandState={expandState} />
 */
export function JsonTree({ value, initialExpandState = {}, truncateStrings = true, className }: JsonTreeProps) {
  const [state, setState] = useState<ExpandState>(initialExpandState)
  const [hoveredPath, setHoveredPath] = useState('')
  const prevRef = useRef<ExpandState>(initialExpandState)

  // 当 initialExpandState 引用变化时（如加载新数据），重置内部状态
  useEffect(() => {
    if (prevRef.current !== initialExpandState) {
      prevRef.current = initialExpandState
      setState(initialExpandState)
      setHoveredPath('')
    }
  }, [initialExpandState])

  // 稳定引用：避免 hover 时重建函数导致所有 TreeNode 重渲
  const toggle = useCallback((path: string) => {
    setState((s) => ({ ...s, [path]: !s[path] }))
  }, [])

  // startTransition：将 800+ 节点的批量展开标记为非紧急更新，防止 UI 冻结
  const toggleDeep = useCallback((path: string, value: unknown, open: boolean) => {
    const paths = collectExpandablePaths(value, path)
    startTransition(() => {
      setState((s) => {
        const next = { ...s }
        for (const p of paths) next[p] = open
        return next
      })
    })
  }, [])

  if (value === null || typeof value !== 'object') {
    return (
      <div
        className={`font-mono text-xs rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-2 ${className ?? ''}`}
      >
        <Prim v={value} />
      </div>
    )
  }

  const isArr = Array.isArray(value)
  const objEntries = isArr ? [] : Object.entries(value as Record<string, unknown>)

  return (
    <div
      className={`font-mono text-xs leading-[1.6] flex flex-col overflow-hidden rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 ${className ?? ''}`}
      onMouseLeave={() => setHoveredPath('')}
    >
      <Breadcrumb path={hoveredPath} />
      <div className="overflow-auto p-2">
        {isArr
          ? (value as unknown[]).map((item, i) => (
              <TreeNode
                key={i}
                label={`[${i}]`}
                path={`[${i}]`}
                value={item}
                depth={0}
                state={state}
                truncate={truncateStrings}
                toggle={toggle}
                toggleDeep={toggleDeep}
                onHover={setHoveredPath}
              />
            ))
          : objEntries.map(([k, v]) => (
              <TreeNode
                key={k}
                label={k}
                path={k}
                value={v}
                depth={0}
                state={state}
                truncate={truncateStrings}
                toggle={toggle}
                toggleDeep={toggleDeep}
                onHover={setHoveredPath}
              />
            ))}
      </div>
    </div>
  )
}
