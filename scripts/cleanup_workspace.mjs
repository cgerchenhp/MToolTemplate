import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'

import { getDevIdentity, ROOT } from './dev_identity.mjs'

const args = process.argv.slice(2)
const mode = args.find(argument => !argument.startsWith('--')) ?? 'report'
const knownModes = new Set(['report', 'build', 'deep'])

if (args.includes('--help')) {
  console.log([
    'Usage: node scripts/cleanup_workspace.mjs <report|build|deep> [--dry-run] [--deep]',
    '',
    '  report  Show reclaimable disk usage without deleting anything.',
    '  build   Remove generated build/debug outputs but preserve release-portable and artifacts.',
    '  deep    Also remove release-portable, node_modules, and .venv.',
    '',
    'Options:',
    '  --dry-run  Preview the selected cleanup without deleting.',
    '  --deep     Include deep-clean targets when mode is report.',
    '  --force    Allow deep cleanup without a matching archived Portable release.',
  ].join('\n'))
  process.exit(0)
}

if (!knownModes.has(mode)) {
  throw new Error('Unknown cleanup mode: ' + mode)
}

const profile = mode === 'deep' || args.includes('--deep') ? 'deep' : 'build'
const dryRun = mode === 'report' || args.includes('--dry-run')
const targets = []

function workspacePath(relativePath, reason) {
  const absolutePath = resolve(ROOT, relativePath)
  const relation = relative(ROOT, absolutePath)
  if (!relation || relation.startsWith('..') || isAbsolute(relation)) {
    throw new Error('Refusing cleanup target outside the workspace: ' + absolutePath)
  }
  targets.push({ absolutePath, label: relativePath, reason, external: false })
}

workspacePath('dist', 'Vite production output')
workspacePath('.pytest_cache', 'pytest cache')
workspacePath('logs', 'workspace runtime logs')
workspacePath('node_modules/.vite', 'Vite dependency cache')
workspacePath('node_modules/.tmp', 'TypeScript/Vite temporary metadata')
workspacePath('src-tauri/binaries', 'staged PyInstaller sidecar')

if (profile === 'deep') {
  workspacePath('src-tauri/target', 'all Cargo/Tauri build outputs')
  workspacePath('node_modules', 'npm dependencies (restore with npm install)')
  workspacePath('.venv', 'Python virtual environment (restore from requirements.txt)')
} else {
  workspacePath('src-tauri/target/debug', 'Cargo/Tauri debug output')
  workspacePath('src-tauri/target/release', 'Cargo/Tauri release intermediates and bundles')
}

for (const root of ['backend', 'scripts']) {
  discoverPythonCaches(resolve(ROOT, root))
}

const { config, key } = getDevIdentity()
const tauriConfig = JSON.parse(readFileSync(resolve(ROOT, 'src-tauri', 'tauri.conf.json'), 'utf8'))
const runtimeNames = new Set([
  key + '.backend.port',
  config.projectId + '-panic.log',
  config.projectId + '-startup.log',
  tauriConfig.mainBinaryName + '-panic.log',
  tauriConfig.mainBinaryName + '-startup.log',
])
for (const name of runtimeNames) {
  const absolutePath = resolve(tmpdir(), name)
  const relation = relative(tmpdir(), absolutePath)
  if (!relation || relation.startsWith('..') || isAbsolute(relation)) continue
  targets.push({
    absolutePath,
    label: '<temp>/' + name,
    reason: 'project-specific development runtime file',
    external: true,
  })
}

const existing = collapseTargets(targets).filter(target => existsSync(target.absolutePath))
let totalBytes = 0
let totalFiles = 0

console.log('[cleanup] Profile: ' + profile + (dryRun ? ' (dry-run)' : ''))
for (const target of existing) {
  const stats = measurePath(target.absolutePath)
  totalBytes += stats.bytes
  totalFiles += stats.files
  console.log(
    '[cleanup] ' + formatBytes(stats.bytes).padStart(10) + '  '
      + String(stats.files).padStart(7) + ' files  ' + target.label,
  )
  console.log('          ' + target.reason)
}

