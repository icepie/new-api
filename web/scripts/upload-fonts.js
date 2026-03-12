/**
 * 只上传 web/dist/assets/fonts/ 到 COS
 * 用法: COS_SECRET_ID=xxx COS_SECRET_KEY=xxx node web/scripts/upload-fonts.js
 */
import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.resolve(__dirname, '..', 'dist', 'assets', 'fonts');

const config = {
  SecretId: process.env.COS_SECRET_ID || '',
  SecretKey: process.env.COS_SECRET_KEY || '',
  Bucket: process.env.COS_BUCKET || 'nicerouter-1328735368',
  Region: process.env.COS_REGION || 'ap-nanjing',
};

if (!config.SecretId || !config.SecretKey) {
  console.error('请设置 COS_SECRET_ID 和 COS_SECRET_KEY 环境变量');
  process.exit(1);
}

const cos = new COS({ SecretId: config.SecretId, SecretKey: config.SecretKey });

const CONTENT_TYPES = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.css': 'text/css',
};

function upload(filePath, key) {
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: config.Bucket,
      Region: config.Region,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentType: CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream',
    }, (err, data) => err ? reject(err) : resolve(data));
  });
}

async function main() {
  const files = fs.readdirSync(fontsDir);
  console.log(`上传 ${files.length} 个字体文件到 COS...\n`);
  for (const file of files) {
    const key = `assets/fonts/${file}`;
    console.log(`上传: ${key}`);
    await upload(path.join(fontsDir, file), key);
  }
  console.log('\n上传完成！');
}

main().catch((e) => { console.error(e); process.exit(1); });
