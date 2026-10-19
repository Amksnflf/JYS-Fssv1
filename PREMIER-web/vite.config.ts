import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function codeObfuscationPlugin(): Plugin {
  return {
    name: 'code-obfuscation-plugin',
    apply: 'build',
    transformIndexHtml(html) {
      return html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    },
     renderChunk(code) {
      // Strip any residual multi-line license/debug comments in production chunks
      const cleaned = code.replace(/\/\*![\s\S]*?\*\//g, '');
      return { code: cleaned, map: null };
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:7777';

  return {
    plugins: [react(), codeObfuscationPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    esbuild:
      mode === 'production'
        ? {
            drop: ['console', 'debugger'],
            legalComments: 'none',
          }
        : undefined,
    server: {
      host: '0.0.0.0',
      port: 9003,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/c-[hash].js',
          chunkFileNames: 'assets/c-[hash].js',
          assetFileNames: 'assets/a-[hash].[ext]',
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (id.includes('lightweight-charts') || id.includes('klinecharts') || id.includes('echarts')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            if (id.includes('axios') || id.includes('i18next') || id.includes('zustand') || id.includes('qrcode')) {
              return 'vendor-utils';
            }
            return undefined;
          },
        },
      },
    },
  };
});
