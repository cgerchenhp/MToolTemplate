import { open as shellOpen } from '@tauri-apps/plugin-shell'
import { isTauri } from './api'

const EXTERNAL_OPEN_DEDUPE_MS = 750

let lastOpenRequest: { url: string; at: number } | undefined

/** Open one external URL through the platform-appropriate channel. */
export async function openExternal(url: string): Promise<void> {
  const normalizedUrl = url.trim()
  if (!normalizedUrl) return

  const now = Date.now()
  if (
    lastOpenRequest?.url === normalizedUrl
    && now - lastOpenRequest.at < EXTERNAL_OPEN_DEDUPE_MS
  ) return

  lastOpenRequest = { url: normalizedUrl, at: now }

  if (isTauri) {
    await shellOpen(normalizedUrl)
    return
  }

  window.open(normalizedUrl, '_blank', 'noopener,noreferrer')
}
