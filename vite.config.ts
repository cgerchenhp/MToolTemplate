import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

interface ProjectConfig {
  preferredDevPort: number
  backendPort: number
}

const projectConfig = JSON.parse(
  readFileSync(new URL('./project.config.json', import.meta.url), 'utf8'),
) as ProjectConfig

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(
      process.env.VITE_BACKEND_URL ?? `http://127.0.0.1:${projectConfig.backendPort}`,
    ),
  },
  optimizeDeps: {
    // This template has a single frontend entry. Without an explicit entry,
    // Vite may scan HTML files in documentation, data, and generated assets.
    entries: ['index.html'],
  },
  server: {
    port: projectConfig.preferredDevPort,
    // Tauri must load the exact URL selected by scripts/tauri_dev.mjs.
    strictPort: true,
    watch: {
      // Avoid reloading the UI when generated files or local logs change.
      ignored: [
        '**/temp/**',
        '**/logs/**',
        '**/docs/**',
        '**/reference_docs/**',
        '**/data/**',
        '**/data_zh_cn/**',
        '**/.venv/**',
        '**/.pytest_cache/**',
        '**/__pycache__/**',
        '**/.git/**',
        '**/src-tauri/target/**',
      ],
    },
  },
})
