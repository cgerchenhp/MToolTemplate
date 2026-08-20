import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function validatePort(value, field) {
  if (!Number.isInteger(value) || value < 1024 || value > 65535) {
    throw new Error(`project.config.json ${field} must be an integer between 1024 and 65535`)
  }
}

export function readProjectConfig() {
  const path = resolve(ROOT, 'project.config.json')
  const config = JSON.parse(readFileSync(path, 'utf8'))

  if (typeof config.displayName !== 'string' || !config.displayName.trim()) {
    throw new Error('project.config.json must contain a non-empty displayName')
  }
  if (typeof config.projectId !== 'string' || !config.projectId.trim()) {
    throw new Error('project.config.json must contain a non-empty projectId')
  }
  if (typeof config.identifier !== 'string' || !config.identifier.trim()) {
    throw new Error('project.config.json must contain a non-empty identifier')
  }
  validatePort(config.preferredDevPort, 'preferredDevPort')
  validatePort(config.backendPort, 'backendPort')
  if (typeof config.closeToTray !== 'boolean') {
    throw new Error('project.config.json closeToTray must be a boolean')
  }
  return config
}

export function getDevIdentity() {
  const config = readProjectConfig()
  let canonicalRoot = realpathSync(ROOT)
  if (process.platform === 'win32') canonicalRoot = canonicalRoot.toLowerCase()

  const pathHash = createHash('sha256').update(canonicalRoot).digest('hex').slice(0, 12)
  const safeProjectId = config.projectId
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tauri-app'

  return {
    config,
    key: `${safeProjectId}-${pathHash}`,
  }
}
