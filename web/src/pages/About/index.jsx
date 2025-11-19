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

import React, { useEffect, useState, useContext, useMemo } from 'react';
import { API, showError } from '../../helpers';
import { marked } from 'marked';
import { Empty } from '@douyinfe/semi-ui';
import {
  IllustrationConstruction,
  IllustrationConstructionDark,
} from '@douyinfe/semi-illustrations';
import { useTranslation } from 'react-i18next';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';

const About = () => {
  const { t } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const [about, setAbout] = useState('');
  const [aboutLoaded, setAboutLoaded] = useState(false);
  const aboutLink = statusState?.status?.about_link || '';
  const aboutLinkEmbed = statusState?.status?.about_link_embed || false;
  const currentYear = new Date().getFullYear();

  // 构建带主题参数的 URL
  const aboutIframeSrc = useMemo(() => {
    if (!aboutLink) return '';
    try {
      const url = new URL(aboutLink);
      url.searchParams.set('theme', actualTheme);
      return url.toString();
    } catch {
      // 如果 URL 解析失败，直接拼接参数
      const separator = aboutLink.includes('?') ? '&' : '?';
      return `${aboutLink}${separator}theme=${actualTheme}`;
    }
  }, [aboutLink, actualTheme]);

  const displayAbout = async () => {
    setAbout(localStorage.getItem('about') || '');
    const res = await API.get('/api/about');
    const { success, message, data } = res.data;
    if (success) {
      let aboutContent = data;
      if (!data.startsWith('https://')) {
        aboutContent = marked.parse(data);
      }
      setAbout(aboutContent);
      localStorage.setItem('about', aboutContent);
    } else {
      showError(message);
      setAbout(t('加载关于内容失败...'));
    }
    setAboutLoaded(true);
  };

  useEffect(() => {
    displayAbout().then();
  }, []);

  const emptyStyle = {
    padding: '24px',
  };

  const customDescription = (
    <div style={{ textAlign: 'center' }}>
      <p>{t('可在设置页面设置关于内容，支持 HTML & Markdown')}</p>
      {t('New API项目仓库地址：')}
      <a
        href='https://github.com/QuantumNous/new-api'
        target='_blank'
        rel='noopener noreferrer'
        className='!text-semi-color-primary'
      >
        https://github.com/QuantumNous/new-api
      </a>
      <p>
        <a
          href='https://github.com/QuantumNous/new-api'
          target='_blank'
          rel='noopener noreferrer'
          className='!text-semi-color-primary'
        >
          NiceRouter
        </a>{' '}
        {t('© {{currentYear}}', { currentYear })}{' '}
        <a
          href='https://github.com/QuantumNous'
          target='_blank'
          rel='noopener noreferrer'
          className='!text-semi-color-primary'
        >
          QuantumNous
        </a>{' '}
        {t('| 基于')}{' '}
        <a
          href='https://github.com/songquanpeng/one-api/releases/tag/v0.5.4'
          target='_blank'
          rel='noopener noreferrer'
          className='!text-semi-color-primary'
        >
          One API v0.5.4
        </a>{' '}
        © 2023{' '}
        <a
          href='https://github.com/songquanpeng'
          target='_blank'
          rel='noopener noreferrer'
          className='!text-semi-color-primary'
        >
          JustSong
        </a>
      </p>
      <p>
        {t('本项目根据')}
        <a
          href='https://github.com/songquanpeng/one-api/blob/v0.5.4/LICENSE'
          target='_blank'
          rel='noopener noreferrer'
          className='!text-semi-color-primary'
        >
          {t('MIT许可证')}
        </a>
        {t('授权，需在遵守')}
        <a
          href='https://www.gnu.org/licenses/agpl-3.0.html'
          target='_blank'
          rel='noopener noreferrer'
          className='!text-semi-color-primary'
        >
          {t('AGPL v3.0协议')}
        </a>
        {t('的前提下使用。')}
      </p>
    </div>
  );

  // 如果设置了关于URL且开启了内嵌，则使用iframe显示
  if (aboutLink && aboutLinkEmbed) {
    return (
      <div className='w-full overflow-x-hidden mt-16'>
        <iframe
          key={aboutIframeSrc}
          src={aboutIframeSrc}
          className='w-full h-[calc(100vh-4rem)] border-none'
        />
      </div>
    );
  }

  return (
    <div className='mt-[60px] px-2'>
      {aboutLoaded && about === '' ? (
        <div className='flex justify-center items-center h-screen p-8'>
          <Empty
            image={
              <IllustrationConstruction style={{ width: 150, height: 150 }} />
            }
            darkModeImage={
              <IllustrationConstructionDark
                style={{ width: 150, height: 150 }}
              />
            }
            description={t('管理员暂时未设置任何关于内容')}
            style={emptyStyle}
          >
            {customDescription}
          </Empty>
        </div>
      ) : (
        <>
          {about.startsWith('https://') ? (
            <iframe
              src={about}
              style={{ width: '100%', height: '100vh', border: 'none' }}
            />
          ) : (
            <div
              style={{ fontSize: 'larger' }}
              dangerouslySetInnerHTML={{ __html: about }}
            ></div>
          )}
        </>
      )}
    </div>
  );
};

export default About;
