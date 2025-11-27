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

import { useState, useEffect, useContext } from 'react';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusContext } from '../../context/Status';

/**
 * API URL 显示组件
 * 显示 API 基础 URL 和路径选择器，支持复制
 */
const apiPaths = [
  '/v1/chat/completions',
  '/v1/responses',
  '/v1/messages',
  '/v1beta/models',
  '/v1/embeddings',
  '/v1/rerank',
  '/v1/images/generations',
  '/v1/images/edits',
  '/v1/images/variations',
  '/v1/audio/speech',
  '/v1/audio/transcriptions',
  '/v1/audio/translations',
];

export default function ApiUrlDisplay({ locale = 'zh' }) {
  const { t } = useTranslation();
  const [statusState] = useContext(StatusContext);
  
  // 使用 useState 和 useEffect 确保只在客户端获取 URL，避免 SSR/CSR 不匹配
  // 使用默认值确保初始渲染时不会显示空白
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    // 只在客户端执行，避免 SSR/CSR 不匹配
    if (typeof window !== 'undefined') {
      return statusState?.status?.server_address || window.location.origin;
    }
    // 服务器端使用默认值
    return window?.location?.origin || '';
  });
  
  const [copied, setCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // 在客户端挂载后更新 URL（如果需要）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const serverAddress = statusState?.status?.server_address || window.location.origin;
      setApiBaseUrl(serverAddress);
    }
  }, [statusState?.status?.server_address]);

  // 为了无缝循环，复制路径列表
  const duplicatedPaths = [...apiPaths, ...apiPaths];

  const handleCopyApiUrl = async () => {
    // 只复制基础 URL，不包括路径
    try {
      await navigator.clipboard.writeText(apiBaseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = apiBaseUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('复制失败', e);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="api-url-display">
      <p className="api-url-description">
        {locale === 'zh' ? '替换基础 URL 即可接入' : 'Replace the base URL to connect'}
      </p>
      {/* 小屏幕：垂直布局 */}
      <div className="api-url-mobile">
        {/* API URL 和复制按钮在同一行 */}
        <div className="api-url-mobile-header">
          <div className="api-url-mobile-text">
            <span>{apiBaseUrl}</span>
          </div>
          <button
            onClick={handleCopyApiUrl}
            className="api-url-copy-button"
            title={locale === 'zh' ? '复制' : 'Copy'}
          >
            {copied ? (
              <Check className={`api-url-copy-button-icon copied`} />
            ) : (
              <Copy className="api-url-copy-button-icon" />
            )}
          </button>
        </div>
        {/* 路径选择器单独在下面 */}
        <div
          className="path-selector-container"
          style={{ height: '24px' }}
          onMouseEnter={() => {
            setIsPaused(true);
          }}
          onMouseLeave={() => {
            setIsPaused(false);
          }}
        >
          <div style={{ position: 'relative', minWidth: '140px', height: '24px', overflow: 'hidden' }}>
            <ul
              className={`path-list ${isPaused ? 'paused' : ''}`}
              role="listbox"
              aria-multiselectable="false"
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              {duplicatedPaths.map((path, index) => (
                <li
                  key={`${path}-${index}`}
                  role="option"
                  aria-selected={index === 0}
                  className="path-list-item"
                  style={{
                    minHeight: '24px',
                  }}
                >
                  <span className="path-list-item-text">
                    {path}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {/* 中屏幕及以上：水平布局 */}
      <div className="api-url-desktop">
        <div className="api-url-desktop-text">
          <span>{apiBaseUrl}</span>
        </div>
        <div
          className="path-selector-container"
          style={{ height: '24px', flexShrink: 0 }}
          onMouseEnter={() => {
            setIsPaused(true);
          }}
          onMouseLeave={() => {
            setIsPaused(false);
          }}
        >
          <div style={{ position: 'relative', minWidth: '160px', height: '24px', overflow: 'hidden' }}>
            <ul
              className={`path-list ${isPaused ? 'paused' : ''}`}
              role="listbox"
              aria-multiselectable="false"
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              {duplicatedPaths.map((path, index) => (
                <li
                  key={`${path}-${index}`}
                  role="option"
                  aria-selected={index === 0}
                  className="path-list-item path-list-item-desktop"
                  style={{
                    minHeight: '24px',
                  }}
                >
                  <span className="path-list-item-text path-list-item-text-desktop">
                    {path}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button
          onClick={handleCopyApiUrl}
          className="api-url-desktop-copy-button"
          title={locale === 'zh' ? '复制' : 'Copy'}
        >
          {copied ? (
            <Check className={`api-url-desktop-copy-button-icon copied`} />
          ) : (
            <Copy className="api-url-desktop-copy-button-icon" />
          )}
        </button>
      </div>
    </div>
  );
}

