/**
 * 将 dist/assets/index-*.css 中的外部字体 @import 替换为 CDN 地址
 * 在 download-fonts.js + upload-to-cos.js 之后运行
 * 用法: node web/scripts/patch-css.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distAssets = path.resolve(__dirname, '..', 'dist', 'assets');
const CDN_BASE = 'https://nicerouterstatic.niceaigc.com';

const REPLACEMENTS = [
  [
    '@import"https://cdn.jsdelivr.net/gh/IKKI2000/harmonyos-fonts@main/css/harmonyos_sans_sc.css"',
    `@import"${CDN_BASE}/assets/fonts/harmonyos_sans_sc.css"`,
  ],
  [
    '@import"https://cdn.jsdelivr.net/gh/IKKI2000/harmonyos-fonts@main/css/harmonyos_sans.css"',
    `@import"${CDN_BASE}/assets/fonts/harmonyos_sans.css"`,
  ],
  [
    '@import"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"',
    `@import"${CDN_BASE}/assets/fonts/inter.css"`,
  ],
];

const cssFiles = fs.readdirSync(distAssets).filter((f) => f.endsWith('.css'));

for (const file of cssFiles) {
  const filePath = path.join(distAssets, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [from, to] of REPLACEMENTS) {
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      changed = true;
      console.log(`Patched ${file}: ${from.slice(0, 60)}...`);
    }
  }

  if (changed) fs.writeFileSync(filePath, content);
}

console.log('Done.');
