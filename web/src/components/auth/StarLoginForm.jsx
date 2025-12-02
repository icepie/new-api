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

import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserContext } from '../../context/User';
import {
  getLogo,
  showError,
  showSuccess,
  updateAPI,
  getSystemName,
  setUserData,
} from '../../helpers';
import {
  starLoginAdapter,
} from '../../helpers/starAuthAdapter';
import {
  starGetWechatQRCode,
  starCheckWechatLoginStatus,
  starWechatBind,
  setStarAuthCookies,
} from '../../helpers/starApi';
import { Button, Card, Form, Input, Radio, Spin } from '@douyinfe/semi-ui';
import Title from '@douyinfe/semi-ui/lib/es/typography/title';
import Text from '@douyinfe/semi-ui/lib/es/typography/text';
import { IconEyeOpened, IconEyeClosed, IconMail, IconLock } from '@douyinfe/semi-icons';
import LogoImage from '../common/logo/LogoImage';
import HeroBackground from '../homepage/HeroBackground';

const StarLoginForm = () => {
  let navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isDark, setIsDark] = useState(false);
  const [isWechatLogoHovered, setIsWechatLogoHovered] = useState(false);
  
  // 从 URL 参数获取 aff 码并保存到 localStorage
  useEffect(() => {
    const affCode = searchParams.get('aff');
    if (affCode) {
      localStorage.setItem('aff', affCode);
    }
  }, [searchParams]);

  useEffect(() => {
    // 检测dark模式
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    // 监听dark模式变化
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);
  // 移动端默认使用账号密码登录
  const [loginMethod, setLoginMethod] = useState(() => {
    // 检测是否为移动端
    const isMobile = window.innerWidth < 640; // sm breakpoint
    return isMobile ? 'email' : 'email'; // 默认都是账号登录
  }); // 'email' 或 'wechat'
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [userState, userDispatch] = useContext(UserContext);
  const formApiRef = useRef(null);
  
  // 微信登录相关状态
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrTicket, setQrTicket] = useState('');
  const [qrStatus, setQrStatus] = useState('loading'); // 'loading', 'active', 'scanned', 'expired'
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [isWechatBinding, setIsWechatBinding] = useState(false);
  
  // 使用 useRef 存储定时器，避免不必要的重渲染和闭包问题
  const qrCheckIntervalRef = useRef(null);
  const qrTimeoutRef = useRef(null);
  const pollingCountRef = useRef(0); // 轮询次数，用于动态调整间隔
  
  // 标签按钮的 ref
  const wechatButtonRef = useRef(null);
  const emailButtonRef = useRef(null);
  const tabContainerRef = useRef(null);
  const [activeUnderlineStyle, setActiveUnderlineStyle] = useState({});

  const logo = getLogo();
  const systemName = getSystemName();

  // 停止轮询和清理定时器
  const stopPolling = () => {
    if (qrCheckIntervalRef.current) {
      // 支持 clearInterval 和 clearTimeout（因为可能使用 setTimeout）
      if (typeof qrCheckIntervalRef.current === 'number') {
        clearTimeout(qrCheckIntervalRef.current);
      } else {
        clearInterval(qrCheckIntervalRef.current);
      }
      qrCheckIntervalRef.current = null;
    }
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }
    pollingCountRef.current = 0;
  };

  // 获取微信二维码
  const fetchWechatQRCode = async () => {
    setIsLoadingQR(true);
    setQrStatus('loading');
    // 清除之前的轮询和超时
    stopPolling();
    
    try {
      const res = await starGetWechatQRCode('login');
      if (res.success && res.data) {
        // 字段名是 qr_code_url，不是 qr_url
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
          }, 2 * 60 * 1000); // 2分钟
        } else {
          setQrStatus('expired');
        }
      } else {
        setQrStatus('expired');
      }
    } catch (error) {
      setQrStatus('expired');
    } finally {
      setIsLoadingQR(false);
    }
  };

  // 检查微信登录状态
  const checkWechatLoginStatus = async () => {
    // 如果正在进行微信绑定流程，跳过此次轮询
    if (isWechatBinding) {
      return;
    }
    
    if (!qrTicket) {
      stopPolling();
      return;
    }
    
    try {
      // 从 URL 参数或 localStorage 获取 aff 码（只有在自动注册新用户时才生效）
      const affCode = searchParams.get('aff') || localStorage.getItem('aff') || null;
      const res = await starCheckWechatLoginStatus(qrTicket, affCode);
      if (res.success && res.data) {
        // 后端已经统一处理了登录流程
        // 如果返回了用户数据（包含 id 字段），说明登录成功
        // setupLogin 返回的数据结构包含：id, username, display_name, role, status, group, email, quota 等
        if (res.data && res.data.id !== undefined && res.data.id !== null) {
          // 登录成功，设置用户数据
          // 注意：后端已经通过 setupLogin 设置了 session（new-api 的鉴权方式）
          // 这里只需要保存用户信息到 localStorage，前端就能正确识别为已登录
          const userData = res.data;
          stopPolling(); // 停止轮询和超时
          userDispatch({ type: 'login', payload: userData });
          setUserData(userData);
          updateAPI();
          showSuccess(t('登录成功！'));
          navigate('/console');
          return;
        }
        
        // 如果需要2FA验证
        if (res.data.require_2fa) {
          // TODO: 处理2FA
          showError(t('暂不支持2FA验证'));
          stopPolling();
          return;
        }
        
        // 如果返回了 wechat_temp_token，说明已扫码但后端正在处理绑定
        if (res.data.wechat_temp_token) {
          setQrStatus('scanned');
          // 继续轮询，等待后端处理完成
          pollingCountRef.current++;
          return;
        }
        
        // 其他情况（未扫码或处理中），继续轮询
        pollingCountRef.current++;
      } else if (res.message && (res.message.includes('过期') || res.message.includes('已过期'))) {
        setQrStatus('expired');
        stopPolling();
      } else {
        // 没有数据但也没有错误，可能是未扫码，继续轮询
        pollingCountRef.current++;
      }
    } catch (error) {
      // 如果是过期错误，更新状态
      if (error.message && (error.message.includes('过期') || error.message.includes('已过期'))) {
        setQrStatus('expired');
        stopPolling();
      } else {
        // 其他错误，增加轮询计数，但不停止轮询（可能是网络问题）
        pollingCountRef.current++;
        // 如果连续失败次数过多，可以考虑停止轮询
        if (pollingCountRef.current > 60) { // 2分钟 * 30次/分钟 = 60次
          setQrStatus('expired');
          stopPolling();
        }
      }
    }
  };

  // 切换登录方式
  const handleLoginMethodChange = (method) => {
    setLoginMethod(method);
    if (method === 'wechat') {
      fetchWechatQRCode();
      // 注意：轮询会在获取到 ticket 后自动开始
    } else {
      // 停止轮询
      stopPolling();
    }
    // 更新下划线位置
    updateUnderlinePosition(method);
  };

  // 更新下划线位置（使用 useCallback 优化）
  const updateUnderlinePosition = useCallback((method) => {
    const buttonRef = method === 'wechat' ? wechatButtonRef : emailButtonRef;
    if (buttonRef.current && tabContainerRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const containerRect = tabContainerRef.current.getBoundingClientRect();
      const left = rect.left - containerRect.left;
      const width = rect.width;
      setActiveUnderlineStyle({
        left: `${left}px`,
        width: `${width}px`,
      });
    }
  }, []);

  // 防抖函数（使用 useRef 存储 timeout，避免闭包问题）
  const debounceTimeoutRef = useRef(null);
  const debouncedUpdateUnderline = useCallback((method) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      updateUnderlinePosition(method);
    }, 150);
  }, [updateUnderlinePosition]);

  // 响应式更新下划线位置
  useEffect(() => {
    // 延迟执行以确保 DOM 已渲染
    const timer = setTimeout(() => {
      updateUnderlinePosition(loginMethod);
    }, 0);

    // 窗口大小改变时更新下划线位置（防抖处理）
    const handleResize = () => {
      debouncedUpdateUnderline(loginMethod);
    };

    window.addEventListener('resize', handleResize);

    // 使用 ResizeObserver 监听容器大小变化
    let resizeObserver = null;
    if (tabContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateUnderlinePosition(loginMethod);
      });
      resizeObserver.observe(tabContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [loginMethod, updateUnderlinePosition, debouncedUpdateUnderline]);

  // 账号登录（支持用户名和邮箱）
  const handleEmailLogin = async (values) => {
    // 防止重复调用
    if (isLoggingIn) {
      console.log('Login already in progress, skipping...');
      return;
    }
    
    console.log('handleEmailLogin called with values:', values);
    const { usernameOrEmail, password } = values || {};
    
    if (!usernameOrEmail || !password) {
      showError(t('请填写完整的登录信息'));
      return;
    }
    
    setIsLoggingIn(true);
    try {
      // 从 URL 参数或 localStorage 获取 aff 码（只有在自动注册新用户时才生效）
      const affCode = searchParams.get('aff') || localStorage.getItem('aff') || null;
      console.log('Calling starLoginAdapter with:', { usernameOrEmail, password, affCode });
      const res = await starLoginAdapter(usernameOrEmail, password, affCode);
      if (res.success && res.data) {
        // 检查是否需要2FA验证
        if (res.data.require_2fa) {
          // TODO: 处理2FA
          showError(t('暂不支持2FA验证'));
          return;
        }

        userDispatch({ type: 'login', payload: res.data });
        setUserData(res.data);
        updateAPI();
        showSuccess(t('登录成功！'));
        navigate('/console');
      } else {
        // 优化错误提示
        let errorMessage = res.message || '';
        
        // 解析后端返回的错误信息，提取更友好的提示
        if (errorMessage.includes('账号或密码错误') || errorMessage.includes('account or password error') || 
            errorMessage.includes('invalid credentials') || errorMessage.includes('wrong password')) {
          errorMessage = t('账号或密码错误，请检查后重试');
        } else if (errorMessage.includes('外部登录验证失败') || errorMessage.includes('external login failed')) {
          // 尝试从错误信息中提取更具体的错误
          const match = errorMessage.match(/msg=([^,]+)/);
          if (match && match[1]) {
            errorMessage = t(match[1].trim()) || match[1].trim();
          } else {
            errorMessage = t('登录验证失败，请检查账号和密码');
          }
        } else if (errorMessage.includes('账号不存在') || errorMessage.includes('用户不存在') || 
                   errorMessage.includes('account not found') || errorMessage.includes('user not found')) {
          errorMessage = t('账号不存在，请检查用户名或邮箱');
        } else if (errorMessage.includes('密码错误') || errorMessage.includes('password error') || 
                   errorMessage.includes('incorrect password')) {
          errorMessage = t('密码错误，请重新输入');
        } else if (errorMessage.includes('账号已被禁用') || errorMessage.includes('账号已禁用') || 
                   errorMessage.includes('account disabled') || errorMessage.includes('user disabled')) {
          errorMessage = t('账号已被禁用，请联系管理员');
        } else if (errorMessage.includes('网络') || errorMessage.includes('连接') || 
                   errorMessage.includes('network') || errorMessage.includes('connection') || 
                   errorMessage.includes('fetch failed')) {
          errorMessage = t('网络连接失败，请检查网络后重试');
        } else if (errorMessage.includes('超时') || errorMessage.includes('timeout')) {
          errorMessage = t('请求超时，请稍后重试');
        } else if (errorMessage) {
          // 对于其他未知错误，尝试使用 t() 处理，如果没有翻译键则显示原文
          errorMessage = t(errorMessage) !== errorMessage ? t(errorMessage) : errorMessage;
        } else {
          errorMessage = t('登录失败，请重试');
        }
        
        showError(errorMessage);
      }
    } catch (error) {
      // 处理网络错误或其他异常
      let errorMessage = t('登录失败，请重试');
      if (error.message) {
        if (error.message.includes('网络') || error.message.includes('Network')) {
          errorMessage = t('网络连接失败，请检查网络后重试');
        } else if (error.message.includes('超时') || error.message.includes('timeout')) {
          errorMessage = t('请求超时，请稍后重试');
        }
      }
      showError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 刷新二维码
  const refreshQRCode = () => {
    stopPolling();
    fetchWechatQRCode();
    // 注意：轮询会在获取到 ticket 后自动开始
  };

  // 当获取到 ticket 后，自动开始轮询
  useEffect(() => {
    // 只有在有 ticket 且状态为 active 且没有正在运行的轮询时才启动
    if (qrTicket && qrStatus === 'active' && !qrCheckIntervalRef.current) {
      // 重置轮询计数
      pollingCountRef.current = 0;
      
      // 使用递归 setTimeout 实现动态间隔：前30次每2秒，之后每3秒
      const scheduleNextPoll = () => {
        // 检查是否应该继续轮询
        if (!qrTicket || qrStatus === 'expired') {
          stopPolling();
          return;
        }
        
        const interval = pollingCountRef.current < 30 ? 2000 : 3000;
        qrCheckIntervalRef.current = setTimeout(() => {
          // 在回调中再次检查状态（使用最新的值）
          if (!qrTicket || qrStatus === 'expired') {
            stopPolling();
            return;
          }
          
          // 执行检查
          checkWechatLoginStatus().then(() => {
            // 检查是否应该继续轮询（允许 'active' 和 'scanned' 状态继续轮询）
            if (qrTicket && qrStatus !== 'expired' && qrStatus !== 'loading') {
              scheduleNextPoll(); // 递归调度下一次
            }
          }).catch(() => {
            // 错误处理：如果还有 ticket 且未过期，继续轮询
            if (qrTicket && qrStatus !== 'expired' && qrStatus !== 'loading') {
              scheduleNextPoll();
            }
          });
        }, interval);
      };
      
      // 立即执行一次检查
      checkWechatLoginStatus().then(() => {
        // 开始第一次调度
        if (qrTicket && (qrStatus === 'active' || qrStatus === 'scanned') && !qrCheckIntervalRef.current) {
          scheduleNextPoll();
        }
      }).catch(() => {
        // 即使第一次检查失败，也继续轮询（可能是网络问题）
        if (qrTicket && (qrStatus === 'active' || qrStatus === 'scanned') && !qrCheckIntervalRef.current) {
          scheduleNextPoll();
        }
      });
    }
    
    // 清理函数：只在真正需要清理时才清理（状态变为 expired 或 ticket 被清除）
    return () => {
      // 只有在状态变为 expired 或 ticket 被清除时才清理
      if ((!qrTicket || qrStatus === 'expired') && qrCheckIntervalRef.current) {
        stopPolling();
      }
    };
  }, [qrTicket, qrStatus]);

  useEffect(() => {
    // 组件卸载时清理定时器
    return () => {
      stopPolling();
    };
  }, []);

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
                {t('登录')}
              </Title>
            </div>
            <div className="px-4 sm:px-6 pb-8">

              {/* 登录方式选择 */}
              <div style={{ marginBottom: '24px' }}>
                <div ref={tabContainerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', paddingBottom: '8px' }}>
                  {/* 连续的下划线背景 - 覆盖整个容器宽度 */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      backgroundColor: isDark ? '#374151' : '#e5e7eb',
                    }}
                  ></div>
                  {/* 激活状态的下划线 - 滑动效果 */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      height: '2px',
                      backgroundColor: isDark ? '#f3f4f6' : '#111827',
                      transition: 'left 0.3s ease-in-out, width 0.3s ease-in-out',
                      ...activeUnderlineStyle,
                    }}
                  ></div>
                  <button
                    ref={wechatButtonRef}
                    onClick={() => handleLoginMethodChange('wechat')}
                    style={{
                      position: 'relative',
                      flex: 1,
                      paddingBottom: '0',
                      paddingLeft: '4px',
                      paddingRight: '4px',
                      fontSize: '16px',
                      fontWeight: '500',
                      transition: 'color 0.2s ease-in-out',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'center',
                      color: loginMethod === 'wechat' 
                        ? (isDark ? '#f3f4f6' : '#111827')
                        : (isDark ? '#9ca3af' : '#9ca3af'),
                    }}
                    onMouseEnter={(e) => {
                      if (loginMethod !== 'wechat') {
                        e.currentTarget.style.color = isDark ? '#f3f4f6' : '#111827';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (loginMethod !== 'wechat') {
                        e.currentTarget.style.color = isDark ? '#9ca3af' : '#9ca3af';
                      }
                    }}
                  >
                    <span style={{ whiteSpace: 'nowrap' }}>{t('微信登录')}</span>
                  </button>
                  <button
                    ref={emailButtonRef}
                    onClick={() => handleLoginMethodChange('email')}
                    style={{
                      position: 'relative',
                      flex: 1,
                      paddingBottom: '0',
                      paddingLeft: '4px',
                      paddingRight: '4px',
                      fontSize: '16px',
                      fontWeight: '500',
                      transition: 'color 0.2s ease-in-out',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'center',
                      color: loginMethod === 'email' 
                        ? (isDark ? '#f3f4f6' : '#111827')
                        : (isDark ? '#9ca3af' : '#9ca3af'),
                    }}
                    onMouseEnter={(e) => {
                      if (loginMethod !== 'email') {
                        e.currentTarget.style.color = isDark ? '#f3f4f6' : '#111827';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (loginMethod !== 'email') {
                        e.currentTarget.style.color = isDark ? '#9ca3af' : '#9ca3af';
                      }
                    }}
                  >
                    <span style={{ whiteSpace: 'nowrap' }}>{t('账号登录')}</span>
                  </button>
                </div>
              </div>

              {/* 内容区域 - 设置固定高度避免切换时拉伸 */}
              <div style={{ position: 'relative', height: '340px' }}>
          {/* 微信二维码登录 */}
          {loginMethod === 'wechat' && (
            <div className="space-y-4">
              <div className="text-center">
                <Text className="text-gray-600 dark:text-gray-400 mb-8 text-sm sm:text-base max-w-xs mx-auto px-2 leading-relaxed">
                  {t('使用微信扫描下方二维码即可快速登录')}
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
                            alt={t('微信登录二维码')}
                            className="w-40 h-40 sm:w-48 sm:h-48 rounded-lg object-contain"
                            style={{ display: 'block' }}
                          />
                          {isWechatBinding && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
                              <div className="text-center text-white">
                                <Spin size="large" />
                                <Text className="text-white mt-2">{t('登录中...')}</Text>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : qrStatus === 'scanned' ? (
                      <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl shadow-sm">
                        <div className="text-center px-2">
                          <Text className="text-green-600 dark:text-green-400 text-sm sm:text-base">{t('扫码成功')}</Text>
                          <Text className="text-green-500 dark:text-green-500 text-xs">{t('正在登录中...')}</Text>
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
              {(
                <div className="text-center space-y-3">
                  <Button
                    size="small"
                    onClick={refreshQRCode}
                    disabled={isLoadingQR || qrStatus === 'loading'}
                  >
                    {isLoadingQR ? <Spin /> : t('刷新二维码')}
                  </Button>
                  <div className="flex justify-center pt-3">
                    <div
                      className="cursor-pointer transition-all duration-300 ease-in-out"
                      style={{
                        transform: isWechatLogoHovered ? 'scale(1.1)' : 'scale(1)',
                        filter: isWechatLogoHovered 
                          ? 'drop-shadow(0 4px 8px rgba(7, 193, 96, 0.4))' 
                          : 'drop-shadow(0 2px 4px rgba(7, 193, 96, 0.2))',
                      }}
                      onMouseEnter={() => setIsWechatLogoHovered(true)}
                      onMouseLeave={() => setIsWechatLogoHovered(false)}
                      onClick={(e) => {
                        // 点击时的缩放动画
                        e.currentTarget.style.transform = 'scale(0.95)';
                        setTimeout(() => {
                          e.currentTarget.style.transform = isWechatLogoHovered ? 'scale(1.1)' : 'scale(1)';
                        }, 150);
                        // 可以添加点击事件，比如打开微信官网等
                      }}
                    >
                      <svg
                        role="img"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-8 h-8 transition-all duration-300"
                        style={{ 
                          fill: isWechatLogoHovered ? '#06AD56' : '#07C160',
                        }}
                      >
                        <title>WeChat</title>
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

              {/* 账号登录（支持用户名和邮箱） */}
              {loginMethod === 'email' && (
                <Form 
                  className="space-y-3" 
                  getFormApi={(formApi) => { formApiRef.current = formApi; }}
                  onSubmit={async (values) => {
                    if (!formApiRef.current) {
                      showError(t('表单未初始化'));
                      return;
                    }
                    // 防止重复提交
                    if (isLoggingIn) {
                      return;
                    }
                    try {
                      const validatedValues = await formApiRef.current.validate();
                      await handleEmailLogin(validatedValues);
                    } catch (errors) {
                      // 验证失败，Semi Design 会自动显示错误信息
                    }
                  }}
                >
                  <Form.Input
                    field="usernameOrEmail"
                    label={t('用户名或邮箱')}
                    placeholder={t('请输入您的用户名或邮箱地址')}
                    rules={[{ required: true, message: t('请输入用户名或邮箱') }]}
                    size="large"
                    className="!rounded-lg"
                    prefix={<IconMail />}
                  />
                  <Form.Input
                    field="password"
                    label={t('密码')}
                    mode="password"
                    placeholder={t('请输入您的密码')}
                    rules={[{ required: true, message: t('请输入密码') }]}
                    size="large"
                    className="!rounded-lg"
                    prefix={<IconLock />}
                    onPressEnter={async () => {
                      if (!formApiRef.current) {
                        showError(t('表单未初始化'));
                        return;
                      }
                      // 防止重复提交
                      if (isLoggingIn) {
                        return;
                      }
                      try {
                        const values = await formApiRef.current.validate();
                        await handleEmailLogin(values);
                      } catch (errors) {
                        // 验证失败，Semi Design 会自动显示错误信息
                      }
                    }}
                  />
                  <div className="space-y-2 pt-2">
                    <Button
                      theme="solid"
                      type="primary"
                      className="w-full !rounded-full transition-colors auth-page-button-black"
                      style={{
                        backgroundColor: 'black',
                        color: 'white',
                        borderColor: 'black',
                      }}
                      loading={isLoggingIn}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!formApiRef.current) {
                          showError(t('表单未初始化'));
                          return;
                        }
                        // 防止重复提交
                        if (isLoggingIn) {
                          return;
                        }
                        try {
                          const values = await formApiRef.current.validate();
                          await handleEmailLogin(values);
                        } catch (errors) {
                          // 验证失败，Semi Design 会自动显示错误信息
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = '#1f2937';
                          e.currentTarget.style.borderColor = '#1f2937';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = 'black';
                          e.currentTarget.style.borderColor = 'black';
                        }
                      }}
                    >
                      {t('登录')}
                    </Button>
                  </div>
                </Form>
              )}

              {/* 底部链接 */}
              {loginMethod === 'email' && (
                <div className="text-center mt-6 text-sm">
                  <Text className="auth-page-link-text">
                    <Link
                      to={`/reset${searchParams.toString() ? '?' + searchParams.toString() : ''}`}
                      className="auth-page-link font-medium"
                    >
                      {t('找回密码')}
                    </Link>
                  </Text>
                  <div className="mt-2">
                    <Text className="auth-page-link-text">
                      {t('没有账户？')}{' '}
                      <Link
                        to={`/register${searchParams.toString() ? '?' + searchParams.toString() : ''}`}
                        className="auth-page-link font-medium"
                      >
                        {t('注册')}
                      </Link>
                    </Text>
                  </div>
                </div>
              )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StarLoginForm;

