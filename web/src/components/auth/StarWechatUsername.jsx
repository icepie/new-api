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

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getLogo,
  showError,
  getSystemName,
} from '../../helpers';
import {
  starGetWechatQRCode,
  starCheckWechatUsernameStatus,
} from '../../helpers/starApi';
import { Button, Card, Spin, Typography } from '@douyinfe/semi-ui';
import { IconCopy } from '@douyinfe/semi-icons';
import LogoImage from '../common/logo/LogoImage';
import HeroBackground from '../homepage/HeroBackground';

const { Title, Text, Paragraph } = Typography;

const StarWechatUsername = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isDark, setIsDark] = useState(false);

  // 微信二维码相关状态
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrTicket, setQrTicket] = useState('');
  const [qrStatus, setQrStatus] = useState('loading'); // 'loading', 'active', 'scanned', 'expired', 'success'
  const [isLoadingQR, setIsLoadingQR] = useState(false);

  // 找回的用户名
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);

  // 使用 useRef 存储定时器
  const qrCheckIntervalRef = useRef(null);
  const qrTimeoutRef = useRef(null);
  const pollingCountRef = useRef(0);

  const logo = getLogo();
  const systemName = getSystemName();

  useEffect(() => {
    // 检测 dark 模式
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // 停止轮询和清理定时器
  const stopPolling = useCallback(() => {
    if (qrCheckIntervalRef.current) {
      clearTimeout(qrCheckIntervalRef.current);
      qrCheckIntervalRef.current = null;
    }
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }
    pollingCountRef.current = 0;
  }, []);

  // 获取微信二维码
  const fetchWechatQRCode = async () => {
    setIsLoadingQR(true);
    setQrStatus('loading');
    setUsername('');
    stopPolling();

    try {
      const res = await starGetWechatQRCode('get_username');
      if (res.success && res.data) {
        const qrUrl = res.data.qr_code_url || res.data.qr_url || '';
        const ticket = res.data.ticket || '';
        if (qrUrl) {
          setQrCodeUrl(qrUrl);
          setQrTicket(ticket);
          setQrStatus('active');

          // 设置2分钟后自动过期
          qrTimeoutRef.current = setTimeout(() => {
            setQrStatus('expired');
            stopPolling();
          }, 2 * 60 * 1000);
        } else {
          setQrStatus('expired');
        }
      } else {
        setQrStatus('expired');
        showError(res.message || t('获取二维码失败'));
      }
    } catch (error) {
      setQrStatus('expired');
      showError(t('获取二维码失败'));
    } finally {
      setIsLoadingQR(false);
    }
  };

  // 检查扫码状态
  const checkWechatStatus = useCallback(async () => {
    if (!qrTicket) {
      stopPolling();
      return;
    }

    try {
      const res = await starCheckWechatUsernameStatus(qrTicket);
      if (res.success && res.data) {
        // 如果返回了用户名，说明找回成功
        if (res.data.username) {
          setUsername(res.data.username);
          setQrStatus('success');
          stopPolling();
          return;
        }

        // 如果状态是已扫码
        if (res.data.scanned) {
          setQrStatus('scanned');
        }

        pollingCountRef.current++;
      } else if (res.message && (res.message.includes('过期') || res.message.includes('已过期'))) {
        setQrStatus('expired');
        stopPolling();
      } else {
        pollingCountRef.current++;
      }
    } catch (error) {
      if (error.message && (error.message.includes('过期') || error.message.includes('已过期'))) {
        setQrStatus('expired');
        stopPolling();
      } else {
        pollingCountRef.current++;
        if (pollingCountRef.current > 60) {
          setQrStatus('expired');
          stopPolling();
        }
      }
    }
  }, [qrTicket, stopPolling]);

  // 当获取到 ticket 后，自动开始轮询
  useEffect(() => {
    if (qrTicket && qrStatus === 'active' && !qrCheckIntervalRef.current) {
      pollingCountRef.current = 0;

      const scheduleNextPoll = () => {
        if (!qrTicket || qrStatus === 'expired' || qrStatus === 'success') {
          stopPolling();
          return;
        }

        const interval = pollingCountRef.current < 30 ? 2000 : 3000;
        qrCheckIntervalRef.current = setTimeout(() => {
          if (!qrTicket || qrStatus === 'expired' || qrStatus === 'success') {
            stopPolling();
            return;
          }

          checkWechatStatus().then(() => {
            if (qrTicket && qrStatus !== 'expired' && qrStatus !== 'success' && qrStatus !== 'loading') {
              scheduleNextPoll();
            }
          }).catch(() => {
            if (qrTicket && qrStatus !== 'expired' && qrStatus !== 'success' && qrStatus !== 'loading') {
              scheduleNextPoll();
            }
          });
        }, interval);
      };

      // 立即执行一次检查
      checkWechatStatus().then(() => {
        if (qrTicket && (qrStatus === 'active' || qrStatus === 'scanned') && !qrCheckIntervalRef.current) {
          scheduleNextPoll();
        }
      }).catch(() => {
        if (qrTicket && (qrStatus === 'active' || qrStatus === 'scanned') && !qrCheckIntervalRef.current) {
          scheduleNextPoll();
        }
      });
    }

    return () => {
      if ((!qrTicket || qrStatus === 'expired' || qrStatus === 'success') && qrCheckIntervalRef.current) {
        stopPolling();
      }
    };
  }, [qrTicket, qrStatus, checkWechatStatus, stopPolling]);

  // 组件挂载时获取二维码
  useEffect(() => {
    fetchWechatQRCode();
    return () => {
      stopPolling();
    };
  }, []);

  // 复制用户名
  const copyUsername = () => {
    if (username) {
      navigator.clipboard.writeText(username).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // 刷新二维码
  const refreshQRCode = () => {
    stopPolling();
    fetchWechatQRCode();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative py-12 px-4 sm:px-6 lg:px-8">
      <HeroBackground />
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-6 gap-2">
            <LogoImage src={logo} alt="Logo" className="h-10 rounded-full" />
            <Title heading={3} className={`!text-gray-800 ${systemName === 'NiceRouter' ? '!italic' : ''}`}>
              {systemName}
            </Title>
          </div>

          <Card className="border-0 !rounded-2xl overflow-hidden shadow-xl">
            <div className="flex justify-center pt-8 pb-4">
              <Title heading={3} className="text-gray-800 dark:text-gray-200 font-semibold">
                {t('找回用户名')}
              </Title>
            </div>
            <div className="px-4 sm:px-6 pb-8">
              {/* 成功状态 - 显示用户名 */}
              {qrStatus === 'success' && username && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <Text className="text-gray-600 dark:text-gray-400 text-sm mb-6 block">
                      {t('您的用户名是')}
                    </Text>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-center gap-3">
                        <Text className="text-2xl font-mono font-bold text-gray-800 dark:text-gray-200">
                          {username}
                        </Text>
                        <Button
                          icon={<IconCopy />}
                          theme="borderless"
                          onClick={copyUsername}
                          className="!text-gray-500 hover:!text-gray-700 dark:!text-gray-400 dark:hover:!text-gray-200"
                        />
                      </div>
                      {copied && (
                        <Text className="text-green-600 dark:text-green-400 text-sm mt-2 block">
                          {t('已复制到剪贴板')}
                        </Text>
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <Text className="text-amber-800 dark:text-amber-200 font-medium block mb-1">
                          {t('重要提示')}
                        </Text>
                        <Text className="text-amber-700 dark:text-amber-300 text-sm">
                          {t('请妥善保管您的用户名，建议登录后在个人设置中修改为方便记忆的用户名。')}
                        </Text>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      theme="solid"
                      type="primary"
                      className="w-full !rounded-full"
                      style={{
                        backgroundColor: 'black',
                        color: 'white',
                        borderColor: 'black',
                      }}
                      onClick={() => navigate('/login')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1f2937';
                        e.currentTarget.style.borderColor = '#1f2937';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'black';
                        e.currentTarget.style.borderColor = 'black';
                      }}
                    >
                      {t('前往登录')}
                    </Button>
                  </div>
                </div>
              )}

              {/* 二维码扫描状态 */}
              {qrStatus !== 'success' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <Text className="text-gray-600 dark:text-gray-400 mb-8 text-sm sm:text-base max-w-xs mx-auto px-2 leading-relaxed">
                      {t('使用微信扫描下方二维码找回您的用户名')}
                    </Text>
                    <div className="flex justify-center mt-2">
                      <div className="relative inline-block">
                        {qrStatus === 'loading' || isLoadingQR ? (
                          <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <Spin size="large" />
                          </div>
                        ) : qrStatus === 'active' ? (
                          <div className="flex flex-col items-center">
                            <div className="relative bg-white dark:bg-gray-800/50 p-2 rounded-xl">
                              <img
                                src={qrCodeUrl}
                                alt={t('微信二维码')}
                                className="w-40 h-40 sm:w-48 sm:h-48 rounded-lg object-contain"
                                style={{ display: 'block' }}
                              />
                            </div>
                          </div>
                        ) : qrStatus === 'scanned' ? (
                          <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl shadow-sm">
                            <div className="text-center px-2">
                              <Spin size="large" />
                              <Text className="text-green-600 dark:text-green-400 text-sm sm:text-base mt-2 block">{t('扫码成功')}</Text>
                              <Text className="text-green-500 dark:text-green-500 text-xs">{t('正在查询用户名...')}</Text>
                            </div>
                          </div>
                        ) : (
                          <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700/50 rounded-xl shadow-sm">
                            <div className="text-center px-2">
                              <Text className="text-gray-500 dark:text-gray-400 mb-2 text-sm sm:text-base">{t('二维码已过期')}</Text>
                              <Button
                                size="small"
                                onClick={refreshQRCode}
                                disabled={isLoadingQR}
                              >
                                {isLoadingQR ? <Spin /> : t('刷新二维码')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {qrStatus === 'active' && (
                    <div className="text-center space-y-3">
                      <Button
                        size="small"
                        onClick={refreshQRCode}
                        disabled={isLoadingQR || qrStatus === 'loading'}
                      >
                        {isLoadingQR ? <Spin /> : t('刷新二维码')}
                      </Button>
                    </div>
                  )}

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4 mt-6">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <Text className="text-blue-800 dark:text-blue-200 font-medium block mb-1">
                          {t('使用说明')}
                        </Text>
                        <Text className="text-blue-700 dark:text-blue-300 text-sm">
                          {t('请使用之前绑定过的微信账号扫码，系统将返回该微信关联的用户名。')}
                        </Text>
                      </div>
                    </div>
                  </div>

                  {/* 底部链接 */}
                  <div className="text-center mt-6 text-sm">
                    <Text className="auth-page-link-text">
                      <Link to="/login" className="auth-page-link font-medium">
                        {t('返回登录')}
                      </Link>
                    </Text>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StarWechatUsername;
