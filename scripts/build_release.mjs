import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'

const ROOT = resolve(import.meta.dirname, '..')
const npmCli = process.env.npm_execpath

if (!npmCli) {
  throw new Error('build_release.mjs must be launched through an npm script')
}

function run(args) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (!['win32', 'darwin'].includes(process.platform)) {
  throw new Error('Portable desktop releases are supported on Windows and macOS')
}

const tauriArgs = process.argv.slice(2)
run(['run', 'tauri', '--', 'build', ...tauriArgs])
run(['run', 'post:bundle'])
run(['run', 'release:stage'])
