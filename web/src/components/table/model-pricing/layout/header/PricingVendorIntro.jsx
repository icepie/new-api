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

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Card,
  Tag,
  Avatar,
  Typography,
  Tooltip,
  Modal,
} from '@douyinfe/semi-ui';
import { IconSparkles } from '@tabler/icons-react';
import * as LobeIcons from '@lobehub/icons';
import { getLobeHubIcon } from '../../../../../helpers';
import SearchActions from './SearchActions';
import SmartBackground from 'smart-background';

const { Paragraph } = Typography;

const CONFIG = {
  CAROUSEL_INTERVAL: 2000,
  ICON_SIZE: 40,
  UNKNOWN_VENDOR: 'unknown',
};

const THEME_COLORS = {
  allVendors: {
    background: 'rgba(59, 130, 246, 0.08)',
    solid: '#2563eb',
    image: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 52%, #38bdf8 100%)',
    soft: 'rgba(255,255,255,0.16)',
    icon: '#dbeafe',
    animation: { type: 'bottom', speed: 8 },
  },
  specific: {
    background: 'rgba(16, 185, 129, 0.1)',
    solid: '#059669',
    image: 'linear-gradient(to right, #0f766e 0%, #10b981 52%, #6ee7b7 100%)',
    soft: 'rgba(255,255,255,0.15)',
    icon: '#d1fae5',
    animation: { type: 'right', speed: 6 },
  },
};

const COMPONENT_STYLES = {
  tag: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    color: '#1f2937',
    border: '1px solid rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  avatarContainer: 'w-16 h-16 rounded-2xl flex items-center justify-center',
  avatarContainerStyle: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: 'rgba(255,255,255,0.18) 0px 1px 0px inset',
    backdropFilter: 'blur(6px)',
  },
  titleText: { color: 'white' },
  descriptionText: { color: 'rgba(255,255,255,0.9)' },
};

const CONTENT_TEXTS = {
  unknown: {
    displayName: (t) => t('未知供应商'),
    description: (t) =>
      t(
        '包含来自未知或未标明供应商的AI模型，这些模型可能来自小型供应商或开源项目。',
      ),
  },
  all: {
    description: (t) =>
      t('查看所有可用的AI模型供应商，包括众多知名供应商的模型。'),
  },
  fallback: {
    description: (t) => t('该供应商提供多种AI模型，适用于不同的应用场景。'),
  },
};

const getVendorDisplayName = (vendorName, t) => {
  return vendorName === CONFIG.UNKNOWN_VENDOR
    ? CONTENT_TEXTS.unknown.displayName(t)
    : vendorName;
};

const createDefaultAvatar = () => (
  <div className={COMPONENT_STYLES.avatarContainer} style={COMPONENT_STYLES.avatarContainerStyle}>
    <Avatar size='large' color='transparent'>
      AI
    </Avatar>
  </div>
);

const getAvatarBackgroundColor = (isAllVendors) =>
  isAllVendors
    ? THEME_COLORS.allVendors.background
    : THEME_COLORS.specific.background;

const getAvatarText = (vendorName) =>
  vendorName === CONFIG.UNKNOWN_VENDOR
    ? '?'
    : vendorName.charAt(0).toUpperCase();

const createAvatarContent = (vendor, isAllVendors) => {
  if (vendor.icon) {
    return getLobeHubIcon(vendor.icon, CONFIG.ICON_SIZE, true);
  }

  return (
    <Avatar
      size='large'
      style={{ backgroundColor: getAvatarBackgroundColor(isAllVendors) }}
    >
      {getAvatarText(vendor.name)}
    </Avatar>
  );
};

const renderVendorAvatar = (vendor, t, isAllVendors = false) => {
  if (!vendor) {
    return createDefaultAvatar();
  }

  const displayName = getVendorDisplayName(vendor.name, t);
  const avatarContent = createAvatarContent(vendor, isAllVendors);

  return (
    <Tooltip content={displayName} position='top'>
      <div className={COMPONENT_STYLES.avatarContainer} style={COMPONENT_STYLES.avatarContainerStyle}>{avatarContent}</div>
    </Tooltip>
  );
};

const createBackgroundIconSymbol = (IconComponent, size) => {
  if (!IconComponent) return null;
  const SafeIcon = IconComponent.Color || IconComponent;
  if (!SafeIcon) return null;
  if (typeof SafeIcon !== 'function' && typeof SafeIcon !== 'object') {
    return null;
  }
  return <SafeIcon size={size} />;
};

const createBackgroundIconSymbols = (iconNames, size) =>
  iconNames
    .map((name) => createBackgroundIconSymbol(LobeIcons[name], size))
    .filter(Boolean);

