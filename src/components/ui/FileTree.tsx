import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'

export interface FileTreeNode {
  id?: string
  name: string
  type: 'file' | 'directory'
  path?: string
  children?: FileTreeNode[]
  icon?: ReactNode
  disabled?: boolean
}

export interface FileTreeProps {
  tree: FileTreeNode[]
  onSelectFile: (path: string, options: { compare: boolean; node: FileTreeNode }) => void
  selectedPath?: string
  selectedPaths?: readonly string[]
  activeSelectedPath?: string
  className?: string
  autoRevealSelected?: boolean
  revealSelectedKey?: string | number
  allowCompare?: boolean
  emptyText?: string
  stripExtensions?: readonly string[]
  stickyDirectories?: boolean
  renderLabel?: (node: FileTreeNode) => ReactNode
}

const TREE_ROW_HEIGHT = 24
const TREE_STICKY_Z_INDEX = 100

/** Recursive tree for files and other path-based hierarchical resources. */
export function FileTree({
  tree,
  onSelectFile,
  selectedPath,
  selectedPaths,
  activeSelectedPath,
  className,
  autoRevealSelected = false,
  revealSelectedKey,
  allowCompare = true,
  emptyText = '暂无文件',
  stripExtensions = [],
  stickyDirectories = true,
  renderLabel,
}: FileTreeProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedPathToken = useMemo(
    () => Symbol(`${selectedPath ?? ''}:${String(revealSelectedKey ?? '')}`),
    [revealSelectedKey, selectedPath],
  )

  useEffect(() => {
    if (!autoRevealSelected || !selectedPath) return
    const frame = window.requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLElement>(`[data-file-tree-path="${CSS.escape(selectedPath)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [autoRevealSelected, revealSelectedKey, selectedPath, tree])

  return (
    <div ref={rootRef} className={['relative isolate select-none', className].filter(Boolean).join(' ')}>
      {tree.map(node => (
        <TreeNode
          key={node.id ?? node.path ?? node.name}
          node={node}
          depth={0}
          onSelectFile={onSelectFile}
          selectedPath={selectedPath}
          selectedPathToken={selectedPathToken}
          selectedPaths={selectedPaths}
          activeSelectedPath={activeSelectedPath}
          allowCompare={allowCompare}
          stripExtensions={stripExtensions}
          stickyDirectories={stickyDirectories}
          renderLabel={renderLabel}
        />
      ))}
      {tree.length === 0 && (
        <div className="px-3 py-4 text-sm italic text-gray-400 dark:text-gray-600">{emptyText}</div>
      )}
    </div>
  )
}

interface TreeNodeProps {
  node: FileTreeNode
  depth: number
  onSelectFile: FileTreeProps['onSelectFile']
  selectedPath?: string
  selectedPathToken: symbol
  selectedPaths?: readonly string[]
  activeSelectedPath?: string
  allowCompare: boolean
  stripExtensions: readonly string[]
  stickyDirectories: boolean
  renderLabel?: FileTreeProps['renderLabel']
}

function TreeNode({
  node,
  depth,
  onSelectFile,
  selectedPath,
  selectedPathToken,
  selectedPaths,
  activeSelectedPath,
  allowCompare,
  stripExtensions,
  stickyDirectories,
  renderLabel,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1)
  const [collapsedSelectionToken, setCollapsedSelectionToken] = useState<symbol>()
  const hasChildren = Boolean(node.children?.length)
  const selectedInBranch = Boolean(hasChildren && selectedPath && containsPath(node, selectedPath))
  const activeSelectedInBranch = Boolean(hasChildren && activeSelectedPath && containsPath(node, activeSelectedPath))
  const isExpanded = expanded || (selectedInBranch && collapsedSelectionToken !== selectedPathToken)

  const toggleExpanded = useCallback(() => {
    if (isExpanded) {
      setExpanded(false)
      if (selectedInBranch) setCollapsedSelectionToken(selectedPathToken)
      return
    }
    setExpanded(true)
    setCollapsedSelectionToken(undefined)
  }, [isExpanded, selectedInBranch, selectedPathToken])

  const handleSelect = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (node.disabled) return
    if (node.path) {
      onSelectFile(node.path, {
        compare: allowCompare && (event.metaKey || event.ctrlKey),
        node,
      })
    } else if (hasChildren) {
      toggleExpanded()
    }
  }, [allowCompare, hasChildren, node, onSelectFile, toggleExpanded])

  const isSelected = Boolean(node.path && (selectedPaths?.includes(node.path) || node.path === selectedPath))
  const isActiveSelected = Boolean(node.path && node.path === (activeSelectedPath ?? selectedPath))
  const sticky = stickyDirectories && hasChildren
  const label = renderLabel?.(node) ?? stripKnownExtension(node.name, stripExtensions)

  return (
    <div>
      <div
        className={sticky ? 'sticky bg-gray-50 dark:bg-gray-950' : ''}
        style={sticky ? { top: `${depth * TREE_ROW_HEIGHT}px`, zIndex: TREE_STICKY_Z_INDEX - depth } : undefined}
      >
        <div
          data-file-tree-path={node.path}
          data-file-tree-selected={isSelected || undefined}
          className={[
            'flex h-6 items-center gap-1 px-2 text-[13px] transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20',
            node.disabled ? 'cursor-not-allowed opacity-50' : '',
            isActiveSelected
              ? 'bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : isSelected
                ? 'bg-cyan-50 font-medium text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300'
                : 'text-gray-700 dark:text-gray-300',
          ].join(' ')}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? `折叠 ${node.name}` : `展开 ${node.name}`}
              onClick={toggleExpanded}
              className={[
                'flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 dark:text-gray-500 dark:hover:bg-gray-800',
                isExpanded ? 'rotate-90' : '',
              ].join(' ')}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M6.27 4.22a.75.75 0 0 1 1.06 0l3.24 3.25a.75.75 0 0 1 0 1.06l-3.24 3.25a.75.75 0 1 1-1.06-1.06L9.05 8 6.27 5.22a.75.75 0 0 1 0-1Z" /></svg>
            </button>
          ) : (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-gray-400 dark:text-gray-500">
              {node.icon ?? <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M3.75 1.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75V5.78a1.75 1.75 0 0 0-.22-.53L9.72 1.72a.75.75 0 0 0-.53-.22H3.75Z" /></svg>}
            </span>
          )}
          <button
            type="button"
            onClick={handleSelect}
            disabled={node.disabled}
            aria-current={isActiveSelected ? 'page' : undefined}
            title={allowCompare ? `${node.name}（Ctrl/Cmd 点击可对照选择）` : node.name}
            className={[
              'min-w-0 flex-1 truncate text-left',
              hasChildren ? 'font-semibold text-gray-800 dark:text-gray-200' : '',
              node.path || hasChildren ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
          >
            {label}
          </button>
          {activeSelectedInBranch && !isExpanded && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" title="当前项目位于此目录" aria-label="当前项目位于此目录" />
          )}
        </div>
      </div>
      {hasChildren && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id ?? child.path ?? `${node.id ?? node.name}:${child.name}`}
              node={child}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              selectedPath={selectedPath}
              selectedPathToken={selectedPathToken}
              selectedPaths={selectedPaths}
              activeSelectedPath={activeSelectedPath}
              allowCompare={allowCompare}
              stripExtensions={stripExtensions}
              stickyDirectories={stickyDirectories}
              renderLabel={renderLabel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function containsPath(node: FileTreeNode, selectedPath: string): boolean {
  if (node.path === selectedPath) return true
  return node.children?.some(child => containsPath(child, selectedPath)) ?? false
}

function stripKnownExtension(name: string, extensions: readonly string[]): string {
  const extension = extensions.find(item => name.toLocaleLowerCase().endsWith(item.toLocaleLowerCase()))
  return extension ? name.slice(0, -extension.length) : name
}
