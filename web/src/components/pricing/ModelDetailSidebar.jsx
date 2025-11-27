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

import React, { useState, useEffect, useContext } from 'react';
import { X, BookOpen, Copy, Check } from 'lucide-react';
import ProviderIcon from './ProviderIcon';
import { calculateModelPrice } from '../../helpers/utils';
import { StatusContext } from '../../context/Status';

// 为不同的 tag 生成不同的渐变颜色
const getTagColor = (tag) => {
  const gradients = [
    { bg: 'pricing-tag-blue', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-indigo', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-purple', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-violet', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-cyan', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-teal', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-emerald', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-green', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-amber', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-orange', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-rose', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-pink', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-fuchsia', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-sky', text: 'pricing-tag-text-white' },
    { bg: 'pricing-tag-slate', text: 'pricing-tag-text-white' },
  ];

  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

// 从模型名称提取提供商显示名称
const getProviderDisplayName = (name, vendorName) => {
  if (vendorName) {
    return vendorName;
  }

  const modelName = name.startsWith('Pro/') ? name.substring(4) : name;
  const lowerName = modelName.toLowerCase();

  if (lowerName.startsWith('mj_') || lowerName.startsWith('mj-')) {
    return 'Midjourney';
  }

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

  if (lowerName.startsWith('claude-')) {
    return 'Anthropic';
  }

  if (lowerName.startsWith('gemini-')) {
    return 'Google';
  }

  if (lowerName.startsWith('deepseek-') || lowerName.includes('deepseek')) {
    return 'DeepSeek';
  }

  if (lowerName.startsWith('qwen') || lowerName.includes('qwen')) {
    return 'Qwen';
  }

  if (lowerName.startsWith('doubao-') || lowerName.includes('doubao')) {
    return 'ByteDance';
  }

  if (lowerName.includes('nano-banana') || lowerName.startsWith('fal-ai/')) {
    return 'Fal AI';
  }

  if (lowerName.startsWith('phi-') || lowerName === 'phi-4' || lowerName === 'phi4' || lowerName.includes('phi-4')) {
    return 'Microsoft';
  }

  if (lowerName.startsWith('stability-ai/') || lowerName.includes('sdxl') || lowerName.includes('stable-diffusion')) {
    return 'Stability AI';
  }

  if (lowerName.includes('ideogram')) {
    return 'Ideogram';
  }

  if (lowerName.includes('runway') || lowerName.includes('act_one')) {
    return 'Runway';
  }

  if (lowerName.includes('suno')) {
    return 'Suno';
  }

  if (lowerName.includes('veo') || lowerName.startsWith('veo2')) {
    return 'Google';
  }

  if (lowerName.includes('wanx') || lowerName.includes('tongyi')) {
    return 'Alibaba Cloud';
  }

  if (lowerName.includes('higgsfield')) {
    return 'Higgsfield';
  }

  if (lowerName.includes('kolors')) {
    return 'Kolors';
  }

  if (lowerName === 'creative' || lowerName.includes('creative')) {
    if (lowerName.includes('fal-ai')) return 'Fal AI';
    return 'Ideogram';
  }

  if (lowerName.includes('docmee') || lowerName.includes('ppt') || lowerName.includes('pptx')) {
    return 'Docmee';
  }

  if (lowerName.includes('direct-generate') || lowerName.startsWith('direct-')) {
    return 'Docmee';
  }

  if (lowerName.includes('reranker')) {
    if (lowerName.includes('qwen')) return 'Qwen';
    return 'Unknown';
  }

  return 'Unknown';
};

const getProviderIconName = (name) => {
  const modelName = name.startsWith('Pro/') ? name.substring(4) : name;
  const lowerName = modelName.toLowerCase();

  if (lowerName.startsWith('mj_') || lowerName.startsWith('mj-')) {
    return 'Midjourney';
  }

  const parts = name.split('/');
  if (parts.length > 1) {
    const provider = parts[0];
    if (provider === 'deepseek-ai') return 'DeepSeek';
    if (provider === 'moonshotai') return 'Kimi';
    if (provider === 'inclusionAI') return 'Baichuan';
    if (provider === 'Qwen') return 'Qwen';
    if (provider === 'openai') return 'OpenAI';
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
  if (name.includes('embedding') || name.includes('whisper') || name.includes('tts')) {
    return 'OpenAI';
  }
  return 'Unknown';
};

const getTags = (name, modelTags, quotaType, locale) => {
  const apiTags = [];
  const inferredTags = [];

  // 从模型数据中解析 tags
  if (modelTags) {
    const parsedTags = modelTags
      .split(/[,;|]+/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    apiTags.push(...parsedTags);
  }

  // 根据名称推断标签
  if (name.includes('Instruct') || name.includes('Chat') || name.includes('chat')) {
    if (!inferredTags.includes('对话')) inferredTags.push('对话');
  }
  if (name.includes('VL') || name.includes('vision') || name.includes('image')) {
    if (!inferredTags.includes('多模态')) inferredTags.push('多模态');
  }
  if (name.includes('Coder') || name.includes('code')) {
    if (!inferredTags.includes('代码')) inferredTags.push('代码');
  }
  if (name.includes('Thinking') || name.includes('R1') || name.includes('推理')) {
    if (!inferredTags.includes('推理模型')) inferredTags.push('推理模型');
  }
  if (name.includes('Embedding') || name.includes('embedding')) {
    if (!inferredTags.includes('嵌入')) inferredTags.push('嵌入');
  }
  if (name.includes('TTS') || name.includes('Whisper') || name.includes('speech')) {
    if (!inferredTags.includes('语音')) inferredTags.push('语音');
  }
  if (name.includes('MoE') || name.includes('moe')) {
    if (!inferredTags.includes('MoE')) inferredTags.push('MoE');
  }
  if (name.includes('Prefix')) {
    if (!inferredTags.includes('Prefix')) inferredTags.push('Prefix');
  }
  if (name.includes('Tools') || name.includes('tools')) {
    if (!inferredTags.includes('Tools')) inferredTags.push('Tools');
  }
  if (name.includes('FIM')) {
    if (!inferredTags.includes('FIM')) inferredTags.push('FIM');
  }
  if (name.match(/\d+B/)) {
    const match = name.match(/(\d+)B/);
    if (match && !inferredTags.includes(`${match[1]}B`)) inferredTags.push(`${match[1]}B`);
  }
  if (name.match(/\d+T/)) {
    const match = name.match(/(\d+)T/);
    if (match && !inferredTags.includes(`${match[1]}T`)) inferredTags.push(`${match[1]}T`);
  }
  if (name.match(/\d+K/)) {
    const match = name.match(/(\d+)K/);
    if (match && parseInt(match[1]) >= 100 && !inferredTags.includes(`${match[1]}K`)) {
      inferredTags.push(`${match[1]}K`);
    }
  }

  // 根据 quota_type 确定计费类型标签
  let billingTag = null;
  if (quotaType !== undefined && quotaType === 0) {
    billingTag = {
      label: locale === 'zh' ? '按量付费' : 'Per Token',
      isPerToken: true
    };
  }

  // 如果推断的 tags 为空，添加"通用"标签
  if (inferredTags.length === 0 && apiTags.length === 0) {
    inferredTags.push(locale === 'zh' ? '通用' : 'General');
  }

  return { apiTags, inferredTags, billingTag };
};

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

export default function ModelDetailSidebar({
  freeLabel,
  locale = 'zh',
  selectedGroup = 'all',
  groupRatio = {},
  displayPrice,
  currency = 'USD',
  tokenUnit = 'M',
  endpointMap = {},
  usableGroup = {},
  autoGroups = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [model, setModel] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(73);
  const [copied, setCopied] = useState(false);
  const [statusState] = useContext(StatusContext);

  useEffect(() => {
    const handleOpenDetail = (event) => {
      setModel(event.detail);
      setIsOpen(true);
    };

    window.addEventListener('openModelDetail', handleOpenDetail);

    return () => {
      window.removeEventListener('openModelDetail', handleOpenDetail);
    };
  }, []);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.getElementById('main-header');
      if (header) {
        const rect = header.getBoundingClientRect();
        const height = rect.height;
        setHeaderHeight(height);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    setTimeout(updateHeaderHeight, 100);

    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setModel(null);
    setExpanded(false);
    setCopied(false);
  };

  const handleCopyModelName = async () => {
    if (!model) return;
    const nameToCopy = model.name || model.model_name || '';
    if (!nameToCopy) return;
    try {
      await navigator.clipboard.writeText(nameToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!model || !isOpen) return null;

  // 获取模型名称（支持 model.name 或 model.model_name）
  const modelName = model.name || model.model_name || '';

  // 计算模型属性
  const isPro = modelName.startsWith('Pro/');
  const currentModelName = isPro ? modelName.substring(4) : modelName;

  const providerDisplayName = getProviderDisplayName(currentModelName, model.vendor_name);
  const providerIconName = getProviderIconName(currentModelName);
  const { apiTags, inferredTags, billingTag } = getTags(modelName, model.tags, model.quota_type, locale);

  // 获取显示名称：如果提供商是 Unknown，显示模型名称
  const displayProviderName = providerDisplayName === 'Unknown'
    ? currentModelName
    : providerDisplayName;

  const formatPrice = (price) => {
    // 检查 undefined 和 null
    if (price === undefined || price === null || isNaN(price)) {
      return freeLabel;
    }
    if (price === 0) return freeLabel;
    return price.toFixed(2);
  };

  const allTags = [...apiTags, ...inferredTags];
  const hasTools = allTags.includes('Tools') || allTags.includes('工具调用');
  const hasPrefix = allTags.includes('Prefix') || allTags.includes('前缀续写');

  const translations = {
    zh: {
      modelInfo: '模型信息',
      input: '输入',
      output: '输出',
      context: '上下文',
      capabilities: '支持能力',
      toolCalling: '工具调用',
      prefixCompletion: '前缀续写',
      rateLimits: 'Rate Limits',
      currentLevel: '您当前的用量级别为 L0;',
      modelUsage: '使用本模型时 RPM 为 1,000; TPM 为 100,000;',
      usageLevel: '用量级别',
      expand: '展开',
      collapse: '收起',
      onlineExperience: '在线体验',
      apiDocs: 'API 文档',
      recharge: '充值余额',
      gift: '赠送余额',
    },
    en: {
      modelInfo: 'Model Information',
      input: 'Input',
      output: 'Output',
      context: 'Context',
      capabilities: 'Supported Capabilities',
      toolCalling: 'Tool Calling',
      prefixCompletion: 'Prefix Completion',
      rateLimits: 'Rate Limits',
      currentLevel: 'Your current usage level is L0;',
      modelUsage: 'When using this model, RPM is 1,000; TPM is 100,000;',
      usageLevel: 'Usage Level',
      expand: 'Expand',
      collapse: 'Collapse',
      onlineExperience: 'Online Experience',
      apiDocs: 'API Documentation',
      recharge: 'Recharge Balance',
      gift: 'Gift Balance',
    },
  };

  const t = translations[locale] || translations.zh;

  const description = model.description || `${displayProviderName} 提供的高性能 AI 模型，支持多种应用场景和任务类型。`;

  // 计算价格（如果有完整模型对象）
  let priceData = null;
  if (model && displayPrice) {
    try {
      // 使用完整的模型对象进行计算
      const modelRecord = {
        model_name: model.name || model.model_name,
        quota_type: model.quota_type,
        model_ratio: model.model_ratio || (model.input ? model.input / 2 : 0),
        completion_ratio: model.completion_ratio || (model.input && model.output ? model.output / model.input : 1),
        model_price: model.model_price || (model.quota_type === 1 ? (model.output || model.input || 0) : 0),
        enable_groups: model.enable_groups || [],
      };
      priceData = calculateModelPrice({
        record: modelRecord,
        selectedGroup,
        groupRatio,
        tokenUnit,
        displayPrice,
        currency,
        precision: 4,
      });
    } catch (e) {
      console.error('Price calculation error:', e);
    }
  }

  // 渲染API端点
  const renderAPIEndpoints = () => {
    if (!model || !endpointMap) return null;
    const types = model.supported_endpoint_types || [];
    if (types.length === 0) return null;

    return types.map((type) => {
      const info = endpointMap[type] || {};
      let path = info.path || '';
      if (path.includes('{model}')) {
        const nameForPath = model.name || model.model_name || '';
        path = path.replaceAll('{model}', nameForPath);
      }
      const method = info.method || 'POST';
      return (
        <div key={type} className="pricing-detail-endpoint-item">
          <span className="pricing-detail-endpoint-type">
            <span className="pricing-detail-endpoint-dot"></span>
            {type}
            {path && '：'}
            {path && <span className="pricing-detail-endpoint-path">{path}</span>}
          </span>
          {path && <span className="pricing-detail-endpoint-method">{method}</span>}
        </div>
      );
    });
  };

  // 渲染分组价格表格
  const renderGroupPriceTable = () => {
    if (!model || !usableGroup || !groupRatio) return null;

    const modelEnableGroups = Array.isArray(model.enable_groups) ? model.enable_groups : [];
    const availableGroups = Object.keys(usableGroup || {})
      .filter((g) => g !== '' && g !== 'auto' && g !== 'default')
      .filter((g) => modelEnableGroups.includes(g));

    if (availableGroups.length === 0) return null;

    const tableData = availableGroups.map((group) => {
      const priceData = calculateModelPrice({
        record: {
          model_name: model.name || model.model_name,
          quota_type: model.quota_type,
          model_ratio: model.model_ratio || (model.input ? model.input / 2 : 0),
          completion_ratio: model.completion_ratio || (model.input && model.output ? model.output / model.input : 1),
          model_price: model.model_price || (model.quota_type === 1 ? (model.output || model.input || 0) : 0),
          enable_groups: modelEnableGroups,
        },
        selectedGroup: group,
        groupRatio,
        tokenUnit,
        displayPrice,
        currency,
        precision: 4,
      });

      const groupRatioValue = groupRatio && groupRatio[group] ? groupRatio[group] : 1;

      return {
        key: group,
        group,
        ratio: groupRatioValue,
        billingType: model.quota_type === 0 ? (locale === 'zh' ? '按量计费' : 'Per Token') : (locale === 'zh' ? '按次计费' : 'Per Request'),
        inputPrice: model.quota_type === 0 ? priceData.inputPrice : '-',
        outputPrice: model.quota_type === 0 ? (priceData.completionPrice || priceData.outputPrice) : '-',
        fixedPrice: model.quota_type === 1 ? priceData.price : '-',
      };
    });

    return (
      <div className="pricing-detail-group-pricing">
        <div className="pricing-detail-group-table">
          <table className="pricing-detail-group-table-inner">
            <thead>
              <tr>
                <th>{locale === 'zh' ? '分组' : 'Group'}</th>
                <th>{locale === 'zh' ? '计费类型' : 'Billing Type'}</th>
                {model.quota_type === 0 ? (
                  <>
                    <th>{locale === 'zh' ? '提示' : 'Input'}</th>
                    <th>{locale === 'zh' ? '补全' : 'Output'}</th>
                  </>
                ) : (
                  <th>{locale === 'zh' ? '价格' : 'Price'}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.key}>
                  <td>
                    <span className="pricing-detail-group-tag">{row.group}{locale === 'zh' ? '分组' : 'Group'}</span>
                  </td>
                  <td>
                    <span className={`pricing-detail-billing-tag ${row.billingType.includes('按量') || row.billingType.includes('Token') ? 'pricing-detail-billing-tag-per-token' : 'pricing-detail-billing-tag-per-request'}`}>
                      {row.billingType}
                    </span>
                  </td>
                  {model.quota_type === 0 ? (
                    <>
                      <td>
                        <div className="pricing-detail-group-price-value">{row.inputPrice}</div>
                        <div className="pricing-detail-group-price-unit">/ {tokenUnit === 'K' ? '1K' : '1M'} tokens</div>
                      </td>
                      <td>
                        <div className="pricing-detail-group-price-value">{row.outputPrice}</div>
                        <div className="pricing-detail-group-price-unit">/ {tokenUnit === 'K' ? '1K' : '1M'} tokens</div>
                      </td>
                    </>
                  ) : (
                    <td>
                      <div className="pricing-detail-group-price-value">{row.fixedPrice}</div>
                      <div className="pricing-detail-group-price-unit">/ {locale === 'zh' ? '次' : 'request'}</div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 获取文档 URL（从 StatusContext 获取）
  const getDocUrl = () => {
    return statusState?.status?.docs_link || 'https://docs.quantumnous.com';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`pricing-detail-backdrop ${isOpen ? 'pricing-detail-backdrop-open' : ''}`}
        style={{ height: '100dvh' }}
        onClick={handleClose}
      />

      {/* Sidebar */}
      <div
        className={`pricing-detail-sidebar ${isOpen ? 'pricing-detail-sidebar-open' : ''}`}
        style={{ height: '100dvh', maxHeight: '100dvh' }}
      >
        <div className="pricing-detail-content" style={{ paddingTop: `${headerHeight + 16}px` }}>
          {/* Header */}
          <div className="pricing-detail-header">
            <div className="pricing-detail-header-main">
              <div className="pricing-detail-header-icon">
                <ProviderIcon provider={providerIconName} iconName={model.icon || model.vendor_icon} size={56} />
              </div>
              <div className="pricing-detail-header-info">
                <div className="pricing-detail-provider-name">
                  {displayProviderName}
                </div>
                <div className="pricing-detail-model-name-wrapper">
                  <h2 className="pricing-detail-model-name">
                    {modelName}
                  </h2>
                  <button
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
                <div className="pricing-detail-badges">
                  {isPro && (
                    <span className="pricing-detail-badge pricing-detail-badge-pro">
                      Pro
                    </span>
                  )}
                  {isNew(modelName) && (
                    <span className="pricing-detail-badge pricing-detail-badge-new">
                      New
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="pricing-detail-close">
              <button
                className="pricing-detail-close-button"
                onClick={handleClose}
              >
                <X className="pricing-detail-close-icon" />
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="pricing-detail-description">
            <p className="pricing-detail-description-text">
              {expanded ? description : description.slice(0, 150)}
              {description.length > 150 && (
                <>
                  {!expanded && '...'}
                  <button
                    className="pricing-detail-expand-button"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? t.collapse : t.expand}
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="pricing-detail-tags">
              {allTags.map((tag, index) => {
                const tagColor = getTagColor(tag);
                return (
                  <span key={index} className={`pricing-model-tag ${tagColor.bg} ${tagColor.text}`}>
                    {tag}
                  </span>
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pricing-detail-actions">
            <a
              href={getDocUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="pricing-detail-action-button"
            >
              <BookOpen className="pricing-detail-action-icon" />
              {t.apiDocs}
            </a>
          </div>

          {/* Model Information */}
          <div className="pricing-detail-info">
            <h3 className="pricing-detail-info-title">
              {t.modelInfo}
            </h3>

            <div className="pricing-detail-info-content">
              {/* Capabilities */}
              {(hasTools || hasPrefix) && (
                <div className="pricing-detail-capabilities">
                  <div className="pricing-detail-capabilities-header">
                    <span className="pricing-detail-capabilities-label">
                      {t.capabilities}
                    </span>
                  </div>
                  <div className="pricing-detail-capabilities-list">
                    {hasTools && (
                      <div className="pricing-detail-capability-item">
                        <span className="pricing-detail-capability-icon">🔧</span>
                        <span>{t.toolCalling}</span>
                      </div>
                    )}
                    {hasPrefix && (
                      <div className="pricing-detail-capability-item">
                        <span className="pricing-detail-capability-icon">✏️</span>
                        <span>{t.prefixCompletion}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* API Endpoints */}
          {renderAPIEndpoints() && (
            <div className="pricing-detail-endpoints">
              <div className="pricing-detail-endpoints-header">
                <div>
                  <h3 className="pricing-detail-endpoints-title">
                    {locale === 'zh' ? 'API端点' : 'API Endpoints'}
                  </h3>
                  <p className="pricing-detail-endpoints-subtitle">
                    {locale === 'zh' ? '模型支持的接口端点信息' : 'Supported API endpoints'}
                  </p>
                </div>
              </div>
              <div className="pricing-detail-endpoints-list">
                {renderAPIEndpoints()}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="pricing-detail-price">
            <div className="pricing-detail-price-container">
              <div className="pricing-detail-price-list">
                <div className="pricing-detail-price-item">
                  <span className="pricing-detail-price-label">
                    {t.input}
                  </span>
                  <span className="pricing-detail-price-value">
                    {priceData && priceData.isPerToken
                      ? (
                        <>
                          <span className="pricing-detail-price-number">{priceData.inputPrice}</span>
                          <span className="pricing-detail-price-unit"> / {priceData.unitLabel || 'M'} Tokens</span>
                        </>
                      )
                      : (
                        <>
                          <span className="pricing-detail-price-number">${formatPrice(model.input)}</span>
                          <span className="pricing-detail-price-unit"> / M Tokens</span>
                        </>
                      )}
                  </span>
                </div>
                <div className="pricing-detail-price-item">
                  <span className="pricing-detail-price-label">
                    {t.output}
                  </span>
                  <span className="pricing-detail-price-value">
                    {priceData && priceData.isPerToken
                      ? (
                        <>
                          <span className="pricing-detail-price-number">{priceData.completionPrice || priceData.outputPrice}</span>
                          <span className="pricing-detail-price-unit"> / {priceData.unitLabel || 'M'} Tokens</span>
                        </>
                      )
                      : (
                        <>
                          <span className="pricing-detail-price-number">${formatPrice(model.output)}</span>
                          <span className="pricing-detail-price-unit"> / M Tokens</span>
                        </>
                      )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Group Pricing */}
          {renderGroupPriceTable() && (
            <div className="pricing-detail-group-pricing-section">
              <div className="pricing-detail-group-pricing-header">
                <div>
                  <h3 className="pricing-detail-group-pricing-title">
                    {locale === 'zh' ? '分组价格' : 'Group Pricing'}
                  </h3>
                  <p className="pricing-detail-group-pricing-subtitle">
                    {locale === 'zh' ? '不同用户分组的价格信息' : 'Pricing for different user groups'}
                  </p>
                </div>
              </div>
              {renderGroupPriceTable()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

