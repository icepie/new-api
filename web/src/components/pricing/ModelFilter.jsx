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

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import ProviderIcon from './ProviderIcon';
import { getTagTranslation } from './modelTags';

export default function ModelFilter({
  locale = 'zh',
  onFilterChange,
  allModels = [],
}) {
  const [isOpen, setIsOpen] = useState(() => {
    // 移动端默认隐藏，PC端默认显示
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return false; // SSR时默认隐藏
  });
  const [expandedSections, setExpandedSections] = useState({
    type: true,
    tags: true,
    providers: true,
  });
  const [filters, setFilters] = useState({
    types: [],
    tags: [],
    providers: [],
    context: [],
    specs: [],
    releaseDate: [],
    searchQuery: '',
  });

  // 计算已选择的筛选数量
  const getActiveFilterCount = () => {
    return (
      filters.types.length +
      filters.tags.length +
      filters.providers.length +
      (filters.searchQuery ? 1 : 0)
    );
  };

  const activeFilterCount = getActiveFilterCount();

  // 清除所有筛选
  const clearAllFilters = () => {
    const emptyFilters = {
      types: [],
      tags: [],
      providers: [],
      context: [],
      specs: [],
      releaseDate: [],
      searchQuery: '',
    };
    setFilters(emptyFilters);
    onFilterChange?.(emptyFilters);
    window.dispatchEvent(
      new CustomEvent('filterChange', { detail: emptyFilters })
    );
  };

  // 从所有模型中提取唯一的提供商列表
  // 使用 useMemo 缓存结果，避免在渲染时重复计算
  const { providers, providerIcons, hasUnknownProvider } = useMemo(() => {
    const providersSet = new Set();
    const providerIconsMap = new Map();
    let hasUnknownProviderFlag = false;

    allModels.forEach((model) => {
      // 优先使用 API 返回的 vendor_name
      if (model.vendor_name) {
        providersSet.add(model.vendor_name);
        // 保存供应商图标
        if (model.vendor_icon && !providerIconsMap.has(model.vendor_name)) {
          providerIconsMap.set(model.vendor_name, model.vendor_icon);
        }
      } else {
        // 如果没有 vendor_name，检查是否有未知供应商
        hasUnknownProviderFlag = true;
      }
    });

    // 转换为数组并排序
    const sortedProviders = Array.from(providersSet).sort();

    return {
      providers: sortedProviders,
      providerIcons: providerIconsMap,
      hasUnknownProvider: hasUnknownProviderFlag,
    };
  }, [allModels]);

  // 从所有模型中收集唯一的特性 tags（来自 API 的 list_tags，不自动推断）
  const allTags = useMemo(() => {
    const tagSet = new Set();
    allModels.forEach((model) => {
      const tagsStr = model.list_tags;
      if (tagsStr) {
        tagsStr.split(',').map((t) => t.trim()).filter(Boolean).forEach((tag) => tagSet.add(tag));
      }
    });
    const translatedTags = Array.from(tagSet)
      .map(tag => ({ key: tag, label: getTagTranslation(tag, locale) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return translatedTags;
  }, [allModels, locale]);

  const translations = {
    zh: {
      hideFilters: '隐藏筛选器',
      showFilters: '显示筛选器',
      searchPlaceholder: '请输入模型名称',
      type: '类型',
      tags: '标签',
      providers: '系列/厂商',
      context: '上下文',
      specs: '规格',
      releaseDate: '发布日期',
      more: '更多',
      dialogue: '对话',
      imageGen: '生图',
      video: '视频',
      voice: '语音',
      embedding: '嵌入',
      reranking: '重排序',
      vision: '视觉',
      moe: 'MoE',
      reasoning: '推理',
      tools: 'Tools',
      fim: 'FIM',
      math: 'Math',
      coder: 'Coder',
      context8k: '≥ 8K',
      context16k: '≥ 16K',
      context32k: '≥ 32K',
      context128k: '≥ 128K',
      specBelow10b: '10B 以下',
      spec10to50b: '10 ~ 50B',
      spec50to100b: '50 ~ 100B',
      specAbove100b: '100B 以上',
      last30Days: '近30天',
      last90Days: '近90天',
    },
    en: {
      hideFilters: 'Hide Filters',
      showFilters: 'Show Filters',
      searchPlaceholder: 'Enter model name',
      type: 'Type',
      tags: 'Tags',
      providers: 'Series/Provider',
      context: 'Context',
      specs: 'Specifications',
      releaseDate: 'Release Date',
      more: 'More',
      dialogue: 'Dialogue',
      imageGen: 'Image Gen',
      video: 'Video',
      voice: 'Voice',
      embedding: 'Embedding',
      reranking: 'Reranking',
      vision: 'Vision',
      moe: 'MoE',
      reasoning: 'Reasoning',
      tools: 'Tools',
      fim: 'FIM',
      math: 'Math',
      coder: 'Coder',
      context8k: '≥ 8K',
      context16k: '≥ 16K',
      context32k: '≥ 32K',
      context128k: '≥ 128K',
      specBelow10b: 'Below 10B',
      spec10to50b: '10 ~ 50B',
      spec50to100b: '50 ~ 100B',
      specAbove100b: 'Above 100B',
      last30Days: 'Last 30 days',
      last90Days: 'Last 90 days',
    },
  };

  const t = translations[locale] || translations.zh;

  const toggleFilter = (category, value) => {
    setFilters((prev) => {
      const current = prev[category] || [];

      // 对于厂商筛选，实现互斥逻辑
      if (category === 'providers') {
        const isSpecialOption = value === 'all' || value === 'unknown';
        const isCurrentlySelected = current.includes(value);

        if (isSpecialOption) {
          // 如果选择的是"全部"或"未知"
          if (isCurrentlySelected) {
            // 取消选择：清除该选项
            const newValue = current.filter((v) => v !== value);
            const newFilters = { ...prev, [category]: newValue };
            onFilterChange?.(newFilters);
            window.dispatchEvent(
              new CustomEvent('filterChange', { detail: newFilters })
            );
            return newFilters;
          } else {
            // 选择：只保留当前选项，清除其他所有选项
            const newFilters = { ...prev, [category]: [value] };
            onFilterChange?.(newFilters);
            window.dispatchEvent(
              new CustomEvent('filterChange', { detail: newFilters })
            );
            return newFilters;
          }
        } else {
          // 如果选择的是普通厂商
          if (isCurrentlySelected) {
            // 取消选择：移除该选项
            const newValue = current.filter((v) => v !== value);
            const newFilters = { ...prev, [category]: newValue };
            onFilterChange?.(newFilters);
            window.dispatchEvent(
              new CustomEvent('filterChange', { detail: newFilters })
            );
            return newFilters;
          } else {
            // 选择：先清除"全部"和"未知"，然后添加当前选项
            const newValue = current
              .filter((v) => v !== 'all' && v !== 'unknown')
              .concat(value);
            const newFilters = { ...prev, [category]: newValue };
            onFilterChange?.(newFilters);
            window.dispatchEvent(
              new CustomEvent('filterChange', { detail: newFilters })
            );
            return newFilters;
          }
        }
      }

      // 其他类别的筛选保持原有逻辑
      const newValue = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const newFilters = { ...prev, [category]: newValue };
      onFilterChange?.(newFilters);
      // 触发自定义事件
      window.dispatchEvent(
        new CustomEvent('filterChange', { detail: newFilters })
      );
      return newFilters;
    });
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 映射提供商显示名称到ProviderIcon能识别的名称
  const getProviderIconName = (provider) => {
    const iconMap = {
      'DeepSeek': 'DeepSeek',
      'Kimi': 'Kimi',
      '蚂蚁百灵': '蚂蚁百灵',
      'MiniMax': 'MiniMax',
      '智谱': 'Zhipu',
      '阶跃星辰': 'StepFun',
      'Qwen': 'Qwen',
      'OpenAI': 'OpenAI',
      'Anthropic': 'Anthropic',
      'Google': 'Google',
      'Baidu': 'Baidu',
      'Tencent': 'Tencent',
      'THUDM': 'THUDM',
      'InternLM': 'InternLM',
      'ByteDance': 'ByteDance',
      'Kwaipilot': 'Kwaipilot',
    };
    return iconMap[provider] || provider;
  };

  const FilterButtonGroup = ({
    title,
    options,
    category,
    sectionKey,
    showIcons = false,
    twoColumns = false,
    singleColumn = false,
  }) => {
    const isExpanded = expandedSections[sectionKey] ?? true;

    return (
      <div className="pricing-filter-section">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="pricing-filter-section-header"
        >
          <h3 className="pricing-filter-section-title">
            {title}
          </h3>
          {isExpanded ? (
            <ChevronUp className="pricing-filter-section-icon" />
          ) : (
            <ChevronDown className="pricing-filter-section-icon" />
          )}
        </button>
        {isExpanded && (
          <div className={`pricing-filter-options ${twoColumns ? 'pricing-filter-options-two-columns' : ''} ${singleColumn ? 'pricing-filter-options-single-column' : ''}`}>
            {options.map((option) => {
              const isSelected = (filters[category] || []).includes(option.value);
              const isSpecialOption = option.value === 'all' || option.value === 'unknown';
              const isTagsCategory = category === 'tags';
              const isProvidersCategory = category === 'providers';
              const shouldCenter = isSpecialOption || isTagsCategory || isProvidersCategory;
              return (
                <button
                  key={option.value}
                  onClick={() => toggleFilter(category, option.value)}
                  className={`pricing-filter-option ${singleColumn ? 'pricing-filter-option-full-width' : ''} ${isSelected ? 'pricing-filter-option-selected' : ''} ${shouldCenter ? 'pricing-filter-option-centered' : ''}`}
                >
                  {showIcons && !isSpecialOption && !isTagsCategory && (
                    <span className="pricing-filter-option-icon">
                      <ProviderIcon
                        provider={getProviderIconName(option.label)}
                        iconName={option.icon}
                        size={14}
                        className="pricing-filter-provider-icon"
                      />
                    </span>
                  )}
                  <span className={showIcons ? 'pricing-filter-option-text-with-icon' : 'pricing-filter-option-text'}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 暴露 isOpen 和 setIsOpen 给父组件
  useEffect(() => {
    const state = { isOpen, setIsOpen };
    window.dispatchEvent(
      new CustomEvent('filterToggleState', {
        detail: state
      })
    );

    // 监听显示过滤器的请求
    const handleShowFilters = () => {
      setIsOpen(true);
    };

    window.addEventListener('showFilters', handleShowFilters);
    
    // 在移动端，防止滚动时自动关闭筛选器
    // 只在用户明确点击关闭按钮时才关闭
    const handleTouchStart = (e) => {
      // 如果触摸事件发生在筛选器外部，不处理（让用户正常滚动页面）
      // 只有在筛选器内部时才阻止默认行为
      const filterContainer = e.target.closest('.pricing-filter-container');
      if (filterContainer && isOpen) {
        // 允许筛选器内部的滚动
        e.stopPropagation();
      }
    };

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
    }

    return () => {
      window.removeEventListener('showFilters', handleShowFilters);
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        document.removeEventListener('touchstart', handleTouchStart);
      }
    };
  }, [isOpen]);

  return (
    <>
      {/* Filter Sidebar */}
      {isOpen && (
        <aside className="pricing-filter-sidebar">
          <div className="pricing-filter-container">
            {/* Header with Toggle */}
            <div className="pricing-filter-header">
              <div className="pricing-filter-header-top">
                <div className="pricing-filter-header-content">
                  <h2 className="pricing-filter-title">
                    <Filter className="pricing-filter-title-icon" />
                    {locale === 'zh' ? '筛选器' : 'Filters'}
                  </h2>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="pricing-filter-clear-button"
                    >
                      {locale === 'zh' ? '清除全部' : 'Clear all'}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="pricing-filter-close-button"
                  title={t.hideFilters}
                >
                  <X className="pricing-filter-close-icon" />
                </button>
              </div>
            </div>

            {/* Type - Button Group */}
            <FilterButtonGroup
              title={t.type}
              category="types"
              sectionKey="type"
              options={[
                { value: 'dialogue', label: t.dialogue },
                { value: 'imageGen', label: t.imageGen },
                { value: 'video', label: t.video },
                { value: 'voice', label: t.voice },
                { value: 'embedding', label: t.embedding },
                { value: 'reranking', label: t.reranking },
              ]}
            />

            {/* Tags - Button Group */}
            {allTags.length > 0 && (
              <FilterButtonGroup
                title={t.tags}
                category="tags"
                sectionKey="tags"
                twoColumns={true}
                options={allTags.map(tag => ({
                  value: tag.label, // 使用翻译后的 label 作为 value
                  label: tag.label,
                }))}
              />
            )}

            {/* Providers - Button Group with Icons (Single Column) */}
            <FilterButtonGroup
              title={t.providers}
              category="providers"
              sectionKey="providers"
              showIcons={true}
              singleColumn={true}
              options={[
                // 添加"全部"选项
                { value: 'all', label: locale === 'zh' ? '全部供应商' : 'All Vendors' },
                // 添加所有已知供应商
                ...providers.map((provider) => ({
                  value: provider,
                  label: provider,
                  icon: providerIcons.get(provider), // 传递图标名称
                })),
                // 如果有未知供应商，添加"未知"选项
                ...(hasUnknownProvider
                  ? [{ value: 'unknown', label: locale === 'zh' ? '未知供应商' : 'Unknown Vendors' }]
                  : []),
              ]}
            />
          </div>
        </aside>
      )}
    </>
  );
}