if (existing.length === 0) {
  console.log('[cleanup] Nothing to clean.')
  process.exit(0)
}

console.log('[cleanup] Reclaimable: ' + formatBytes(totalBytes) + ' across ' + totalFiles + ' files.')
if (dryRun) {
  console.log(
    profile === 'deep'
      ? '[cleanup] Preview only. Run npm run cleanup:deep to delete these paths.'
      : '[cleanup] Preview only. Run npm run cleanup to delete build outputs.',
  )
  process.exit(0)
}

if (profile === 'deep' && !args.includes('--force')) {
  requireArchivedPortable(config)
}

for (const target of existing) {
  rmSync(target.absolutePath, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  })
}

function requireArchivedPortable(projectConfig) {
  const portableRoot = resolve(ROOT, 'src-tauri', 'target', 'release-portable')
  const manifestPath = resolve(portableRoot, 'release-manifest.json')
  if (!existsSync(manifestPath)) return

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const baseName = safeName(projectConfig.projectId)
    + '-v' + safeName(manifest.version)
    + '-' + safeName(manifest.platform)
    + '-portable'
  const archivePath = resolve(ROOT, 'artifacts', baseName + '.zip')
  const checksumPath = archivePath + '.sha256'
  if (!existsSync(archivePath) || !existsSync(checksumPath)) {
    throw new Error(
      'Deep cleanup would remove release-portable before it is archived. '
        + 'Run npm run release:archive first, or pass --force to discard it.',
    )
  }
}
console.log(
  '[cleanup] Removed ' + existing.length
    + ' generated paths; reclaimed approximately ' + formatBytes(totalBytes) + '.',
)
if (profile === 'build') {
  console.log('[cleanup] Preserved src-tauri/target/release-portable and artifacts.')
}

function discoverPythonCaches(directory) {
  if (!existsSync(directory)) return
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory() && ['__pycache__', '.mypy_cache', '.ruff_cache'].includes(entry.name)) {
      targets.push({
        absolutePath: path,
        label: relative(ROOT, path),
        reason: 'Python tool cache',
        external: false,
      })
    } else if (entry.isDirectory()) {
      discoverPythonCaches(path)
    } else if (entry.name === '.coverage') {
      targets.push({
        absolutePath: path,
        label: relative(ROOT, path),
        reason: 'Python coverage data',
        external: false,
      })
    }
  }
}

function collapseTargets(items) {
  const unique = [...new Map(items.map(item => [resolve(item.absolutePath), item])).values()]
  unique.sort((left, right) => left.absolutePath.length - right.absolutePath.length)
  return unique.filter((item, index) => !unique.slice(0, index).some(parent => {
    if (parent.external !== item.external) return false
    const relation = relative(parent.absolutePath, item.absolutePath)
    return relation && !relation.startsWith('..') && !isAbsolute(relation)
  }))
}

function measurePath(path) {
  const stat = lstatSync(path)
  if (!stat.isDirectory()) return { bytes: stat.size, files: 1 }

  let bytes = 0
  let files = 0
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name)
    if (entry.isSymbolicLink()) {
      const childStat = lstatSync(child)
      bytes += childStat.size
      files += 1
    } else {
      const measured = measurePath(child)
      bytes += measured.bytes
      files += measured.files
    }
  }
  return { bytes, files }
}

function formatBytes(bytes) {
  if (bytes < 1024) return String(bytes) + ' B'
  const units = ['KiB', 'MiB', 'GiB', 'TiB']
  let value = bytes / 1024
  let unit = units[0]
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024
    unit = units[index]
  }
  return value.toFixed(value >= 10 ? 1 : 2) + ' ' + unit
}

function safeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mtool-app'
}
