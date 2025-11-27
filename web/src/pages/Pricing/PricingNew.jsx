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

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { API, showError } from '../../helpers';
import { StatusContext } from '../../context/Status';
import ModelCard from '../../components/pricing/ModelCard';
import ModelFilter from '../../components/pricing/ModelFilter';
import ModelDetailSidebar from '../../components/pricing/ModelDetailSidebar';
import '../../styles/pricing.css';

// 模型类型推断函数（参考 NiceRouter 的 getModelType）
const getModelType = (name) => {
  const types = [];
  if (
    name.includes('Instruct') ||
    name.includes('Chat') ||
    name.includes('chat') ||
    name.includes('对话') ||
    name.includes('R1') ||
    name.includes('Thinking')
  ) {
    types.push('dialogue');
  }
  if (
    name.includes('image') ||
    name.includes('Image') ||
    name.includes('生图') ||
    name.includes('VL') ||
    name.includes('vision')
  ) {
    types.push('imageGen');
  }
  if (name.includes('video') || name.includes('Video') || name.includes('视频')) {
    types.push('video');
  }
  if (
    name.includes('TTS') ||
    name.includes('Whisper') ||
    name.includes('speech') ||
    name.includes('语音')
  ) {
    types.push('voice');
  }
  if (name.includes('Embedding') || name.includes('embedding') || name.includes('嵌入')) {
    types.push('embedding');
  }
  if (name.includes('rerank') || name.includes('Rerank') || name.includes('重排序')) {
    types.push('reranking');
  }
  return types.length > 0 ? types : ['dialogue'];
};

// 筛选模型函数
const filterModel = (model, filters) => {
  const name = model.model_name || model.name;
  const provider = model.vendor_name || 'Unknown';
  const types = getModelType(name);

  // 必须有描述字段
  if (!model.description || model.description.trim() === '') {
    return false;
  }

  // 搜索筛选
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    if (
      !name.toLowerCase().includes(query) &&
      !provider.toLowerCase().includes(query) &&
      !(model.description && model.description.toLowerCase().includes(query)) &&
      !(model.tags && model.tags.toLowerCase().includes(query))
    ) {
      return false;
    }
  }

  // 类型筛选
  if (filters.types && filters.types.length > 0) {
    const hasMatchingType = filters.types.some((type) => types.includes(type));
    if (!hasMatchingType) return false;
  }

  // 标签筛选
  if (filters.tags && filters.tags.length > 0) {
    if (!model.tags) return false;
    const tagsArr = model.tags
      .toLowerCase()
      .split(/[,;|]+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    const hasMatchingTag = filters.tags.some((tag) =>
      tagsArr.includes(tag.toLowerCase())
    );
    if (!hasMatchingTag) return false;
  }

  // 供应商筛选
  if (filters.providers && filters.providers.length > 0) {
    // 如果选择了 "all"，不筛选
    if (filters.providers.includes('all')) {
      // 继续其他筛选
    } else {
      // 如果选择了 "unknown"，只显示没有供应商的模型
      if (filters.providers.includes('unknown')) {
        if (provider && provider !== 'Unknown') return false;
      } else {
        // 否则只显示匹配的供应商
        if (!filters.providers.includes(provider)) return false;
      }
    }
  }

  return true;
};