const getHeaderBackgroundConfig = (isAllVendors) => {
  const theme = isAllVendors ? THEME_COLORS.allVendors : THEME_COLORS.specific;
  const backgroundSymbols = isAllVendors
    ? createBackgroundIconSymbols(
        [
          'OpenAI',
          'Claude',
          'Gemini',
          'DeepSeek',
          'Qwen',
          'Mistral',
          'Moonshot',
          'Zhipu',
          'Doubao',
          'Spark',
          'Groq',
          'Perplexity',
          'Cohere',
          'Together',
          'Ai360',
          'ChatGLM',
          'Minimax',
          'Hunyuan',
          'Jina',
          'XAI',
          'Yi',
        ],
        28,
      )
    : createBackgroundIconSymbols(
        [
          'OpenAI',
          'Claude',
          'Gemini',
          'DeepSeek',
          'Qwen',
          'Groq',
          'Mistral',
          'Moonshot',
          'Zhipu',
          'Doubao',
          'Spark',
          'ChatGLM',
          'Minimax',
          'Hunyuan',
        ],
        26,
      );
  return {
    underlayColor: isAllVendors ? theme.solid : undefined,
    underlayImage: isAllVendors ? undefined : theme.image,
    animation: isAllVendors ? theme.animation : undefined,
    symbols: backgroundSymbols,
    symbolSize: isAllVendors ? 26 : 56,
    gap: isAllVendors ? 28 : 10,
    random: isAllVendors ? undefined : { fontSizeRange: [44, 68] },
    rotate: isAllVendors ? -8 : 36,
    symbolsStyle: {
      color: 'rgba(255,255,255,0.95)',
      fontWeight: 800,
      letterSpacing: '0.08em',
      opacity: isAllVendors ? 0.82 : 0.9,
      filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.14))',
    },
    childrenWrapStyle: {
      padding: 0,
      overflow: 'hidden',
    },
  };
};

