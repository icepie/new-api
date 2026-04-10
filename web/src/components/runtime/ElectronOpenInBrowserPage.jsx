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

import React, { useEffect, useState } from 'react';
import { Button, Typography } from '@douyinfe/semi-ui';
import { IconCopy, IconLink } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

const TARGET_URL = 'https://nicerouter.com';

function ElectronOpenInBrowserPage() {
  const { t } = useTranslation();
  const [copyStatus, setCopyStatus] = useState('idle');

  useEffect(() => {
    document.title = 'nicerouter.com';
  }, []);

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(TARGET_URL);
      setCopyStatus('success');
    } catch (error) {
      setCopyStatus('failed');
    }
  };

  return (
    <div className='electron-block-page'>
      <div className='electron-block-card'>
        <div className='electron-block-badge'>
          <IconLink size='small' />
          <span>{t('请在系统浏览器中打开')}</span>
        </div>
        <Typography.Title heading={2} className='!mb-3'>
          {t('当前页面不支持在 Electron 内打开')}
        </Typography.Title>
        <Typography.Text className='electron-block-description'>
          {t('请手动复制下面的网址，并在 Chrome、Edge、Safari 或其他系统浏览器中访问。')}
        </Typography.Text>
        <div className='electron-block-url'>{TARGET_URL}</div>
        <div className='electron-block-actions'>
          <Button theme='solid' icon={<IconCopy />} onClick={handleCopy}>
            {t('复制网址')}
          </Button>
        </div>
        <Typography.Text type='tertiary' className='electron-block-hint'>
          {copyStatus === 'success'
            ? t('网址已复制，可以切换到浏览器粘贴打开。')
            : copyStatus === 'failed'
              ? t('复制失败，请手动选中并复制网址后在浏览器打开。')
              : t('如果复制按钮不可用，也可以直接手动选择并复制该网址。')}
        </Typography.Text>
      </div>
    </div>
  );
}

export default ElectronOpenInBrowserPage;
