import { fileURLToPath, URL } from 'node:url'
import type { ServerResponse } from 'node:http'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (_error, _request, response) => {
            const serverResponse = response as ServerResponse | undefined
            if (!serverResponse || serverResponse.headersSent) {
              return
            }

            serverResponse.writeHead(503, {
              'Content-Type': 'application/json; charset=utf-8',
            })
            serverResponse.end(
              JSON.stringify({
                success: false,
                error: {
                  message: '后端服务未连接，请先启动 backend 后端服务后再操作。',
                  code: 'BackendUnavailable',
                },
              }),
            )
          })
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
