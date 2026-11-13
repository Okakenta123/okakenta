import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 相対パスで出力（Cloudflare Pages でもサブパスでも動く）
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
