npm create vite@latest . -- --template react-ts

npm install -D @tailwindcss/vite

npm install @tauri-apps/cli @tauri-apps/api

修改文件vite.config.ts，添加tailwindcss插件：

```
import tailwindcss from '@tailwindcss/vite'
```
