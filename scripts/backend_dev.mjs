import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { getDevIdentity, ROOT } from './dev_identity.mjs'

const python = resolve(
  ROOT,
  process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python',
)

if (!existsSync(python)) {
  console.error(`Project virtual-environment Python was not found: ${python}`)
  process.exit(1)
}

const { config, key } = getDevIdentity()
console.log(`[backend:dev] ${config.displayName} (instance ${key})`)

const child = spawn(python, ['backend/main.py', ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
  env: {
    ...process.env,
    PYTHONUNBUFFERED: '1',
    TAURI_DEV_PROJECT_KEY: key,
    TAURI_BACKEND_PORT: process.env.TAURI_BACKEND_PORT ?? String(config.backendPort),
  },
})

child.on('error', (error) => {
  console.error(`[backend:dev] Failed to start Python: ${error.message}`)
  process.exitCode = 1
})

child.on('exit', (code, signal) => {
  if (signal && signal !== 'SIGINT') {
    console.error(`[backend:dev] Python exited after signal ${signal}`)
    process.exitCode = 1
    return
  }
  process.exitCode = code ?? (signal === 'SIGINT' ? 0 : 1)
})
