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
const TARGET_URL_TEXT = 'nicerouter.com';

function ElectronOpenInBrowserPage() {
  const { t } = useTranslation();
  const [copyStatus, setCopyStatus] = useState('idle');
  const [openStatus, setOpenStatus] = useState('idle');

  useEffect(() => {
    document.title = 'nicerouter.com';
  }, []);

  const handleOpenExternal = async () => {
    if (!window.electron?.openExternal) {
      setOpenStatus('failed');
      return false;
    }

    setOpenStatus('opening');
    const opened = await window.electron.openExternal(TARGET_URL);
    setOpenStatus(opened ? 'success' : 'failed');
    return opened;
  };

  useEffect(() => {
    handleOpenExternal().catch(() => {
      setOpenStatus('failed');
    });
  }, []);

  const fallbackCopyText = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }

    document.body.removeChild(textArea);
    return copied;
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(TARGET_URL);
      setCopyStatus('success');
      return;
    }

      if (fallbackCopyText(TARGET_URL)) {
        setCopyStatus('success');
        return;
      }

      setCopyStatus('failed');
    } catch (error) {
      setCopyStatus(fallbackCopyText(TARGET_URL) ? 'success' : 'failed');
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
          {t('请手动在浏览器打开下面的网址')}
        </Typography.Title>
        <Typography.Text className='electron-block-description'>
          {t('已尝试为您调用系统默认浏览器打开。如果没有自动打开，请手动重试或复制下面的网址。')}
        </Typography.Text>
        <div className='electron-block-url'>{TARGET_URL_TEXT}</div>
        <div className='electron-block-actions'>
          <Button
            theme='solid'
            icon={<IconLink />}
            onClick={() => handleOpenExternal()}
            loading={openStatus === 'opening'}
          >
            {t('打开浏览器')}
          </Button>
          <Button theme='solid' icon={<IconCopy />} onClick={handleCopy}>
            {t('复制网址')}
          </Button>
        </div>
        <Typography.Text type='tertiary' className='electron-block-hint'>
          {openStatus === 'success'
            ? t('已尝试调用系统浏览器打开该网址；如果没有弹出，请继续使用复制按钮。')
            : openStatus === 'failed'
              ? t('自动打开浏览器失败，请点击上方按钮重试，或复制网址后手动打开。')
              : copyStatus === 'success'
            ? t('网址已复制，可以切换到浏览器粘贴打开。')
            : copyStatus === 'failed'
              ? t('复制失败，请手动输入该网址到浏览器地址栏。')
              : t('如果复制失败，请手动输入该网址到浏览器地址栏。')}
        </Typography.Text>
      </div>
    </div>
  );
}

export default ElectronOpenInBrowserPage;
