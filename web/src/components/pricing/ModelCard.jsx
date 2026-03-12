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

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Toast } from '@douyinfe/semi-ui';
import ProviderIcon from './ProviderIcon';
import { calculateModelPrice } from '../../helpers';
import { getTagTranslation } from './modelTags';

// 为不同的 tag 生成不同的渐变颜色 - 使用更协调的配色方案
const getTagColor = (tag) => {
  // 使用色轮上相邻的协调颜色，从蓝色到紫色到粉色，再到青色和绿色
  const gradients = [
    { bg: 'pricing-tag-blue', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-indigo', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-purple', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-violet', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-fuchsia', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-pink', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-rose', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-sky', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-cyan', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-teal', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-emerald', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-green', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-amber', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-orange', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-slate', text: 'pricing-tag-text-white' },
  ];

  // 使用简单的哈希函数为 tag 分配颜色
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

// 从模型名称提取提供商显示名称
const getProviderDisplayName = (name, vendorName) => {
  // 如果提供了 vendor_name，优先使用
  if (vendorName) {
    return vendorName;
  }

  // 处理 Pro/ 前缀
  const modelName = name.startsWith('Pro/') ? name.substring(4) : name;
  const lowerName = modelName.toLowerCase();

  // Midjourney 模型识别
  if (lowerName.startsWith('mj_') || lowerName.startsWith('mj-')) {
    return 'Midjourney';
  }

  // 处理有 / 分隔符的模型名称
  const parts = modelName.split('/');
  if (parts.length > 1) {
    const provider = parts[0];
    if (provider === 'deepseek-ai') return 'DeepSeek';
    if (provider === 'moonshotai') return 'Kimi';
    if (provider === 'inclusionAI') return '蚂蚁百灵';
    if (provider === 'MiniMaxAI') return 'MiniMax';
    if (provider === 'zai-org') return 'ZAI';
    if (provider === 'stepfun-ai') return 'StepFun';
    if (provider === 'Kwaipilot') return 'Kwaipilot';
    if (provider === 'ByteDance-Seed') return 'ByteDance';
    if (provider === 'tencent') return 'Tencent';
    if (provider === 'THUDM') return 'THUDM';
    if (provider === 'Qwen') return 'Qwen';
    if (provider === 'internlm') return 'InternLM';
    if (provider === 'baidu') return 'Baidu';
    if (provider === 'openai') return 'OpenAI';
    if (provider === 'Anthropic') return 'Anthropic';
    if (provider === 'Google') return 'Google';
    if (provider === 'fal-ai') return 'Fal AI';
    if (provider === 'black-forest-labs') return 'Black Forest Labs';
    if (provider === 'stability-ai') return 'Stability AI';
    if (provider === 'prunaai') return 'Pruna AI';
    return provider;
  }

  // OpenAI 模型识别
  if (
    lowerName.startsWith('gpt-') ||
    lowerName.includes('-gpt-') ||
    lowerName.startsWith('o1-') ||
    lowerName.startsWith('o3-') ||
    lowerName.startsWith('text-embedding') ||
    lowerName.startsWith('whisper') ||
    lowerName.startsWith('tts-') ||
    lowerName.startsWith('tts1-') ||
    lowerName.includes('embedding') ||
    lowerName.includes('whisper') ||
    lowerName.startsWith('sora-') ||
    lowerName.startsWith('dall-e-') ||
    lowerName.startsWith('search-gpts')
  ) {
    return 'OpenAI';
  }

  // Anthropic 模型识别
  if (lowerName.startsWith('claude-')) {
    return 'Anthropic';
  }

  // Google 模型识别
  if (lowerName.startsWith('gemini-')) {
    return 'Google';
  }

  // DeepSeek 模型识别
  if (lowerName.startsWith('deepseek-') || lowerName.includes('deepseek')) {
    return 'DeepSeek';
  }

  // Qwen 模型识别
  if (lowerName.startsWith('qwen') || lowerName.includes('qwen')) {
    return 'Qwen';
  }

  // 字节跳动模型识别
  if (lowerName.startsWith('doubao-') || lowerName.includes('doubao')) {
    return 'ByteDance';
  }

  // Fal AI 模型识别
  if (lowerName.includes('nano-banana') || lowerName.startsWith('fal-ai/')) {
    return 'Fal AI';
  }

  // Microsoft Phi 模型识别
  if (lowerName.startsWith('phi-') || lowerName === 'phi-4' || lowerName === 'phi4' || lowerName.includes('phi-4')) {
    return 'Microsoft';
  }

  // Stability AI 模型识别
  if (lowerName.startsWith('stability-ai/') || lowerName.includes('sdxl') || lowerName.includes('stable-diffusion')) {
    return 'Stability AI';
  }

  // Ideogram 模型识别
  if (lowerName.includes('ideogram')) {
    return 'Ideogram';
  }

  // Runway 模型识别
  if (lowerName.includes('runway') || lowerName.includes('act_one')) {
    return 'Runway';
  }

  // Suno 模型识别
  if (lowerName.includes('suno')) {
    return 'Suno';
  }

  // Google Veo 模型识别
  if (lowerName.includes('veo') || lowerName.startsWith('veo2')) {
    return 'Google';
  }

  // 阿里云模型识别
  if (lowerName.includes('wanx') || lowerName.includes('tongyi')) {
    return 'Alibaba Cloud';
  }

  // Higgsfield 模型识别
  if (lowerName.includes('higgsfield')) {
    return 'Higgsfield';
  }

  // Kolors 模型识别
  if (lowerName.includes('kolors')) {
    return 'Kolors';
  }

  // Creative 模型识别
  if (lowerName === 'creative' || lowerName.includes('creative')) {
    if (lowerName.includes('fal-ai')) return 'Fal AI';
    return 'Ideogram';
  }

  // Docmee 模型识别
  if (lowerName.includes('docmee') || lowerName.includes('ppt') || lowerName.includes('pptx')) {
    return 'Docmee';
  }

  // Direct Generate 模型识别
  if (lowerName.includes('direct-generate') || lowerName.startsWith('direct-')) {
    return 'Docmee';
  }

  // 其他常见模型识别
  if (lowerName.includes('reranker')) {
    if (lowerName.includes('qwen')) return 'Qwen';
    return 'Unknown';
  }

  return 'Unknown';
};

// 从模型名称提取提供商图标名称
const getProviderIconName = (name) => {
  const modelName = name.startsWith('Pro/') ? name.substring(4) : name;

  // 处理没有 / 分隔符的模型名称
  if (
    modelName.startsWith('text-embedding') ||
    modelName.startsWith('whisper') ||
    modelName.startsWith('tts-')
  ) {
    return 'OpenAI';
  }

  const parts = modelName.split('/');
  if (parts.length > 1) {
    const provider = parts[0];
    if (provider === 'deepseek-ai') return 'DeepSeek';
    if (provider === 'moonshotai') return 'Kimi';
    if (provider === 'inclusionAI') return 'Baichuan';
    if (provider === 'Qwen') return 'Qwen';
    if (provider === 'openai') return 'OpenAI';
    if (provider === 'Anthropic') return 'Anthropic';
    if (provider === 'Google') return 'Google';
    if (provider === 'Mistral') return 'Mistral';
    if (provider === 'Zhipu') return 'Zhipu';
    if (provider === 'Spark') return 'Spark';
    if (provider === 'Doubao') return 'Doubao';
    if (provider === 'baidu') return 'Baidu';
    if (provider === 'ByteDance-Seed') return 'ByteDance';
    if (provider === 'THUDM') return 'THUDM';
    if (provider === 'internlm') return 'InternLM';
    if (provider === 'MiniMaxAI') return 'MiniMax';
    if (provider === 'stepfun-ai') return 'StepFun';
    if (provider === 'tencent') return 'Tencent';
    if (provider === 'zai-org') return 'ZAI';
    return provider;
  }

  // 如果没有 / 分隔符，尝试从模型名称推断
  if (modelName.includes('embedding') || modelName.includes('whisper') || modelName.includes('tts')) {
    return 'OpenAI';
  }

  return 'Unknown';
};

// 检查是否为新模型
const isNew = (name) => {
  return (
    name.includes('V3.1') ||
    name.includes('V3.2') ||
    name.includes('K2') ||
    name.includes('M2') ||
    name.includes('Ring-1T') ||
    name.includes('Ling-1T')
  );
};

// 获取版本标签
const getVersionLabel = (name) => {
  const match = name.match(/(\d{4})/);
  if (match) return match[1];
  return null;
};

export default function ModelCard({
  model, // 完整的模型对象（可选）
  name,
  input,
  output,
  freeLabel,
  vendorName,
  vendorIcon,
  icon,
  description,
  tags: apiTags,
  quotaType = 1,
  locale = 'zh',
  selectedGroup = 'all',
  groupRatio = {},
  displayPrice,
  currency = 'USD',
  tokenUnit = 'M',
  savings = null, // 节省金额
  officialPrice = null, // 官方价格（来自 API 的官方价格字段）
}) {
  const [copied, setCopied] = useState(false);
  const parsedTags = model?.list_tags ? model.list_tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const nameToCopy = model?.name || model?.model_name || name || '';
  const handleCopyModelName = async (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!nameToCopy) return;
    try {
      await navigator.clipboard.writeText(nameToCopy);
      setCopied(true);
      Toast.success(locale === 'zh' ? '已复制模型名称' : 'Model name copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      Toast.error(locale === 'zh' ? '复制失败' : 'Copy failed');
    }
  };

  // 翻译 tags
  const translatedTags = parsedTags.map(tag => getTagTranslation(tag, locale));

  // 检查是否为 Pro 模型
  const isPro = name.startsWith('Pro/');
  const providerDisplayName = getProviderDisplayName(name, vendorName);
  const providerIconName = getProviderIconName(name);
  const newModel = isNew(name);
  const versionLabel = getVersionLabel(name);

  // 获取显示名称：如果提供商是 Unknown，显示模型名称
  const displayProviderName = providerDisplayName === 'Unknown'
    ? (name.startsWith('Pro/') ? name.substring(4) : name)
    : providerDisplayName;

  // 使用 calculateModelPrice 计算价格（如果有完整模型对象和 displayPrice）
  let priceData = null;
  if (model && displayPrice) {
    try {
      priceData = calculateModelPrice({
        record: model,
        selectedGroup,
        groupRatio,
        tokenUnit,
        displayPrice,
        currency,
      });
    } catch (e) {
      console.error('Price calculation error:', e);
      priceData = null;
    }
  }

  // 如果没有 priceData，使用传入的 input/output 构建简单的价格显示
  if (!priceData) {
    if (quotaType === 0) {
      priceData = {
        isPerToken: true,
        inputPrice: (input === undefined || input === null || isNaN(input) || input === 0) ? freeLabel : `$${(input || 0).toFixed(2)}`,
        completionPrice: (output === undefined || output === null || isNaN(output) || output === 0) ? freeLabel : `$${(output || 0).toFixed(2)}`,
        unitLabel: tokenUnit === 'K' ? 'K' : 'M',
      };
    } else {
      const price = output || input;
      priceData = {
        isPerToken: false,
        price: (price === undefined || price === null || isNaN(price) || price === 0) ? freeLabel : `$${(price || 0).toFixed(2)}`,
      };
    }
  }

  const formatPrice = (price) => {
    // 检查 undefined 和 null
    if (price === undefined || price === null || isNaN(price)) {
      return freeLabel;
    }
    if (price === 0 || price === '-') return freeLabel;
    if (typeof price === 'string') {
      // 如果已经是格式化字符串，直接返回
      return price;
    }
    return price.toFixed(2);
  };

  const handleCardClick = () => {
    // 如果提供了完整的模型对象，使用它；否则构建一个基本对象
    const modelData = model || {
      name,
      model_name: name,
      input,
      output,
      vendor_name: vendorName,
      vendor_icon: vendorIcon,
      icon,
      description,
      tags: apiTags,
      quota_type: quotaType,
      model_ratio: model?.model_ratio,
      completion_ratio: model?.completion_ratio,
      model_price: model?.model_price,
      enable_groups: model?.enable_groups || [],
      supported_endpoint_types: model?.supported_endpoint_types || [],
    };

    window.dispatchEvent(
      new CustomEvent('openModelDetail', {
        detail: modelData,
      })
    );
  };

  // 分组折扣 tags：按 enable_groups 中每个分组的 groupRatio 计算折扣
  const groupDiscountTags = (() => {
    const enableGroups = model?.enable_groups;
    if (!Array.isArray(enableGroups) || enableGroups.length === 0) return [];
    if (!groupRatio || Object.keys(groupRatio).length === 0) return [];

    const formatDiscount = (ratio) => {
      const raw = ratio * 10;
      const rounded = Math.round(raw * 100) / 100;
      return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(2).replace(/\.?0+$/, '');
    };

    const getTier = (ratio) => {
      if (ratio <= 0.3) return 'best';
      if (ratio <= 0.5) return 'good';
      if (ratio <= 0.7) return 'medium';
      if (ratio <= 0.9) return 'slight';
      return 'minimal';
    };

    // 收集有效分组（ratio < 1 才算折扣）
    const tags = [];
    enableGroups.forEach((g) => {
      const ratio = groupRatio[g];
      if (ratio === undefined || ratio >= 1) return;
      tags.push({ group: g, ratio, discount: formatDiscount(ratio), tier: getTier(ratio) });
    });

    // 按 ratio 升序排列（最优折扣在前）
    tags.sort((a, b) => a.ratio - b.ratio);
    return tags;
  })();

  return (
    <div
      className="pricing-model-card"
      data-model-name={name}
      data-model-input={input}
      data-model-output={output}
      onClick={handleCardClick}
    >
      {/* 顶部一行：模型名 + 复制 | 分组折扣 tags */}
      <div className="pricing-model-card-header">
        <div className="pricing-detail-model-name-wrapper">
          <h3 className="pricing-model-card-provider-name">
            {name}
          </h3>
          <button
            type="button"
            className="pricing-detail-copy-button"
            onClick={handleCopyModelName}
            title={locale === 'zh' ? '复制模型名称' : 'Copy model name'}
          >
            {copied ? (
              <Check className="pricing-detail-copy-icon" size={16} />
            ) : (
              <Copy className="pricing-detail-copy-icon" size={16} />
            )}
          </button>
        </div>
        {groupDiscountTags.length > 0 && (
          <div className="pricing-model-card-official">
            {groupDiscountTags.map(({ group, discount, tier }) => (
              <div key={group} className={`pricing-model-card-official-badge pricing-model-card-official-badge--${tier}`}>
                {group}: {locale === 'zh' ? `${discount}折` : `${discount}0%`}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Provider Logo and Name - 现在显示在模型名称下方，使用次要文字样式（之前模型名称的样式） */}
      <div className="pricing-model-card-provider" style={{ marginBottom: '6px' }}>
        <div className="pricing-model-card-provider-icon">
          <ProviderIcon provider={providerIconName} iconName={icon || vendorIcon} size={22} />
        </div>
        <div className="pricing-model-card-name">
          {displayProviderName}
        </div>
      </div>

      {/* Price */}
      <div className="pricing-model-card-price">
        {priceData && priceData.isPerToken ? (
          <div className="pricing-model-card-price-per-token">
            <div className="pricing-model-card-price-row">
              <span className="pricing-model-card-price-label">
                {locale === 'zh' ? '提示:' : 'Prompt:'}
              </span>
              <span className="pricing-model-card-price-value">
                {priceData.inputPrice || `$${formatPrice(input)}`} / {priceData.unitLabel || 'M'}
              </span>
            </div>
            <div className="pricing-model-card-price-row">
              <span className="pricing-model-card-price-label">
                {locale === 'zh' ? '补全:' : 'Completion:'}
              </span>
              <span className="pricing-model-card-price-value">
                {priceData.completionPrice || priceData.outputPrice || `$${formatPrice(output)}`} / {priceData.unitLabel || 'M'}
              </span>
            </div>
          </div>
        ) : (
          <div className="pricing-model-card-price-per-request">
            <span className="pricing-model-card-price-label">
              {locale === 'zh' ? '价格:' : 'Price:'}
            </span>
            <span className="pricing-model-card-price-value">
              {priceData && priceData.price ? priceData.price : `$${formatPrice(quotaType === 1 ? (output || input) : 0)}`} / {locale === 'zh' ? '次' : 'req'}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="pricing-model-card-description">
        {description || `${displayProviderName} 提供的高性能 AI 模型，支持多种应用场景和任务类型。`}
      </p>

      {/* Tags */}
      {/* {translatedTags.length > 0 && (
        <div className="pricing-model-card-tags">
          {translatedTags.slice(0, 5).map((tag, index) => {
            // 使用原始 tag 来获取颜色（保持颜色一致性）
            const originalTag = parsedTags[index];
            const tagColor = getTagColor(originalTag);
            return (
              <span key={index} className={`pricing-model-tag ${tagColor.bg} ${tagColor.text}`}>
                {tag}
              </span>
            );
          })}
          {translatedTags.length > 5 && (
            <span className="pricing-model-tag pricing-model-tag-more">
              +{translatedTags.length - 5}
            </span>
          )}
        </div>
      )} */}

    </div>
  );
}

