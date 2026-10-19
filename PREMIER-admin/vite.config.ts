import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/a-[hash].js',
        chunkFileNames: 'assets/c-[hash].js',
        assetFileNames: 'assets/s-[hash].[ext]',
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('echarts')) return 'v-ec';
          if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-')) return 'v-ui';
          if (id.includes('react') || id.includes('scheduler') || id.includes('zustand')) return 'v-rt';
          return undefined;
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 9010,
    proxy: {
      '/api': {
        target: process.env.VITE_ADMIN_API_TARGET || 'http://127.0.0.1:7777',
        changeOrigin: true,
      },
    },
  },
});
