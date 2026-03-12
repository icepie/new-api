/**
 * 下载字体文件并生成本地 CSS
 * 用法: node web/scripts/download-fonts.js
 * 输出: web/dist/assets/fonts/ 目录 + 生成 fonts.css
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const fontsDir = path.join(distDir, 'assets', 'fonts');
const CDN_BASE = 'https://nicerouterstatic.niceaigc.com';

fs.mkdirSync(fontsDir, { recursive: true });

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ body: Buffer.concat(chunks), contentType: res.headers['content-type'] || '' }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadFile(url, dest) {
  if (fs.existsSync(dest)) {
    console.log(`  skip (exists): ${path.basename(dest)}`);
    return;
  }
  console.log(`  downloading: ${url}`);
  const { body } = await fetch(url);
  fs.writeFileSync(dest, body);
  console.log(`  saved: ${path.basename(dest)}`);
}

// 解析 CSS 中的 @font-face src url()，下载字体文件，替换为 CDN 路径
async function processFontCSS(cssUrl, outputName) {
  console.log(`\nFetching CSS: ${cssUrl}`);
  const { body } = await fetch(cssUrl);
  let css = body.toString('utf8');

  const cssBase = cssUrl.substring(0, cssUrl.lastIndexOf('/') + 1);

  // 只下载 woff2，跳过 eot/woff/ttf
  const urlRegex = /url\(['"]?((?:https?:\/\/)?[^)'"\s]+\.woff2[^)'"\s]*)['"]?\)/g;
  const downloads = [];
  let match;
  while ((match = urlRegex.exec(css)) !== null) {
    let u = match[1].split('?')[0];
    if (!u.startsWith('http')) {
      // 相对路径 -> 绝对路径
      u = new URL(u, cssBase).href;
    }
    downloads.push(u);
  }

  const unique = [...new Set(downloads)];
  const urlMap = {};

  for (const fontUrl of unique) {
    const filename = path.basename(new URL(fontUrl).pathname);
    const dest = path.join(fontsDir, filename);
    await downloadFile(fontUrl, dest);
    urlMap[fontUrl] = `${CDN_BASE}/assets/fonts/${filename}`;
  }

  // 替换 CSS 中所有字体 url：woff2 替换为 CDN，其他格式（eot/woff/ttf）直接用原始绝对 URL
  let newCss = css.replace(
    /url\(['"]?((?:https?:\/\/)?[^)'"\s]+\.(?:woff2?|ttf|otf|eot)[^)'"\s]*)['"]?\)/g,
    (full, u) => {
      const absU = u.startsWith('http') ? u.split('?')[0] : new URL(u.split('?')[0], cssBase).href;
      if (urlMap[absU]) return `url('${urlMap[absU]}')`;
      // 非 woff2：保留为绝对 URL（原始来源）
      if (!u.startsWith('http')) return `url('${absU}')`;
      return full;
    }
  );

  const outPath = path.join(fontsDir, outputName);
  fs.writeFileSync(outPath, newCss);
  console.log(`  CSS written: assets/fonts/${outputName}`);
  return `${CDN_BASE}/assets/fonts/${outputName}`;
}

// Inter 字体 (Google Fonts)
async function processInterFont() {
  const googleUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  return processFontCSS(googleUrl, 'inter.css');
}

// HarmonyOS 字体 (jsdelivr)
async function processHarmonyFonts() {
  const sc = await processFontCSS(
    'https://cdn.jsdelivr.net/gh/IKKI2000/harmonyos-fonts@main/css/harmonyos_sans_sc.css',
    'harmonyos_sans_sc.css'
  );
  const en = await processFontCSS(
    'https://cdn.jsdelivr.net/gh/IKKI2000/harmonyos-fonts@main/css/harmonyos_sans.css',
    'harmonyos_sans.css'
  );
  return { sc, en };
}

async function main() {
  const interCssUrl = await processInterFont();
  const { sc: scCssUrl, en: enCssUrl } = await processHarmonyFonts();

  console.log('\n=== Done ===');
  console.log('Replace in your CSS:');
  console.log(`  @import"https://cdn.jsdelivr.net/gh/IKKI2000/harmonyos-fonts@main/css/harmonyos_sans_sc.css"  =>  @import"${scCssUrl}"`);
  console.log(`  @import"https://cdn.jsdelivr.net/gh/IKKI2000/harmonyos-fonts@main/css/harmonyos_sans.css"     =>  @import"${enCssUrl}"`);
  console.log(`  @import"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"     =>  @import"${interCssUrl}"`);
  console.log('\nNow upload web/dist/assets/fonts/ to COS, then run patch-css.js');
}

main().catch((e) => { console.error(e); process.exit(1); });
