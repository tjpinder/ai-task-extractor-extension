import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync, renameSync, rmSync } from 'fs';

// Plugin to copy static files and fix HTML paths
function copyStaticFiles() {
  return {
    name: 'copy-static-files',
    closeBundle() {
      // Copy manifest.json
      copyFileSync('manifest.json', 'dist/manifest.json');

      // Copy icons
      const iconsDir = 'public/icons';
      const distIconsDir = 'dist/icons';

      if (!existsSync(distIconsDir)) {
        mkdirSync(distIconsDir, { recursive: true });
      }

      if (existsSync(iconsDir)) {
        const files = readdirSync(iconsDir);
        files.forEach(file => {
          if (file.endsWith('.png')) {
            copyFileSync(`${iconsDir}/${file}`, `${distIconsDir}/${file}`);
          }
        });
      }

      // Move HTML files to dist root
      const popupHtml = 'dist/src/popup/index.html';
      const optionsHtml = 'dist/src/options/index.html';

      if (existsSync(popupHtml)) {
        renameSync(popupHtml, 'dist/popup.html');
      }
      if (existsSync(optionsHtml)) {
        renameSync(optionsHtml, 'dist/options.html');
      }

      // Clean up empty src folder
      if (existsSync('dist/src')) {
        rmSync('dist/src', { recursive: true, force: true });
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyStaticFiles()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        'content-script': resolve(__dirname, 'src/content/content-script.ts'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    outDir: 'dist',
    emptyDirBeforeWrite: true,
  },
});