const PricingVendorIntro = memo(
  ({
    filterVendor,
    models = [],
    allModels = [],
    t,
    selectedRowKeys = [],
    copyText,
    handleChange,
    handleCompositionStart,
    handleCompositionEnd,
    isMobile = false,
    searchValue = '',
    setShowFilterModal,
    showWithRecharge,
    setShowWithRecharge,
    currency,
    setCurrency,
    showRatio,
    setShowRatio,
    viewMode,
    setViewMode,
    tokenUnit,
    setTokenUnit,
  }) => {
    const [currentOffset, setCurrentOffset] = useState(0);
    const [descModalVisible, setDescModalVisible] = useState(false);
    const [descModalContent, setDescModalContent] = useState('');

    const handleOpenDescModal = useCallback((content) => {
      setDescModalContent(content || '');
      setDescModalVisible(true);
    }, []);

    const handleCloseDescModal = useCallback(() => {
      setDescModalVisible(false);
    }, []);

    const renderDescriptionModal = useCallback(
      () => (
        <Modal
          title={t('供应商介绍')}
          visible={descModalVisible}
          onCancel={handleCloseDescModal}
          footer={null}
          width={isMobile ? '95%' : 600}
          bodyStyle={{
            maxHeight: isMobile ? '70vh' : '60vh',
            overflowY: 'auto',
          }}
        >
          <div className='text-sm mb-4'>{descModalContent}</div>
        </Modal>
      ),
      [descModalVisible, descModalContent, handleCloseDescModal, isMobile, t],
    );

    const vendorInfo = useMemo(() => {
      const vendors = new Map();
      let unknownCount = 0;

      const sourceModels =
        Array.isArray(allModels) && allModels.length > 0 ? allModels : models;

      sourceModels.forEach((model) => {
        if (model.vendor_name) {
          const existing = vendors.get(model.vendor_name);
          if (existing) {
            existing.count++;
          } else {
            vendors.set(model.vendor_name, {
              name: model.vendor_name,
              icon: model.vendor_icon,
              description: model.vendor_description,
              count: 1,
            });
          }
        } else {
          unknownCount++;
        }
      });

      const vendorList = Array.from(vendors.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      if (unknownCount > 0) {
        vendorList.push({
          name: CONFIG.UNKNOWN_VENDOR,
          icon: null,
          description: CONTENT_TEXTS.unknown.description(t),
          count: unknownCount,
        });
      }

      return vendorList;
    }, [allModels, models, t]);

    const currentModelCount = models.length;

    useEffect(() => {
      if (filterVendor !== 'all' || vendorInfo.length <= 1) {
        setCurrentOffset(0);
        return;
      }

      const interval = setInterval(() => {
        setCurrentOffset((prev) => (prev + 1) % vendorInfo.length);
      }, CONFIG.CAROUSEL_INTERVAL);

      return () => clearInterval(interval);
    }, [filterVendor, vendorInfo.length]);

    const getVendorDescription = useCallback(
      (vendorKey) => {
        if (vendorKey === 'all') {
          return CONTENT_TEXTS.all.description(t);
        }
        if (vendorKey === CONFIG.UNKNOWN_VENDOR) {
          return CONTENT_TEXTS.unknown.description(t);
        }
        const vendor = vendorInfo.find((v) => v.name === vendorKey);
        return vendor?.description || CONTENT_TEXTS.fallback.description(t);
      },
      [vendorInfo, t],
    );

    const renderSearchActions = useCallback(
      () => (
        <SearchActions
          selectedRowKeys={selectedRowKeys}
          copyText={copyText}
          handleChange={handleChange}
          handleCompositionStart={handleCompositionStart}
          handleCompositionEnd={handleCompositionEnd}
          isMobile={isMobile}
          searchValue={searchValue}
          setShowFilterModal={setShowFilterModal}
          showWithRecharge={showWithRecharge}
          setShowWithRecharge={setShowWithRecharge}
          currency={currency}
          setCurrency={setCurrency}
          showRatio={showRatio}
          setShowRatio={setShowRatio}
          viewMode={viewMode}
          setViewMode={setViewMode}
          tokenUnit={tokenUnit}
          setTokenUnit={setTokenUnit}
          t={t}
        />
      ),
      [
        selectedRowKeys,
        copyText,
        handleChange,
        handleCompositionStart,
        handleCompositionEnd,
        isMobile,
        searchValue,
        setShowFilterModal,
        showWithRecharge,
        setShowWithRecharge,
        currency,
        setCurrency,
        showRatio,
        setShowRatio,
        viewMode,
        setViewMode,
        tokenUnit,
        setTokenUnit,
        t,
      ],
    );

    const renderHeaderCard = useCallback(
      ({ title, count, description, rightContent, isAllVendors }) => {
        const theme = isAllVendors
          ? THEME_COLORS.allVendors
          : THEME_COLORS.specific;
        const backgroundConfig = getHeaderBackgroundConfig(isAllVendors);
        const backgroundClassName = isAllVendors
          ? 'pricing-vendor-intro-bg pricing-vendor-intro-bg-all'
          : 'pricing-vendor-intro-bg pricing-vendor-intro-bg-single';
        return (
        <Card
          className='!rounded-2xl shadow-sm border-0'
          cover={
            <div style={{ position: 'relative', height: 100 }}>
              <SmartBackground
                {...backgroundConfig}
                className={backgroundClassName}
              >
                <div className='relative z-10 h-full flex items-center justify-between p-4'>
                  <div className='flex items-center flex-1 min-w-0 mr-4'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex flex-row flex-wrap items-center gap-2 sm:gap-3 mb-2'>
                      <h2
                        className='text-lg sm:text-xl font-bold truncate'
                        style={COMPONENT_STYLES.titleText}
                      >
                        {title}
                      </h2>
                      <Tag
                        style={COMPONENT_STYLES.tag}
                        shape='circle'
                        size='small'
                        className='self-center'
                      >
                        {t('共 {{count}} 个模型', { count })}
                      </Tag>
                      {isAllVendors ? (
                        <Tag
                          style={COMPONENT_STYLES.tag}
                          shape='circle'
                          size='small'
                          className='self-center'
                        >
                          {t('AI 模型市场')}
                        </Tag>
                      ) : (
                        <Tag
                          style={COMPONENT_STYLES.tag}
                          shape='circle'
                          size='small'
                          className='self-center'
                        >
                          {t('AI 供应商')}
                        </Tag>
                      )}
                    </div>
                    <Paragraph
                      className='text-xs sm:text-sm leading-relaxed !mb-0 cursor-pointer'
                      style={COMPONENT_STYLES.descriptionText}
                      ellipsis={{ rows: 2 }}
                      onClick={() => handleOpenDescModal(description)}
                    >
                      {description}
                    </Paragraph>
                    </div>
                  </div>

                  <div className='flex-shrink-0'>{rightContent}</div>
                </div>
              </SmartBackground>
            </div>
          }
        >
          {renderSearchActions()}
        </Card>
        );
      },
      [renderSearchActions, handleOpenDescModal, t],
    );

    const renderAllVendorsAvatar = useCallback(() => {
      const currentVendor =
        vendorInfo.length > 0
          ? vendorInfo[currentOffset % vendorInfo.length]
          : null;
      return renderVendorAvatar(currentVendor, t, true);
    }, [vendorInfo, currentOffset, t]);

    if (filterVendor === 'all') {
      const headerCard = renderHeaderCard({
        title: t('全部供应商'),
        count: currentModelCount,
        description: getVendorDescription('all'),
        rightContent: renderAllVendorsAvatar(),
        isAllVendors: true,
      });
      return (
        <>
          {headerCard}
          {renderDescriptionModal()}
        </>
      );
    }

    const currentVendor = vendorInfo.find((v) => v.name === filterVendor);
    if (!currentVendor) {
      return null;
    }

    const vendorDisplayName = getVendorDisplayName(currentVendor.name, t);

    const headerCard = renderHeaderCard({
      title: vendorDisplayName,
      count: currentModelCount,
      description:
        currentVendor.description || getVendorDescription(currentVendor.name),
      rightContent: renderVendorAvatar(currentVendor, t, false),
      isAllVendors: false,
    });

    return (
      <>
        {headerCard}
        {renderDescriptionModal()}
      </>
    );
  },
);

PricingVendorIntro.displayName = 'PricingVendorIntro';

export default PricingVendorIntro;
