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

/**
 * 标准化模型名称（生成多种可能的匹配 key）
 * 参考 pricing-manager 的 normalizeModelName 逻辑
 */
const normalizeModelName = (name) => {
  if (!name) return [];
  
  const lower = name.toLowerCase();
  const variants = [lower];
  
  // 去掉日期后缀：gpt-4o-2024-05-13 -> gpt-4o
  const noDate = lower.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  if (noDate !== lower) variants.push(noDate);
  
  // 去掉 -preview, -latest 等后缀
  const noSuffix = lower
    .replace(/-preview$/, '')
    .replace(/-latest$/, '')
    .replace(/@\d+$/, '')
    .replace(/-instruct$/, '')
    .replace(/-chat$/, '');
  if (noSuffix !== lower) variants.push(noSuffix);
  
  // 去掉路径前缀：Qwen/Qwen2.5-72B-Instruct -> qwen2.5-72b-instruct
  if (lower.includes('/')) {
    const afterSlash = lower.split('/').pop();
    variants.push(afterSlash);
    // 也去掉 -instruct 等
    const afterSlashClean = afterSlash.replace(/-instruct$/, '').replace(/-chat$/, '');
    if (afterSlashClean !== afterSlash) variants.push(afterSlashClean);
  }
  
  // 替换分隔符：claude-3.5-sonnet <-> claude-3-5-sonnet
  const dotToHyphen = lower.replace(/\./g, '-');
  if (dotToHyphen !== lower) variants.push(dotToHyphen);
  const hyphenToDot = lower.replace(/-(\d+)-/g, '.$1.');
  if (hyphenToDot !== lower) variants.push(hyphenToDot);
  
  // 去掉 Pro/ 前缀
  const noProPrefix = lower.replace(/^pro\//, '');
  if (noProPrefix !== lower) {
    variants.push(noProPrefix);
    // 对去掉前缀的也应用其他规则
    const noProNoDate = noProPrefix.replace(/-\d{4}-\d{2}-\d{2}$/, '');
    if (noProNoDate !== noProPrefix) variants.push(noProNoDate);
    const noProNoSuffix = noProPrefix
      .replace(/-preview$/, '')
      .replace(/-latest$/, '')
      .replace(/@\d+$/, '')
      .replace(/-instruct$/, '')
      .replace(/-chat$/, '');
    if (noProNoSuffix !== noProPrefix) variants.push(noProNoSuffix);
  }
  
  return [...new Set(variants)]; // 去重
};

// 辅助函数：在 models.dev 数据中查找匹配的模型
// 参考 pricing-manager 的 findOfficialPrice 逻辑
export const findModelInDevData = (modelName, devData) => {
  if (!devData || !modelName) return null;
  
  // 生成查询名称的变体
  const queryVariants = normalizeModelName(modelName);
  
  // 遍历所有供应商查找匹配的模型
  for (const vendorId in devData) {
    const vendor = devData[vendorId];
    if (!vendor.models) continue;
    
    // 尝试所有变体的精确匹配
    for (const variant of queryVariants) {
      if (vendor.models[variant]) {
        return vendor.models[variant];
      }
    }
  }
  
  // 模糊匹配：查找包含该名称的模型（仅用于核心部分）
  const lowerName = modelName.toLowerCase();
  // 提取核心模型名（去掉版本号等）
  const coreName = lowerName
    .replace(/^pro\//, '')
    .replace(/-\d{4}-\d{2}-\d{2}$/, '')
    .replace(/-preview$/, '')
    .replace(/-latest$/, '')
    .replace(/@\d+$/, '')
    .split('/').pop() || lowerName;
  
  // 如果核心名称太短，不进行模糊匹配
  if (coreName.length < 4) {
    return null;
  }
  
  for (const vendorId in devData) {
    const vendor = devData[vendorId];
    if (!vendor.models) continue;
    
    const modelKeys = Object.keys(vendor.models);
    for (const key of modelKeys) {
      const normalizedKey = key.toLowerCase();
      // 双向包含匹配
      if (normalizedKey.includes(coreName) || coreName.includes(normalizedKey)) {
        // 确保不是误匹配（例如 "gpt-4" 不应该匹配 "gpt-4o"）
        if (normalizedKey.length >= 4 && coreName.length >= 4) {
          return vendor.models[key];
        }
      }
    }
  }
  
  return null;
};

// 从 models.dev 数据中获取特性 tags
export const getFeatureTagsFromDevData = (modelName, modelsDevData) => {
  if (!modelsDevData || !modelName) return [];
  
  const modelData = findModelInDevData(modelName, modelsDevData);
  if (!modelData) return [];
  
  // 从模型数据中提取 tags（如果有的话）
  if (modelData.tags && Array.isArray(modelData.tags)) {
    return modelData.tags;
  } else if (modelData.tags && typeof modelData.tags === 'string') {
    return modelData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
  } else {
    // 从其他字段生成 tags（只显示特性）
    const generatedTags = [];
    if (modelData.reasoning) {
      generatedTags.push('reasoning');
    }
    if (modelData.tool_call) {
      generatedTags.push('tool-call');
    }
    if (modelData.structured_output) {
      generatedTags.push('structured-output');
    }
    if (modelData.attachment) {
      generatedTags.push('attachment');
    }
    if (modelData.modalities) {
      if (modelData.modalities.input) {
        generatedTags.push(...modelData.modalities.input.map(m => `input-${m}`));
      }
      if (modelData.modalities.output) {
        generatedTags.push(...modelData.modalities.output.map(m => `output-${m}`));
      }
    }
    return generatedTags;
  }
};

// 特性标签翻译映射
export const getTagTranslation = (tag, locale = 'zh') => {
  const translations = {
    zh: {
      'reasoning': '推理',
      'tool-call': '工具调用',
      'structured-output': '结构化输出',
      'attachment': '附件',
      'input-text': '文本输入',
      'input-image': '图像输入',
      'input-audio': '音频输入',
      'input-video': '视频输入',
      'input-pdf': 'PDF输入',
      'output-text': '文本输出',
      'output-image': '图像输出',
      'output-audio': '音频输出',
    },
    en: {
      'reasoning': 'Reasoning',
      'tool-call': 'Tool Call',
      'structured-output': 'Structured Output',
      'attachment': 'Attachment',
      'input-text': 'Text Input',
      'input-image': 'Image Input',
      'input-audio': 'Audio Input',
      'input-video': 'Video Input',
      'input-pdf': 'PDF Input',
      'output-text': 'Text Output',
      'output-image': 'Image Output',
      'output-audio': 'Audio Output',
    },
  };
  const t = translations[locale] || translations.en;
  return t[tag] || tag;
};

// 反向翻译：从中文/英文标签获取原始 tag key
export const getTagKeyFromTranslation = (translatedTag) => {
  const reverseMap = {
    // 中文
    '推理': 'reasoning',
    '工具调用': 'tool-call',
    '结构化输出': 'structured-output',
    '附件': 'attachment',
    '文本输入': 'input-text',
    '图像输入': 'input-image',
    '音频输入': 'input-audio',
    '视频输入': 'input-video',
    'PDF输入': 'input-pdf',
    '文本输出': 'output-text',
    '图像输出': 'output-image',
    '音频输出': 'output-audio',
    // 英文
    'Reasoning': 'reasoning',
    'Tool Call': 'tool-call',
    'Structured Output': 'structured-output',
    'Attachment': 'attachment',
    'Text Input': 'input-text',
    'Image Input': 'input-image',
    'Audio Input': 'input-audio',
    'Video Input': 'input-video',
    'PDF Input': 'input-pdf',
    'Text Output': 'output-text',
    'Image Output': 'output-image',
    'Audio Output': 'output-audio',
  };
  return reverseMap[translatedTag] || translatedTag;
};
