export type ExpandState = Record<string, boolean>

/** Keys whose nodes normally contain large binary or hash lists. */
const COLLAPSE_KEYS = new Set([
  'chunks',
  'c2pa.hash.boxes',
  'c2pa.hash.data',
])

function buildExpandState(
  value: unknown,
  path: string,
  depth: number,
  out: ExpandState,
): void {
  if (value === null || typeof value !== 'object') return

  const isArray = Array.isArray(value)
  const size = isArray
    ? (value as unknown[]).length
    : Object.keys(value as Record<string, unknown>).length
  const isArrayItem = /\[\d+\]$/.test(path)
  const key = isArrayItem ? '' : (path.split('/').at(-1) ?? '')

  let open = true
  if (COLLAPSE_KEYS.has(key)) open = false
  else if (isArray && size > 8) open = false
  else if (depth >= 3) open = false
  else if (depth >= 2 && size > 5) open = false

  out[path] = open

  if (isArray) {
    ;(value as unknown[]).forEach((item, index) => {
      const childPath = path ? `${path}[${index}]` : `[${index}]`
      buildExpandState(item, childPath, depth + 1, out)
    })
  } else {
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
      const childPath = path ? `${path}/${childKey}` : childKey
      buildExpandState(childValue, childPath, depth + 1, out)
    })
  }
}

/** Calculate sensible initial expanded/collapsed state for JSON tree nodes. */
export function smart_expand_json(value: unknown): ExpandState {
  const out: ExpandState = {}
  buildExpandState(value, '', 0, out)
  return out
}
