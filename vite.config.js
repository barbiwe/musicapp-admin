import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // Коли React бачить запит на /api, він перенаправляє його на бекенд
            '/api': {
                target: 'http://localhost:8080', // 👈 ТУТ ПОРТ ТВОГО БЕКЕНДУ
                changeOrigin: true,
                secure: false,
            }
        }
    }
})