export default function PricingNew() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('zh') ? 'zh' : (i18n.language || 'zh');
  const [statusState] = useContext(StatusContext);

  const [models, setModels] = useState([]);
  const [vendorsMap, setVendorsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [groupRatio, setGroupRatio] = useState({});
  const [usableGroup, setUsableGroup] = useState({});
  const [endpointMap, setEndpointMap] = useState({});
  const [autoGroups, setAutoGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState({
    types: [],
    tags: [],
    providers: [],
    context: [],
    specs: [],
    releaseDate: [],
    searchQuery: '',
  });

  // 价格相关配置
  const priceRate = useMemo(
    () => statusState?.status?.price ?? 1,
    [statusState],
  );
  const usdExchangeRate = useMemo(
    () => statusState?.status?.usd_exchange_rate ?? priceRate,
    [statusState, priceRate],
  );
  const customExchangeRate = useMemo(
    () => statusState?.status?.custom_currency_exchange_rate ?? 1,
    [statusState],
  );
  const customCurrencySymbol = useMemo(
    () => statusState?.status?.custom_currency_symbol ?? '¤',
    [statusState],
  );
  const siteDisplayType = useMemo(
    () => statusState?.status?.quota_display_type || 'USD',
    [statusState],
  );
  const [currency, setCurrency] = useState('USD');
  const [tokenUnit, setTokenUnit] = useState('M');

  useEffect(() => {
    if (
      siteDisplayType === 'USD' ||
      siteDisplayType === 'CNY' ||
      siteDisplayType === 'CUSTOM'
    ) {
      setCurrency(siteDisplayType);
    }
  }, [siteDisplayType]);

  // 价格显示函数
  const displayPrice = (usdPrice) => {
    let priceInUSD = usdPrice;
    // 如果需要考虑充值汇率，可以在这里处理
    // priceInUSD = (usdPrice * priceRate) / usdExchangeRate;

    if (currency === 'CNY') {
      return `¥${(priceInUSD * usdExchangeRate).toFixed(3)}`;
    } else if (currency === 'CUSTOM') {
      return `${customCurrencySymbol}${(priceInUSD * customExchangeRate).toFixed(3)}`;
    }
    return `$${priceInUSD.toFixed(3)}`;
  };

  // 处理模型数据格式（参考 useModelPricingData 的 setModelsFormat）
  const setModelsFormat = (modelsData, groupRatioData, vendorMap) => {
    const formattedModels = modelsData.map((m) => {
      const model = { ...m };
      model.key = model.model_name;
      model.group_ratio = groupRatioData[model.model_name];

      if (model.vendor_id && vendorMap[model.vendor_id]) {
        const vendor = vendorMap[model.vendor_id];
        model.vendor_name = vendor.name;
        model.vendor_icon = vendor.icon;
        model.vendor_description = vendor.description;
      }

      return model;
    });

    // 排序：先按 quota_type，再按 gpt 优先，最后按字母顺序
    formattedModels.sort((a, b) => {
      return a.quota_type - b.quota_type;
    });

    formattedModels.sort((a, b) => {
      if (a.model_name.startsWith('gpt') && !b.model_name.startsWith('gpt')) {
        return -1;
      } else if (
        !a.model_name.startsWith('gpt') &&
        b.model_name.startsWith('gpt')
      ) {
        return 1;
      } else {
        return a.model_name.localeCompare(b.model_name);
      }
    });

    // 过滤：只显示有 description 的模型
    return formattedModels.filter((model) => {
      return model.description && model.description.trim() !== '';
    });
  };

  // 加载价格数据
  const loadPricing = async () => {
    setLoading(true);
    try {
      const url = '/api/pricing';
      const res = await API.get(url);
      const {
        success,
        message,
        data,
        vendors,
        group_ratio,
        usable_group,
        supported_endpoint,
        auto_groups,
      } = res.data;
      if (success) {
        setGroupRatio(group_ratio || {});
        setUsableGroup(usable_group || {});
        setSelectedGroup('all');
        // 构建供应商 Map
        const vendorMap = {};
        if (Array.isArray(vendors)) {
          vendors.forEach((v) => {
            vendorMap[v.id] = v;
          });
        }
        setVendorsMap(vendorMap);
        setEndpointMap(supported_endpoint || {});
        setAutoGroups(auto_groups || []);
        const formattedModels = setModelsFormat(data, group_ratio, vendorMap);
        setModels(formattedModels);
      } else {
        showError(message || t('加载失败'));
      }
    } catch (error) {
      showError(t('加载失败'));
      console.error('Failed to load pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricing();
  }, []);

  // 处理筛选器变化
  useEffect(() => {
    const handleFilterChange = (event) => {
      setFilters(event.detail);
    };

    window.addEventListener('filterChange', handleFilterChange);
    return () => {
      window.removeEventListener('filterChange', handleFilterChange);
    };
  }, []);

  // 处理搜索框变化
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    setFilters((prev) => ({
      ...prev,
      searchQuery: value,
    }));
  };

  // 处理筛选器显示/隐藏
  const [filterToggleState, setFilterToggleState] = useState(null);
  useEffect(() => {
    const handleFilterToggleState = (event) => {
      setFilterToggleState(event.detail);
    };

    window.addEventListener('filterToggleState', handleFilterToggleState);
    return () => {
      window.removeEventListener('filterToggleState', handleFilterToggleState);
    };
  }, []);

  // 筛选后的模型列表
  const filteredModels = useMemo(() => {
    const currentFilters = {
      ...filters,
      searchQuery: searchValue,
    };
    return models.filter((model) => filterModel(model, currentFilters));
  }, [models, filters, searchValue]);

  // 页面标题和描述
  const pageTitle = locale === 'zh' ? '模型价格' : 'Model Pricing';
  const pageDescription =
    locale === 'zh'
      ? '查看所有可用 AI 模型的价格和详细信息'
      : 'View pricing and detailed information for all available AI models';

  return (
    <div className="pricing-page">
      {/* Page Header */}
      <section className="pricing-page-header">
        <div className="pricing-page-header-container">
          <div className="pricing-page-header-content">
            <h1 className="pricing-page-title">{pageTitle}</h1>
            <p className="pricing-page-description">{pageDescription}</p>
          </div>
        </div>
      </section>

      {/* Models Grid with Filters */}
      <section className="pricing-page-content">
        <div className="pricing-page-content-container">
          <div className="pricing-page-layout">
            <ModelFilter locale={locale} allModels={models} onFilterChange={setFilters} />
            <div className="pricing-page-main">
              {/* Search Box and Show Filters Button */}
              <div className="pricing-page-search">
                <button
                  id="show-filters-btn"
                  className="pricing-page-show-filters-button"
                  title={locale === 'zh' ? '显示筛选器' : 'Show Filters'}
                  onClick={() => {
                    if (filterToggleState && filterToggleState.setIsOpen) {
                      filterToggleState.setIsOpen(true);
                    }
                  }}
                >
                  <svg className="pricing-page-filter-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    ></path>
                  </svg>
                </button>
                <div className="pricing-page-search-input-wrapper">
                  <svg
                    className="pricing-page-search-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    ></path>
                  </svg>
                  <input
                    type="text"
                    id="model-search"
                    className="pricing-page-search-input"
                    placeholder={locale === 'zh' ? '请输入模型名称' : 'Enter model name'}
                    value={searchValue}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>

              {/* Models Grid */}
              {loading ? (
                <div className="pricing-page-loading">
                  <p>{locale === 'zh' ? '加载中...' : 'Loading...'}</p>
                </div>
              ) : filteredModels.length > 0 ? (
                <div className="pricing-page-models-grid" id="models-grid">
                  {filteredModels.map((model, index) => {
                    // 计算基础价格（用于显示，ModelCard 内部会使用 calculateModelPrice 重新计算）
                    let input = 0;
                    let output = 0;
                    if (model.quota_type === 0) {
                      // 按量计费：使用 model_ratio
                      input = model.model_ratio ? model.model_ratio * 2 : 0;
                      output = model.model_ratio && model.completion_ratio
                        ? model.model_ratio * model.completion_ratio * 2
                        : model.model_ratio ? model.model_ratio * 2 : 0;
                    } else {
                      // 按次计费：使用 model_price
                      input = model.model_price || 0;
                      output = model.model_price || 0;
                    }

                    return (
                      <div key={model.key || model.model_name || index} className="pricing-page-model-card-item">
                        <ModelCard
                          model={model}
                          name={model.model_name}
                          input={input}
                          output={output}
                          freeLabel={locale === 'zh' ? '免费' : 'Free'}
                          vendorName={model.vendor_name}
                          vendorIcon={model.vendor_icon}
                          icon={model.icon}
                          description={model.description}
                          tags={model.tags}
                          quotaType={model.quota_type}
                          locale={locale}
                          selectedGroup={selectedGroup}
                          groupRatio={groupRatio}
                          displayPrice={displayPrice}
                          currency={currency}
                          tokenUnit={tokenUnit}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div id="no-results" className="pricing-page-no-results">
                  <div className="pricing-page-no-results-content">
                    <svg
                      className="pricing-page-no-results-icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <p className="pricing-page-no-results-title">
                      {locale === 'zh' ? '未找到匹配的模型' : 'No matching models found'}
                    </p>
                    <p className="pricing-page-no-results-description">
                      {locale === 'zh' ? '请尝试调整筛选条件' : 'Try adjusting your filters'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Model Detail Sidebar */}
      <ModelDetailSidebar
        freeLabel={locale === 'zh' ? '免费' : 'Free'}
        locale={locale}
        selectedGroup={selectedGroup}
        groupRatio={groupRatio}
        displayPrice={displayPrice}
        currency={currency}
        tokenUnit={tokenUnit}
        endpointMap={endpointMap}
        usableGroup={usableGroup}
        autoGroups={autoGroups}
      />
    </div>
  );
}

