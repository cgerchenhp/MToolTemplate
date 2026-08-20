import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'

import { ROOT, readProjectConfig } from './dev_identity.mjs'

function parseArgs(args) {
  const options = { dryRun: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (arg === '--close-to-tray') {
      options.closeToTray = true
      continue
    }
    if (arg === '--no-close-to-tray') {
      options.closeToTray = false
      continue
    }

    const match = /^(--name|--project-id|--identifier|--port|--backend-port)(?:=(.*))?$/.exec(arg)
    if (!match) throw new Error(`Unknown argument: ${arg}`)
    const value = match[2] ?? args[++index]
    if (value === undefined) throw new Error(`${match[1]} requires a value`)

    const key = {
      '--name': 'displayName',
      '--project-id': 'projectId',
      '--identifier': 'identifier',
      '--port': 'preferredDevPort',
      '--backend-port': 'backendPort',
    }[match[1]]
    options[key] = key === 'preferredDevPort' || key === 'backendPort'
      ? Number(value)
      : value.trim()
  }
  return options
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function suggestedPort(projectId) {
  const hash = createHash('sha256').update(projectId).digest()
  return 5175 + hash.readUInt16BE(0) % 800
}

function suggestedBackendPort(projectId) {
  const hash = createHash('sha256').update(projectId).digest()
  return 12000 + hash.readUInt16BE(2) % 28000
}

async function collectOptions(parsed, current) {
  if (parsed.displayName && parsed.projectId && parsed.identifier) return parsed
  if (!process.stdin.isTTY) {
    throw new Error(
      'Interactive input is unavailable. Provide --name, --project-id and --identifier.',
    )
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const displayName = parsed.displayName ?? (
      await prompt.question(`App display name [${current.displayName}]: `)
      || current.displayName
    )
    const defaultProjectId = slugify(displayName) || current.projectId
    const projectId = parsed.projectId ?? (
      await prompt.question(`Project ID [${defaultProjectId}]: `)
      || defaultProjectId
    )
    const defaultIdentifier = `com.example.${projectId}`
    const identifier = parsed.identifier ?? (
      await prompt.question(`Tauri identifier [${defaultIdentifier}]: `)
      || defaultIdentifier
    )
    return { ...parsed, displayName, projectId, identifier }
  } finally {
    prompt.close()
  }
}

function validate(config) {
  if (!config.displayName || /[\\/:*?"<>|]/.test(config.displayName)) {
    throw new Error('App display name is empty or contains a character forbidden by Tauri')
  }
  if (!/^[a-z][a-z0-9-]*$/.test(config.projectId)) {
    throw new Error('Project ID must start with a letter and contain only lowercase letters, digits and hyphens')
  }
  if (!/^[A-Za-z0-9.-]+$/.test(config.identifier) || !config.identifier.includes('.')) {
    throw new Error('Tauri identifier must use reverse-domain form and contain only letters, digits, dots and hyphens')
  }
  for (const [label, port] of [
    ['Preferred dev port', config.preferredDevPort],
    ['Backend port', config.backendPort],
  ]) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      throw new Error(`${label} must be an integer between 1024 and 65535`)
    }
  }
  if (config.preferredDevPort === config.backendPort) {
    throw new Error('Preferred dev port and backend port must be different')
  }
  if (typeof config.closeToTray !== 'boolean') {
    throw new Error('closeToTray must be a boolean')
  }
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf8'))
}

function writeJson(relativePath, content, dryRun) {
  if (!dryRun) {
    writeFileSync(resolve(ROOT, relativePath), `${JSON.stringify(content, null, 2)}\n`, 'utf8')
  }
}

function replaceText(relativePath, oldValue, newValue, dryRun) {
  if (oldValue === newValue) return
  const path = resolve(ROOT, relativePath)
  const original = readFileSync(path, 'utf8')
  if (!original.includes(oldValue)) {
    console.warn(`[project:init] Warning: ${relativePath} did not contain ${JSON.stringify(oldValue)}`)
    return
  }
  if (!dryRun) writeFileSync(path, original.split(oldValue).join(newValue), 'utf8')
}

async function main() {
  const current = readProjectConfig()
  const parsed = parseArgs(process.argv.slice(2))
  const collected = await collectOptions(parsed, current)
  const config = {
    displayName: collected.displayName,
    projectId: collected.projectId,
    identifier: collected.identifier,
    preferredDevPort: collected.preferredDevPort
      ?? (collected.projectId === current.projectId
        ? current.preferredDevPort
        : suggestedPort(collected.projectId)),
    backendPort: collected.backendPort
      ?? (collected.projectId === current.projectId
        ? current.backendPort
        : suggestedBackendPort(collected.projectId)),
    closeToTray: collected.closeToTray ?? current.closeToTray ?? false,
  }
  validate(config)

  console.log(`[project:init] Name:       ${current.displayName} -> ${config.displayName}`)
  console.log(`[project:init] Project ID: ${current.projectId} -> ${config.projectId}`)
  console.log(`[project:init] Identifier: ${current.identifier} -> ${config.identifier}`)
  console.log(`[project:init] Dev port:   ${current.preferredDevPort} -> ${config.preferredDevPort}`)
  console.log(`[project:init] Backend:    ${current.backendPort} -> ${config.backendPort}`)
  console.log(`[project:init] Close tray: ${current.closeToTray ?? false} -> ${config.closeToTray}`)
  if (parsed.dryRun) console.log('[project:init] Dry run; no files will be changed.')

  const packageJson = readJson('package.json')
  const packageLock = readJson('package-lock.json')
  const tauriConfig = readJson('src-tauri/tauri.conf.json')

  packageJson.name = config.projectId
  packageLock.name = config.projectId
  packageLock.packages[''].name = config.projectId

  tauriConfig.productName = config.displayName
  tauriConfig.mainBinaryName = config.projectId
  tauriConfig.identifier = config.identifier
  tauriConfig.app.windows[0].title = config.displayName

  const cargoPath = resolve(ROOT, 'src-tauri/Cargo.toml')
  const cargoOriginal = readFileSync(cargoPath, 'utf8')
  const cargoBinaryPattern = /(\[\[bin\]\][\s\S]*?\nname\s*=\s*")[^"]+("\s*)/
  if (!cargoBinaryPattern.test(cargoOriginal)) {
    throw new Error('Could not locate [[bin]].name in src-tauri/Cargo.toml')
  }
  const cargoUpdated = cargoOriginal.replace(cargoBinaryPattern, `$1${config.projectId}$2`)

  writeJson('package.json', packageJson, parsed.dryRun)
  writeJson('package-lock.json', packageLock, parsed.dryRun)
  writeJson('src-tauri/tauri.conf.json', tauriConfig, parsed.dryRun)
  writeJson('project.config.json', config, parsed.dryRun)
  if (!parsed.dryRun) writeFileSync(cargoPath, cargoUpdated, 'utf8')

  for (const path of ['index.html', 'src/App.tsx', 'src/components/ui/TitleBar.tsx']) {
    replaceText(path, current.displayName, config.displayName, parsed.dryRun)
  }
  for (const path of ['backend/main.py', 'src-tauri/src/lib.rs', 'src-tauri/src/main.rs']) {
    replaceText(path, current.projectId, config.projectId, parsed.dryRun)
  }

  console.log('[project:init] Project metadata synchronized successfully.')
}

main().catch((error) => {
  console.error(`[project:init] ${error.message}`)
  process.exit(1)
})
