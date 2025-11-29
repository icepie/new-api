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

import { useMemo } from 'react';

export const useNavigation = (
  t,
  docsLink,
  homeLink,
  aboutLink,
  pricingLink,
  apiDocsLink,
  docsLinkEmbed,
  homeLinkEmbed,
  aboutLinkEmbed,
  pricingLinkEmbed,
  apiDocsLinkEmbed,
  headerNavModules,
) => {
  const mainNavLinks = useMemo(() => {
    // 默认配置，如果没有传入配置则显示所有模块
    const defaultModules = {
      home: true,
      console: true,
      pricing: true,
      docs: true,
      apiDocs: true,
      about: true,
    };

    // 使用传入的配置或默认配置
    const modules = headerNavModules || defaultModules;

    const allLinks = [
      {
        text: t('首页'),
        itemKey: 'home',
        to: '/',
        // 如果设置了URL但没有开启内嵌，则跳转到外部链接
        ...(homeLink && !homeLinkEmbed
          ? {
              isExternal: true,
              externalLink: homeLink,
            }
          : {}),
      },
      {
        text: t('控制台'),
        itemKey: 'console',
        to: '/console',
      },
      {
        text: t('模型定价'),
        itemKey: 'pricing',
        to: '/pricing',
        // 如果设置了URL但没有开启内嵌，则跳转到外部链接
        ...(pricingLink && !pricingLinkEmbed
          ? {
              isExternal: true,
              externalLink: pricingLink,
            }
          : {}),
      },
      ...(docsLink
        ? [
            {
              text: t('使用教程'),
              itemKey: 'docs',
              // 如果开启了内嵌，则路由到页面；否则跳转到外部链接
              ...(docsLinkEmbed
                ? { to: '/docs' }
                : {
                    isExternal: true,
                    externalLink: docsLink,
                  }),
            },
          ]
        : []),
      ...(apiDocsLink
        ? [
            {
              text: t('接口文档'),
              itemKey: 'apiDocs',
              // 如果开启了内嵌，则路由到页面；否则跳转到外部链接
              ...(apiDocsLinkEmbed
                ? { to: '/api-docs' }
                : {
                    isExternal: true,
                    externalLink: apiDocsLink,
                  }),
            },
          ]
        : []),
      {
        text: t('关于'),
        itemKey: 'about',
        to: '/about',
        // 如果设置了URL但没有开启内嵌，则跳转到外部链接
        ...(aboutLink && !aboutLinkEmbed
          ? {
              isExternal: true,
              externalLink: aboutLink,
            }
          : {}),
      },
    ];

    // 根据配置过滤导航链接
    return allLinks.filter((link) => {
      if (link.itemKey === 'docs') {
        return docsLink && modules.docs;
      }
      if (link.itemKey === 'apiDocs') {
        return apiDocsLink && modules.apiDocs;
      }
      if (link.itemKey === 'pricing') {
        // 支持新的pricing配置格式
        return typeof modules.pricing === 'object'
          ? modules.pricing.enabled
          : modules.pricing;
      }
      return modules[link.itemKey] === true;
    });
  }, [
    t,
    docsLink,
    homeLink,
    aboutLink,
    pricingLink,
    apiDocsLink,
    docsLinkEmbed,
    homeLinkEmbed,
    aboutLinkEmbed,
    pricingLinkEmbed,
    apiDocsLinkEmbed,
    headerNavModules,
  ]);

  return {
    mainNavLinks,
  };
};
