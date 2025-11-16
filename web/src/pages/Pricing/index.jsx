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

import React, { useContext } from 'react';
import ModelPricingPage from '../../components/table/model-pricing/layout/PricingPage';
import { StatusContext } from '../../context/Status';

const Pricing = () => {
  const [statusState] = useContext(StatusContext);
  const pricingLink = statusState?.status?.pricing_link || '';
  const pricingLinkEmbed = statusState?.status?.pricing_link_embed || false;

  // 如果设置了模型广场URL且开启了内嵌，则使用iframe显示
  if (pricingLink && pricingLinkEmbed) {
    return (
      <div className='w-full overflow-x-hidden'>
        <iframe
          src={pricingLink}
          style={{ width: '100%', height: '100vh', border: 'none' }}
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
