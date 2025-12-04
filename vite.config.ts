import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      babel: {
        plugins: []
      }
    }),
    {
      name: 'copy-htaccess',
      closeBundle() {
        try {
          copyFileSync(
            resolve(__dirname, 'public/.htaccess'),
            resolve(__dirname, 'dist/.htaccess')
          );
          console.log('✅ .htaccess copied to dist folder');
        } catch (err) {
          console.log('ℹ️ No .htaccess found in public folder');
        }
      }
    },
    {
      name: 'generate-version',
      closeBundle() {
        try {
          // Generate a unique build version based on timestamp and random hash
          const buildTime = new Date().toISOString();
          const versionHash = createHash('md5')
            .update(buildTime + Math.random().toString())
            .digest('hex')
            .substring(0, 8);
          
          const versionInfo = {
            version: versionHash,
            buildTime: buildTime,
            timestamp: Date.now()
          };
          
          // Write version file to dist folder (accessible as static asset)
          writeFileSync(
            resolve(__dirname, 'dist/version.json'),
            JSON.stringify(versionInfo, null, 2)
          );
          
          console.log(`✅ Build version generated: ${versionHash}`);
        } catch (err) {
          console.error('❌ Error generating version file:', err);
        }
      }
    }
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: 5173
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'react-toastify', 'sweetalert2']
        }
      }
    }
  }
});
