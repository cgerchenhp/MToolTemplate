import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const python = resolve(
  process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python',
)

if (!existsSync(python)) {
  console.error(`Project virtual-environment Python was not found: ${python}`)
  process.exit(1)
}

const result = spawnSync(python, process.argv.slice(2), { stdio: 'inherit' })
if (result.error) {
  throw result.error
}
process.exit(result.status ?? 1)
