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

import React, { useContext, useMemo } from 'react';
import ModelPricingPage from '../../components/table/model-pricing/layout/PricingPage';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';

const Pricing = () => {
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const pricingLink = statusState?.status?.pricing_link || '';
  const pricingLinkEmbed = statusState?.status?.pricing_link_embed || false;

  // 构建带主题参数的 URL
  const pricingIframeSrc = useMemo(() => {
    if (!pricingLink) return '';
    try {
      const url = new URL(pricingLink);
      url.searchParams.set('theme', actualTheme);
      return url.toString();
    } catch {
      // 如果 URL 解析失败，直接拼接参数
      const separator = pricingLink.includes('?') ? '&' : '?';
      return `${pricingLink}${separator}theme=${actualTheme}`;
    }
  }, [pricingLink, actualTheme]);

  // 如果设置了模型广场URL且开启了内嵌，则使用iframe显示
  if (pricingLink && pricingLinkEmbed) {
    return (
      <div className='w-full overflow-x-hidden mt-16'>
        <iframe
          key={pricingIframeSrc}
          src={pricingIframeSrc}
          className='w-full h-[calc(100vh-4rem)] border-none'
        />
      </div>
    );
  }

  return (
    <>
      <ModelPricingPage />
    </>
  );
};

export default Pricing;
