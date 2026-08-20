import { copyFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { ROOT } from './dev_identity.mjs'

const source = resolve(ROOT, 'src-tauri', 'icons', '32x32.png')
const destination = resolve(ROOT, 'public', 'app-icon.png')

const png = readFileSync(source)
const pngSignature = '89504e470d0a1a0a'

if (png.length < 24 || png.subarray(0, 8).toString('hex') !== pngSignature) {
  throw new Error(`${source} is not a valid PNG file`)
}

const width = png.readUInt32BE(16)
const height = png.readUInt32BE(20)
if (width !== 32 || height !== 32) {
  throw new Error(`${source} must be 32x32 pixels (received ${width}x${height})`)
}

copyFileSync(source, destination)
console.log('[icon:sync] Copied src-tauri/icons/32x32.png to public/app-icon.png')
