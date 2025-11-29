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
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { useTranslation } from 'react-i18next';

const Docs = () => {
  const { i18n, t } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const docsLink = statusState?.status?.docs_link || '';
  const docsLinkEmbed = statusState?.status?.docs_link_embed || false;

  // 构建带主题参数的 URL
  const iframeSrc = useMemo(() => {
    if (!docsLink) return '';
    try {
      const url = new URL(docsLink);
      url.searchParams.set('theme', actualTheme);
      return url.toString();
    } catch {
      // 如果 URL 解析失败，直接拼接参数
      const separator = docsLink.includes('?') ? '&' : '?';
      return `${docsLink}${separator}theme=${actualTheme}`;
    }
  }, [docsLink, actualTheme]);

  // 如果设置了文档URL且开启了内嵌，则使用iframe显示
  if (docsLink && docsLinkEmbed) {
    return (
      <div className='w-full overflow-x-hidden mt-16'>
        <iframe
          key={iframeSrc}
          src={iframeSrc}
          className='w-full h-[calc(100vh-4rem)] border-none'
          onLoad={() => {
            const iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
              iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
            }
          }}
        />
      </div>
    );
  }

  // 如果没有设置文档URL或没有开启内嵌，显示空状态或重定向
  return (
    <div className='flex justify-center items-center h-screen'>
      <p>{t('文档未配置或未启用内嵌模式')}</p>
    </div>
  );
};

export default Docs;

