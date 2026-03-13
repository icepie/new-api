/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import react from '@vitejs/plugin-react';
import { defineConfig, transformWithEsbuild } from 'vite';
import path from 'path';
import fs from 'node:fs';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import pkg from '@douyinfe/vite-plugin-semi';
import viteCompression from 'vite-plugin-compression';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
const { vitePluginSemi } = pkg;

/** Generates dist/version.json at build time for frontend update detection */
function versionPlugin() {
  let outDir;
  return {
    name: 'vite-plugin-version',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    closeBundle() {
      const version = { version: Date.now().toString(), buildTime: new Date().toISOString() };
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.resolve(outDir, 'version.json'), JSON.stringify(version, null, 2));
    },
  };
}

// CDN 模式：设置环境变量 NEW_API_CDN=1 启用
// CDN 域名通过 NEW_API_CDN_URL 配置，例如：https://static.example.com
const isCDNMode = process.env.NEW_API_CDN === '1';
const cdnBase = process.env.NEW_API_CDN_URL || 'https://nicerouterstatic.niceaigc.com';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  experimental: isCDNMode
    ? {
        renderBuiltUrl(filename) {
          return `${cdnBase}/${filename}`;
        },
      }
    : undefined,
  plugins: [
    codeInspectorPlugin({
      bundler: 'vite',
    }),
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!/src\/.*\.js$/.test(id)) {
          return null;
        }

        // Use the exposed transform from vite, instead of directly
        // transforming with esbuild
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
    react(),
    vitePluginSemi(),
    versionPlugin(),
    ViteImageOptimizer({
      test: /\.(jpe?g|png|webp|svg|avif)$/i,
      includePublic: true,
      cache: true,
      cacheLocation: path.resolve(__dirname, 'node_modules/.vite-image-optimizer-cache'),
      jpg: { quality: 82, mozjpeg: true },
      jpeg: { quality: 82, mozjpeg: true },
      png: { quality: 82, compressionLevel: 9 },
      webp: { quality: 82, lossless: false },
      avif: { quality: 80, lossless: false },
      svg: { multipass: true },
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240,
      deleteOriginFile: false,
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.json': 'json',
      },
    },
  },
  build: {
    reportCompressedSize: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — must be first and standalone so all other chunks can depend on it
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-core';
          }
          // vendor: mermaid (large, lazy-loaded)
          if (id.includes('node_modules/mermaid') || id.includes('node_modules/dagre') || id.includes('node_modules/cytoscape') || id.includes('node_modules/d3-')) {
            return 'mermaid-vendor';
          }
          // vendor: katex
          if (id.includes('node_modules/katex')) {
            return 'katex-vendor';
          }
          // vendor: vchart / visactor
          if (id.includes('@visactor/')) {
            return 'vchart-vendor';
          }
          // vendor: markdown pipeline
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-') || id.includes('node_modules/rehype-') || id.includes('node_modules/unified') || id.includes('node_modules/hast') || id.includes('node_modules/mdast') || id.includes('node_modules/micromark') || id.includes('node_modules/highlight.js')) {
            return 'markdown-vendor';
          }
          // vendor: tools (no React dependency)
          if (id.includes('node_modules/axios') || id.includes('node_modules/marked') || id.includes('node_modules/history') || id.includes('node_modules/i18next/')) {
            return 'tools';
          }
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://nicerouter.com',
        changeOrigin: true,
      },
      '/mj': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/pg': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/u': {
        target: 'https://nicerouter.com',
        changeOrigin: true,
      },
    },
  },
});
