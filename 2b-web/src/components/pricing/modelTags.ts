// 标准化模型名称（生成多种可能的匹配 key）
const normalizeModelName = (name: string): string[] => {
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
    if (afterSlash) {
      variants.push(afterSlash);
      const afterSlashClean = afterSlash.replace(/-instruct$/, '').replace(/-chat$/, '');
      if (afterSlashClean !== afterSlash) variants.push(afterSlashClean);
    }
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

  return [...new Set(variants)];
};

// 辅助函数：在 models.dev 数据中查找匹配的模型
export const findModelInDevData = (modelName: string, devData: any): any => {
  if (!devData || !modelName) return null;

  const queryVariants = normalizeModelName(modelName);

  for (const vendorId in devData) {
    const vendor = devData[vendorId];
    if (!vendor.models) continue;

    for (const variant of queryVariants) {
      if (vendor.models[variant]) {
        return vendor.models[variant];
      }
    }
  }

  return null;
};

// 从 models.dev 数据中获取特性 tags
export const getFeatureTagsFromDevData = (modelName: string, modelsDevData: any): string[] => {
  if (!modelsDevData || !modelName) return [];

  const modelData = findModelInDevData(modelName, modelsDevData);
  if (!modelData) return [];

  if (modelData.tags && Array.isArray(modelData.tags)) {
    return modelData.tags;
  } else if (modelData.tags && typeof modelData.tags === 'string') {
    return modelData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '');
  } else {
    // 从其他字段生成 tags（只显示特性）
    const generatedTags: string[] = [];
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
        generatedTags.push(...modelData.modalities.input.map((m: string) => `input-${m}`));
      }
      if (modelData.modalities.output) {
        generatedTags.push(...modelData.modalities.output.map((m: string) => `output-${m}`));
      }
    }
    return generatedTags;
  }
};

// 特性标签翻译映射
export const getTagTranslation = (tag: string, locale: string = 'zh'): string => {
  const translations: Record<string, Record<string, string>> = {
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
  };
  const t = translations[locale] || translations.zh;
  return t[tag] || tag;
};

// 反向翻译：从中文/英文标签获取原始 tag key
export const getTagKeyFromTranslation = (translatedTag: string): string => {
  const reverseMap: Record<string, string> = {
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
