import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 腾讯云 COS 配置
// 可通过环境变量覆盖，或直接修改此处
const config = {
  SecretId: process.env.COS_SECRET_ID || '',
  SecretKey: process.env.COS_SECRET_KEY || '',
  Bucket: process.env.COS_BUCKET || 'nicerouter-1328735368',
  Region: process.env.COS_REGION || 'ap-nanjing',
  KeyPrefix: process.env.COS_KEY_PREFIX || '',
};

const cos = new COS({
  SecretId: config.SecretId,
  SecretKey: config.SecretKey,
});

const distPath = path.resolve(__dirname, '..', 'dist');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });
  return arrayOfFiles;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.txt': 'text/plain',
    '.xml': 'text/xml',
    '.gz': 'application/gzip',
    '.br': 'application/x-br',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

function uploadFile(filePath) {
  return new Promise((resolve, reject) => {
    const relativePath = path.relative(distPath, filePath);
    const key = config.KeyPrefix + relativePath.replace(/\\/g, '/');
    const contentType = getContentType(filePath);

    console.log(`上传: ${key}`);

    cos.putObject(
      {
        Bucket: config.Bucket,
        Region: config.Region,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: contentType,
      },
      (err, data) => {
        if (err) {
          console.error(`失败: ${key}`, err);
          reject(err);
        } else {
          resolve(data);
        }
      }
    );
  });
}

async function uploadAll() {
  if (!fs.existsSync(distPath)) {
    console.error(`错误: 构建目录不存在 - ${distPath}`);
    console.log('请先运行: bun run build:cdn');
    process.exit(1);
  }

  console.log('开始上传到腾讯云 COS...');
  console.log(`构建目录: ${distPath}`);
  console.log(`Bucket: ${config.Bucket} (${config.Region})`);
  if (config.KeyPrefix) console.log(`路径前缀: ${config.KeyPrefix}`);
  console.log('');

  const files = getAllFiles(distPath);
  console.log(`共 ${files.length} 个文件\n`);

  for (const file of files) {
    await uploadFile(file);
  }

  console.log('\n上传完成！');
}

uploadAll().catch((err) => {
  console.error('上传失败:', err);
  process.exit(1);
});
