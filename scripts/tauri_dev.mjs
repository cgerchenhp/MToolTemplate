import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import net from 'node:net'
import { resolve, sep } from 'node:path'

import { getDevIdentity, ROOT } from './dev_identity.mjs'

const TAURI_TARGET_DIR = resolve(ROOT, 'src-tauri', 'target')

function normalizePath(path) {
  const normalized = resolve(path.trim())
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

function findRelocatedCargoCache() {
  const buildDir = resolve(TAURI_TARGET_DIR, 'debug', 'build')
  if (!existsSync(buildDir)) return undefined

  const expectedRoot = normalizePath(TAURI_TARGET_DIR)
  const expectedPrefix = `${expectedRoot}${sep}`

  for (const entry of readdirSync(buildDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue

    const rootOutput = resolve(buildDir, entry.name, 'root-output')
    if (!existsSync(rootOutput)) continue

    const cachedOutput = readFileSync(rootOutput, 'utf8').trim()
    if (!cachedOutput) continue

    const cachedRoot = normalizePath(cachedOutput)
    if (cachedRoot !== expectedRoot && !cachedRoot.startsWith(expectedPrefix)) {
      return cachedOutput
    }
  }

  return undefined
}

function cleanRelocatedCargoCache() {
  if (process.env.CARGO_TARGET_DIR) return

  const staleOutput = findRelocatedCargoCache()
  if (!staleOutput) return

  console.warn('[tauri:dev] Project location changed; removing stale Cargo/Tauri cache.')
  console.warn(`[tauri:dev] Stale build output: ${staleOutput}`)
  rmSync(TAURI_TARGET_DIR, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  })
}

function parseArgs(args) {
  const tauriArgs = []
  let requestedPort

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--port' || arg === '--vite-port') {
      const value = args[index + 1]
      if (value === undefined) throw new Error(`${arg} requires a port number`)
      requestedPort = Number(value)
      index += 1
      continue
    }
    if (arg.startsWith('--port=') || arg.startsWith('--vite-port=')) {
      requestedPort = Number(arg.slice(arg.indexOf('=') + 1))
      continue
    }
    tauriArgs.push(arg)
  }

  if (
    requestedPort !== undefined
    && (!Number.isInteger(requestedPort) || requestedPort < 1024 || requestedPort > 65535)
  ) {
    throw new Error('The Vite port must be an integer between 1024 and 65535')
  }

  return { requestedPort, tauriArgs }
}

function isPortAvailable(port) {
  return new Promise((resolvePromise) => {
    const server = net.createServer()
    server.unref()
    server.once('error', () => resolvePromise(false))
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      server.close(() => resolvePromise(true))
    })
  })
}

async function findPort(start, strict) {
  const end = strict ? start : Math.min(start + 200, 65535)
  for (let port = start; port <= end; port += 1) {
    if (await isPortAvailable(port)) return port
  }
  if (strict) throw new Error(`Requested Vite port ${start} is already in use`)
  throw new Error(`No free Vite port found in range ${start}-${end}`)
}

async function main() {
  const { requestedPort, tauriArgs } = parseArgs(process.argv.slice(2))
  const { config, key } = getDevIdentity()
  cleanRelocatedCargoCache()
  const port = await findPort(requestedPort ?? config.preferredDevPort, requestedPort !== undefined)
  const tauriCli = resolve(ROOT, 'node_modules/@tauri-apps/cli/tauri.js')

  if (!existsSync(tauriCli)) {
    throw new Error('Tauri CLI was not found. Run npm install first.')
  }

  const runtimeConfig = JSON.stringify({
    build: {
      devUrl: `http://127.0.0.1:${port}`,
      beforeDevCommand: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    },
  })

  console.log(`[tauri:dev] ${config.displayName} (instance ${key})`)
  console.log(`[tauri:dev] Vite URL: http://127.0.0.1:${port}`)

  const child = spawn(
    process.execPath,
    [
      tauriCli,
      'dev',
      '--config',
      'src-tauri/tauri.dev.conf.json',
      '--config',
      runtimeConfig,
      ...tauriArgs,
    ],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        TAURI_DEV_PROJECT_KEY: key,
        TAURI_DEV_VITE_PORT: String(port),
      },
    },
  )

  child.on('error', (error) => {
    console.error(`[tauri:dev] Failed to start Tauri: ${error.message}`)
    process.exitCode = 1
  })

  child.on('exit', (code, signal) => {
    if (signal && signal !== 'SIGINT') {
      console.error(`[tauri:dev] Tauri exited after signal ${signal}`)
      process.exitCode = 1
      return
    }
    process.exitCode = code ?? (signal === 'SIGINT' ? 0 : 1)
  })
}

main().catch((error) => {
  console.error(`[tauri:dev] ${error.message}`)
  process.exit(1)
})
