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

// 辅助函数：在 models.dev 数据中查找匹配的模型
export const findModelInDevData = (modelName, devData) => {
  if (!devData || !modelName) return null;
  
  // 尝试多种匹配方式
  const matchVariants = [
    modelName, // 原始名称
    modelName.toLowerCase(), // 小写
    modelName.replace(/^Pro\//, ''), // 去除 Pro/ 前缀
    modelName.replace(/^Pro\//, '').toLowerCase(), // 去除前缀并小写
  ];
  
  // 遍历所有供应商查找匹配的模型
  for (const vendorId in devData) {
    const vendor = devData[vendorId];
    if (!vendor.models) continue;
    
    // 尝试各种匹配方式
    for (const variant of matchVariants) {
      if (vendor.models[variant]) {
        return vendor.models[variant];
      }
    }
    
    // 如果直接匹配失败，尝试模糊匹配（忽略大小写）
    const modelKeys = Object.keys(vendor.models);
    for (const key of modelKeys) {
      if (key.toLowerCase() === modelName.toLowerCase() || 
          key.toLowerCase() === modelName.replace(/^Pro\//, '').toLowerCase()) {
        return vendor.models[key];
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
