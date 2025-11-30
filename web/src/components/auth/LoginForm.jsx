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

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserContext } from '../../context/User';
import {
  API,
  getLogo,
  showError,
  showInfo,
  showSuccess,
  updateAPI,
  getSystemName,
  setUserData,
  onGitHubOAuthClicked,
  onDiscordOAuthClicked,
  onOIDCClicked,
  onLinuxDOOAuthClicked,
  prepareCredentialRequestOptions,
  buildAssertionResult,
  isPasskeySupported,
  getWeChatQRCode,
  checkWeChatQRStatus,
  wechatQRBind,
} from '../../helpers';
import Turnstile from 'react-turnstile';
import { Button, Card, Checkbox, Divider, Form, Icon, Modal } from '@douyinfe/semi-ui';
import Title from '@douyinfe/semi-ui/lib/es/typography/title';
import Text from '@douyinfe/semi-ui/lib/es/typography/text';
import TelegramLoginButton from 'react-telegram-login';

import {
  IconGithubLogo,
  IconMail,
  IconLock,
  IconKey,
} from '@douyinfe/semi-icons';
import OIDCIcon from '../common/logo/OIDCIcon';
import WeChatIcon from '../common/logo/WeChatIcon';
import LinuxDoIcon from '../common/logo/LinuxDoIcon';
import LogoImage from '../common/logo/LogoImage';
import TwoFAVerification from './TwoFAVerification';
import { useTranslation } from 'react-i18next';
import { SiDiscord } from 'react-icons/si';
import HeroBackground from '../homepage/HeroBackground';

const LoginForm = () => {
  let navigate = useNavigate();
  const { t } = useTranslation();
  const [inputs, setInputs] = useState({
    username: '',
    password: '',
    wechat_verification_code: '',
  });
  const { username, password } = inputs;
  const [searchParams, setSearchParams] = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [userState, userDispatch] = useContext(UserContext);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [showWeChatLoginModal, setShowWeChatLoginModal] = useState(false);
  const [showWeChatQRLoginModal, setShowWeChatQRLoginModal] = useState(false);
  const [showWeChatMethodSelect, setShowWeChatMethodSelect] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [wechatQRCodeUrl, setWechatQRCodeUrl] = useState('');
  const [wechatQRTicket, setWechatQRTicket] = useState('');
  const [wechatQRStatus, setWechatQRStatus] = useState('loading'); // loading, active, expired, scanned
  const [wechatQRPolling, setWechatQRPolling] = useState(false);
  const wechatQRPollingIntervalRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [oidcLoading, setOidcLoading] = useState(false);
  const [linuxdoLoading, setLinuxdoLoading] = useState(false);
  const [emailLoginLoading, setEmailLoginLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [otherLoginOptionsLoading, setOtherLoginOptionsLoading] =
    useState(false);
  const [wechatCodeSubmitLoading, setWechatCodeSubmitLoading] = useState(false);
  const [showTwoFA, setShowTwoFA] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasUserAgreement, setHasUserAgreement] = useState(false);
  const [hasPrivacyPolicy, setHasPrivacyPolicy] = useState(false);
  const [githubButtonText, setGithubButtonText] = useState('使用 GitHub 继续');
  const [githubButtonDisabled, setGithubButtonDisabled] = useState(false);
  const githubTimeoutRef = useRef(null);

  const logo = getLogo();
  const systemName = getSystemName();

  let affCode = new URLSearchParams(window.location.search).get('aff');
  if (affCode) {
    localStorage.setItem('aff', affCode);
  }

  const [status] = useState(() => {
    const savedStatus = localStorage.getItem('status');
    return savedStatus ? JSON.parse(savedStatus) : {};
  });

  useEffect(() => {
    if (status.turnstile_check) {
      setTurnstileEnabled(true);
      setTurnstileSiteKey(status.turnstile_site_key);
    }

    // 从 status 获取用户协议和隐私政策的启用状态
    setHasUserAgreement(status.user_agreement_enabled || false);
    setHasPrivacyPolicy(status.privacy_policy_enabled || false);
  }, [status]);

  useEffect(() => {
    isPasskeySupported()
      .then(setPasskeySupported)
      .catch(() => setPasskeySupported(false));

    return () => {
      if (githubTimeoutRef.current) {
        clearTimeout(githubTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (searchParams.get('expired')) {
      showError(t('未登录或登录已过期，请重新登录'));
    }
  }, []);

  // 检测暗色模式
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    // 监听暗色模式变化
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  const onWeChatLoginClicked = () => {
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showInfo(t('请先阅读并同意用户协议和隐私政策'));
      return;
    }
    setWechatLoading(true);
    // 如果两种方式都配置了，显示选择界面
    // 否则直接使用已配置的方式
    const hasQRCode = status.wechat_app_id;
    const hasVerificationCode = status.wechat_server_address;
    
    if (hasQRCode && hasVerificationCode) {
      // 两种方式都配置了，显示选择界面
      setShowWeChatMethodSelect(true);
    } else if (hasQRCode) {
      // 只配置了二维码登录
      setShowWeChatQRLoginModal(true);
      fetchWeChatQRCode();
    } else if (hasVerificationCode) {
      // 只配置了验证码登录
      setShowWeChatLoginModal(true);
    } else {
      showError(t('微信登录未配置，请联系管理员'));
    }
    setWechatLoading(false);
  };

  // 获取微信二维码
  const fetchWeChatQRCode = async () => {
    setWechatQRStatus('loading');
    setWechatQRCodeUrl('');
    setWechatQRTicket('');

    // 清除之前的轮询
    if (wechatQRPollingIntervalRef.current) {
      clearInterval(wechatQRPollingIntervalRef.current);
      wechatQRPollingIntervalRef.current = null;
    }

    try {
      const data = await getWeChatQRCode();
      setWechatQRCodeUrl(data.qr_code_url);
      setWechatQRTicket(data.ticket);
      setWechatQRStatus('active');
      startWeChatQRPolling(data.ticket);
    } catch (error) {
      showError(error.message || '获取二维码失败');
      setWechatQRStatus('expired');
    }
  };

  // 开始轮询检查二维码状态
  const startWeChatQRPolling = (ticket) => {
    if (wechatQRPollingIntervalRef.current) {
      clearInterval(wechatQRPollingIntervalRef.current);
    }

    setWechatQRPolling(true);
    wechatQRPollingIntervalRef.current = setInterval(async () => {
      try {
        const statusData = await checkWeChatQRStatus(ticket);
        if (statusData) {
          setWechatQRStatus('scanned');
          // 清除轮询
          if (wechatQRPollingIntervalRef.current) {
            clearInterval(wechatQRPollingIntervalRef.current);
            wechatQRPollingIntervalRef.current = null;
          }

          if (statusData.user_id) {
            // 老用户，后端已经设置了 session，获取用户信息并登录
            try {
              const res = await API.get('/api/user/self');
              const { success, data: userData } = res.data;
              if (success) {
                userDispatch({ type: 'login', payload: userData });
                setUserData(userData);
                updateAPI();
                showSuccess('登录成功！');
                setShowWeChatQRLoginModal(false);
                navigate('/console');
              } else {
                // 如果获取失败，刷新页面
                window.location.href = '/console';
              }
            } catch (error) {
              // 如果获取失败，刷新页面
              window.location.href = '/console';
            }
          } else if (statusData.wechat_temp_token) {
            // 新用户，需要绑定
            try {
              const data = await wechatQRBind(statusData.wechat_temp_token, false);
              userDispatch({ type: 'login', payload: data });
              setUserData(data);
              updateAPI();
              showSuccess('登录成功！');
              setShowWeChatQRLoginModal(false);
              navigate('/console');
            } catch (error) {
              showError(error.message || '登录失败');
              setWechatQRStatus('expired');
            }
          }
        }
      } catch (error) {
        if (error.message?.includes('二维码已过期')) {
          setWechatQRStatus('expired');
          if (wechatQRPollingIntervalRef.current) {
            clearInterval(wechatQRPollingIntervalRef.current);
            wechatQRPollingIntervalRef.current = null;
          }
        }
      } finally {
        setWechatQRPolling(false);
      }
    }, 2000); // 每2秒检查一次
  };

  // 清理轮询
  useEffect(() => {
    return () => {
      if (wechatQRPollingIntervalRef.current) {
        clearInterval(wechatQRPollingIntervalRef.current);
      }
    };
  }, []);

  const onSubmitWeChatVerificationCode = async () => {
    if (turnstileEnabled && turnstileToken === '') {
      showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
      return;
    }
    setWechatCodeSubmitLoading(true);
    try {
      const res = await API.get(
        `/api/oauth/wechat?code=${inputs.wechat_verification_code}`,
      );
      const { success, message, data } = res.data;
      if (success) {
        userDispatch({ type: 'login', payload: data });
        localStorage.setItem('user', JSON.stringify(data));
        setUserData(data);
        updateAPI();
        navigate('/');
        showSuccess('登录成功！');
        setShowWeChatLoginModal(false);
      } else {
        showError(message);
      }
    } catch (error) {
      showError('登录失败，请重试');
    } finally {
      setWechatCodeSubmitLoading(false);
    }
  };

  function handleChange(name, value) {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  }

  async function handleSubmit(e) {
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showInfo(t('请先阅读并同意用户协议和隐私政策'));
      return;
    }
    if (turnstileEnabled && turnstileToken === '') {
      showInfo('请稍后几秒重试，Turnstile 正在检查用户环境！');
      return;
    }
    setSubmitted(true);
    setLoginLoading(true);
    try {
      if (username && password) {
        const res = await API.post(
          `/api/user/login?turnstile=${turnstileToken}`,
          {
            username,
            password,
          },
        );
        const { success, message, data } = res.data;
        if (success) {
          // 检查是否需要2FA验证
          if (data && data.require_2fa) {
            setShowTwoFA(true);
            setLoginLoading(false);
            return;
          }

          userDispatch({ type: 'login', payload: data });
          setUserData(data);
          updateAPI();
          showSuccess('登录成功！');
          if (username === 'root' && password === '123456') {
            Modal.error({
              title: '您正在使用默认密码！',
              content: '请立刻修改默认密码！',
              centered: true,
            });
          }
          navigate('/console');
        } else {
          showError(message);
        }
      } else {
        showError('请输入用户名和密码！');
      }
    } catch (error) {
      showError('登录失败，请重试');
    } finally {
      setLoginLoading(false);
    }
  }

  // 添加Telegram登录处理函数
  const onTelegramLoginClicked = async (response) => {
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showInfo(t('请先阅读并同意用户协议和隐私政策'));
      return;
    }
    const fields = [
      'id',
      'first_name',
      'last_name',
      'username',
      'photo_url',
      'auth_date',
      'hash',
      'lang',
    ];
    const params = {};
    fields.forEach((field) => {
      if (response[field]) {
        params[field] = response[field];
      }
    });
    try {
      const res = await API.get(`/api/oauth/telegram/login`, { params });
      const { success, message, data } = res.data;
      if (success) {
        userDispatch({ type: 'login', payload: data });
        localStorage.setItem('user', JSON.stringify(data));
        showSuccess('登录成功！');
        setUserData(data);
        updateAPI();
        navigate('/');
      } else {
        showError(message);
      }
    } catch (error) {
      showError('登录失败，请重试');
    }
  };

  // 包装的GitHub登录点击处理
  const handleGitHubClick = () => {
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showInfo(t('请先阅读并同意用户协议和隐私政策'));
      return;
    }
    if (githubButtonDisabled) {
      return;
    }
    setGithubLoading(true);
    setGithubButtonDisabled(true);
    setGithubButtonText(t('正在跳转 GitHub...'));
    if (githubTimeoutRef.current) {
      clearTimeout(githubTimeoutRef.current);
    }
    githubTimeoutRef.current = setTimeout(() => {
      setGithubLoading(false);
      setGithubButtonText(t('请求超时，请刷新页面后重新发起 GitHub 登录'));
      setGithubButtonDisabled(true);
    }, 20000);
    try {
      onGitHubOAuthClicked(status.github_client_id);
    } finally {
      // 由于重定向，这里不会执行到，但为了完整性添加
      setTimeout(() => setGithubLoading(false), 3000);
    }
  };

  // 包装的Discord登录点击处理
  const handleDiscordClick = () => {
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showInfo(t('请先阅读并同意用户协议和隐私政策'));
      return;
    }
    setDiscordLoading(true);
    try {
      onDiscordOAuthClicked(status.discord_client_id);
    } finally {
      // 由于重定向，这里不会执行到，但为了完整性添加
      setTimeout(() => setDiscordLoading(false), 3000);
    }
  };

  // 包装的OIDC登录点击处理
  const handleOIDCClick = () => {
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showInfo(t('请先阅读并同意用户协议和隐私政策'));
      return;
    }
    setOidcLoading(true);
    try {
      onOIDCClicked(status.oidc_authorization_endpoint, status.oidc_client_id);
    } finally {
      // 由于重定向，这里不会执行到，但为了完整性添加
      setTimeout(() => setOidcLoading(false), 3000);
    }
  };

  // 包装的LinuxDO登录点击处理
  const handleLinuxDOClick = () => {
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showInfo(t('请先阅读并同意用户协议和隐私政策'));
      return;
    }
    setLinuxdoLoading(true);
    try {
      onLinuxDOOAuthClicked(status.linuxdo_client_id);
    } finally {
      // 由于重定向，这里不会执行到，但为了完整性添加
      setTimeout(() => setLinuxdoLoading(false), 3000);
    }
  };

  // 包装的邮箱登录选项点击处理
  const handleEmailLoginClick = () => {
    setEmailLoginLoading(true);
    setShowEmailLogin(true);
    setEmailLoginLoading(false);
  };

  const handlePasskeyLogin = async () => {
    if ((hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms) {
      showInfo(t('请先阅读并同意用户协议和隐私政策'));
      return;
    }
    if (!passkeySupported) {
      showInfo('当前环境无法使用 Passkey 登录');
      return;
    }
    if (!window.PublicKeyCredential) {
      showInfo('当前浏览器不支持 Passkey');
      return;
    }

    setPasskeyLoading(true);
    try {
      const beginRes = await API.post('/api/user/passkey/login/begin');
      const { success, message, data } = beginRes.data;
      if (!success) {
        showError(message || '无法发起 Passkey 登录');
        return;
      }

      const publicKeyOptions = prepareCredentialRequestOptions(
        data?.options || data?.publicKey || data,
      );
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      });
      const payload = buildAssertionResult(assertion);
      if (!payload) {
        showError('Passkey 验证失败，请重试');
        return;
      }

      const finishRes = await API.post(
        '/api/user/passkey/login/finish',
        payload,
      );
      const finish = finishRes.data;
      if (finish.success) {
        userDispatch({ type: 'login', payload: finish.data });
        setUserData(finish.data);
        updateAPI();
        showSuccess('登录成功！');
        navigate('/console');
      } else {
        showError(finish.message || 'Passkey 登录失败，请重试');
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        showInfo('已取消 Passkey 登录');
      } else {
        showError('Passkey 登录失败，请重试');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  // 包装的重置密码点击处理
  const handleResetPasswordClick = () => {
    setResetPasswordLoading(true);
    navigate('/reset');
    setResetPasswordLoading(false);
  };

  // 包装的其他登录选项点击处理
  const handleOtherLoginOptionsClick = () => {
    setOtherLoginOptionsLoading(true);
    setShowEmailLogin(false);
    setOtherLoginOptionsLoading(false);
  };

  // 2FA验证成功处理
  const handle2FASuccess = (data) => {
    userDispatch({ type: 'login', payload: data });
    setUserData(data);
    updateAPI();
    showSuccess('登录成功！');
    navigate('/console');
  };

  // 返回登录页面
  const handleBackToLogin = () => {
    setShowTwoFA(false);
    setInputs({ username: '', password: '', wechat_verification_code: '' });
  };

  const renderOAuthOptions = () => {
    return (
      <div className='flex flex-col items-center'>
        <div className='w-full max-w-md'>
          <div className='flex items-center justify-center mb-6 gap-2'>
            <LogoImage src={logo} alt='Logo' className='h-10 rounded-full' />
            <Title heading={3} className={`!text-gray-800 ${systemName === 'NiceRouter' ? '!italic' : ''}`}>
              {systemName}
            </Title>
          </div>

          <Card className='border-0 !rounded-2xl overflow-hidden'>
            <div className='flex justify-center pt-6 pb-2'>
              <Title heading={3} className='text-gray-800 dark:text-gray-200'>
                {t('登 录')}
              </Title>
            </div>
            <div className='px-2 py-8'>
              <div className='space-y-3'>
                {status.wechat_login && (
                  <Button
                    theme='outline'
                    className='w-full h-12 flex items-center justify-center !rounded-full border border-gray-200 hover:bg-gray-50 transition-colors'
                    type='tertiary'
                    icon={
                      <Icon svg={<WeChatIcon />} style={{ color: '#07C160' }} />
                    }
                    onClick={onWeChatLoginClicked}
                    loading={wechatLoading}
                  >
                    <span className='ml-3'>{t('使用 微信 继续')}</span>
                  </Button>
                )}

                {status.github_oauth && (
                  <Button
                    theme='outline'
                    className='w-full h-12 flex items-center justify-center !rounded-full border border-gray-200 hover:bg-gray-50 transition-colors'
                    type='tertiary'
                    icon={<IconGithubLogo size='large' />}
                    onClick={handleGitHubClick}
                    loading={githubLoading}
                    disabled={githubButtonDisabled}
                  >
                    <span className='ml-3'>{githubButtonText}</span>
                  </Button>
                )}

                {status.discord_oauth && (
                  <Button
                    theme='outline'
                    className='w-full h-12 flex items-center justify-center !rounded-full border border-gray-200 hover:bg-gray-50 transition-colors'
                    type='tertiary'
                    icon={<SiDiscord style={{ color: '#5865F2', width: '20px', height: '20px' }} />}
                    onClick={handleDiscordClick}
                    loading={discordLoading}
                  >
                    <span className='ml-3'>{t('使用 Discord 继续')}</span>
                  </Button>
                )}

                {status.oidc_enabled && (
                  <Button
                    theme='outline'
                    className='w-full h-12 flex items-center justify-center !rounded-full border border-gray-200 hover:bg-gray-50 transition-colors'
                    type='tertiary'
                    icon={<OIDCIcon style={{ color: '#1877F2' }} />}
                    onClick={handleOIDCClick}
                    loading={oidcLoading}
                  >
                    <span className='ml-3'>{t('使用 OIDC 继续')}</span>
                  </Button>
                )}

                {status.linuxdo_oauth && (
                  <Button
                    theme='outline'
                    className='w-full h-12 flex items-center justify-center !rounded-full border border-gray-200 hover:bg-gray-50 transition-colors'
                    type='tertiary'
                    icon={
                      <LinuxDoIcon
                        style={{
                          color: '#E95420',
                          width: '20px',
                          height: '20px',
                        }}
                      />
                    }
                    onClick={handleLinuxDOClick}
                    loading={linuxdoLoading}
                  >
                    <span className='ml-3'>{t('使用 LinuxDO 继续')}</span>
                  </Button>
                )}

                {status.telegram_oauth && (
                  <div className='flex justify-center my-2'>
                    <TelegramLoginButton
                      dataOnauth={onTelegramLoginClicked}
                      botName={status.telegram_bot_name}
                    />
                  </div>
                )}

                {status.passkey_login && passkeySupported && (
                  <Button
                    theme='outline'
                    className='w-full h-12 flex items-center justify-center !rounded-full border border-gray-200 hover:bg-gray-50 transition-colors'
                    type='tertiary'
                    icon={<IconKey size='large' />}
                    onClick={handlePasskeyLogin}
                    loading={passkeyLoading}
                  >
                    <span className='ml-3'>{t('使用 Passkey 登录')}</span>
                  </Button>
                )}

                <Divider margin='12px' align='center'>
                  {t('或')}
                </Divider>

                <Button
                  theme='solid'
                  type='primary'
                  className='w-full h-12 flex items-center justify-center !rounded-full transition-colors auth-page-button-black'
                  style={{
                    backgroundColor: 'black',
                    color: 'white',
                    borderColor: 'black',
                  }}
                  icon={<IconMail size='large' />}
                  onClick={handleEmailLoginClick}
                  loading={emailLoginLoading}
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
                  <span className='ml-3'>{t('使用 邮箱或用户名 登录')}</span>
                </Button>
              </div>

              {(hasUserAgreement || hasPrivacyPolicy) && (
                <div className='mt-6'>
                  <Checkbox
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                  >
                    <Text size='small' className='text-gray-600'>
                      {t('我已阅读并同意')}
                      {hasUserAgreement && (
                        <>
                          <a
                            href='/user-agreement'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-blue-600 hover:text-blue-800 mx-1'
                          >
                            {t('用户协议')}
                          </a>
                        </>
                      )}
                      {hasUserAgreement && hasPrivacyPolicy && t('和')}
                      {hasPrivacyPolicy && (
                        <>
                          <a
                            href='/privacy-policy'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-blue-600 hover:text-blue-800 mx-1'
                          >
                            {t('隐私政策')}
                          </a>
                        </>
                      )}
                    </Text>
                  </Checkbox>
                </div>
              )}

              {!status.self_use_mode_enabled && (
                <div className='mt-6 text-center text-sm'>
                  <Text className='auth-page-link-text'>
                    {t('没有账户？')}{' '}
                    <Link
                      to='/register'
                      className='auth-page-link font-medium'
                    >
                      {t('注册')}
                    </Link>
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderEmailLoginForm = () => {
    return (
      <div className='flex flex-col items-center'>
        <div className='w-full max-w-md'>
          <div className='flex items-center justify-center mb-6 gap-2'>
            <LogoImage src={logo} alt='Logo' className='h-10 rounded-full' />
            <Title heading={3} className={systemName === 'NiceRouter' ? '!italic' : ''}>{systemName}</Title>
          </div>

          <Card className='border-0 !rounded-2xl overflow-hidden'>
            <div className='flex justify-center pt-6 pb-2'>
              <Title heading={3} className='text-gray-800 dark:text-gray-200'>
                {t('登 录')}
              </Title>
            </div>
            <div className='px-2 py-8'>
              {status.passkey_login && passkeySupported && (
                <Button
                  theme='outline'
                  type='tertiary'
                  className='w-full h-12 flex items-center justify-center !rounded-full border border-gray-200 hover:bg-gray-50 transition-colors mb-4'
                  icon={<IconKey size='large' />}
                  onClick={handlePasskeyLogin}
                  loading={passkeyLoading}
                >
                  <span className='ml-3'>{t('使用 Passkey 登录')}</span>
                </Button>
              )}
              <Form className='space-y-3'>
                <Form.Input
                  field='username'
                  label={t('用户名或邮箱')}
                  placeholder={t('请输入您的用户名或邮箱地址')}
                  name='username'
                  onChange={(value) => handleChange('username', value)}
                  prefix={<IconMail />}
                />

                <Form.Input
                  field='password'
                  label={t('密码')}
                  placeholder={t('请输入您的密码')}
                  name='password'
                  mode='password'
                  onChange={(value) => handleChange('password', value)}
                  prefix={<IconLock />}
                />

                {(hasUserAgreement || hasPrivacyPolicy) && (
                  <div className='pt-4'>
                    <Checkbox
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                    >
                      <Text size='small' className='text-gray-600'>
                        {t('我已阅读并同意')}
                        {hasUserAgreement && (
                          <>
                            <a
                              href='/user-agreement'
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-blue-600 hover:text-blue-800 mx-1'
                            >
                              {t('用户协议')}
                            </a>
                          </>
                        )}
                        {hasUserAgreement && hasPrivacyPolicy && t('和')}
                        {hasPrivacyPolicy && (
                          <>
                            <a
                              href='/privacy-policy'
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-blue-600 hover:text-blue-800 mx-1'
                            >
                              {t('隐私政策')}
                            </a>
                          </>
                        )}
                      </Text>
                    </Checkbox>
                  </div>
                )}

                <div className='space-y-2 pt-2'>
                  <Button
                    theme='solid'
                    className='w-full !rounded-full transition-colors auth-page-button-black'
                    style={{
                      backgroundColor: 'black',
                      color: 'white',
                      borderColor: 'black',
                    }}
                    type='primary'
                    htmlType='submit'
                    onClick={handleSubmit}
                    loading={loginLoading}
                    disabled={(hasUserAgreement || hasPrivacyPolicy) && !agreedToTerms}
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
                    {t('继续')}
                  </Button>

                  <Button
                    theme='borderless'
                    type='tertiary'
                    className='w-full !rounded-full transition-colors auth-page-button-borderless'
                    style={{
                      color: '#111827',
                    }}
                    onClick={handleResetPasswordClick}
                    loading={resetPasswordLoading}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {t('忘记密码？')}
                  </Button>
                </div>
              </Form>

              {(status.github_oauth ||
                status.discord_oauth ||
                status.oidc_enabled ||
                status.wechat_login ||
                status.linuxdo_oauth ||
                status.telegram_oauth) && (
                  <>
                    <Divider margin='12px' align='center'>
                      {t('或')}
                    </Divider>

                    <div className='mt-4 text-center'>
                      <button
                        type='button'
                        className={`w-full h-12 rounded-full border transition-colors ${
                          isDarkMode
                            ? 'border-gray-600 text-gray-200 hover:bg-gray-800 hover:border-gray-500'
                            : 'border-gray-300 text-gray-900 hover:bg-gray-50'
                        } ${otherLoginOptionsLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={handleOtherLoginOptionsClick}
                        disabled={otherLoginOptionsLoading}
                        style={{
                          backgroundColor: 'transparent',
                        }}
                      >
                        {otherLoginOptionsLoading ? (
                          <span className='flex items-center justify-center'>
                            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2'></div>
                            {t('其他登录选项')}
                          </span>
                        ) : (
                          t('其他登录选项')
                        )}
                      </button>
                    </div>
                  </>
                )}

              {!status.self_use_mode_enabled && (
                <div className='mt-6 text-center text-sm'>
                  <Text className='auth-page-link-text'>
                    {t('没有账户？')}{' '}
                    <Link
                      to='/register'
                      className='auth-page-link font-medium'
                    >
                      {t('注册')}
                    </Link>
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // 微信登录模态框（验证码方式）
  const renderWeChatLoginModal = () => {
    return (
      <Modal
        title={t('微信验证码登录')}
        visible={showWeChatLoginModal}
        maskClosable={true}
        onOk={onSubmitWeChatVerificationCode}
        onCancel={() => setShowWeChatLoginModal(false)}
        okText={t('登录')}
        centered={true}
        okButtonProps={{
          loading: wechatCodeSubmitLoading,
        }}
        footer={
          status.wechat_app_id ? (
            <div className='flex justify-between items-center'>
              <Button
                theme='borderless'
                type='tertiary'
                onClick={() => {
                  setShowWeChatLoginModal(false);
                  setShowWeChatQRLoginModal(true);
                  fetchWeChatQRCode();
                }}
              >
                {t('使用二维码登录')}
              </Button>
              <div>
                <Button
                  theme='borderless'
                  type='tertiary'
                  onClick={() => setShowWeChatLoginModal(false)}
                >
                  {t('取消')}
                </Button>
                <Button
                  theme='solid'
                  type='primary'
                  onClick={onSubmitWeChatVerificationCode}
                  loading={wechatCodeSubmitLoading}
                >
                  {t('登录')}
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className='flex flex-col items-center'>
          <img src={status.wechat_qrcode} alt='微信二维码' className='mb-4' />
        </div>

        <div className='text-center mb-4'>
          <p>
            {t('微信扫码关注公众号，输入「验证码」获取验证码（三分钟内有效）')}
          </p>
        </div>

        <Form>
          <Form.Input
            field='wechat_verification_code'
            placeholder={t('验证码')}
            label={t('验证码')}
            value={inputs.wechat_verification_code}
            onChange={(value) =>
              handleChange('wechat_verification_code', value)
            }
          />
        </Form>
      </Modal>
    );
  };

  // 微信二维码登录模态框
  const renderWeChatQRLoginModal = () => {
    return (
      <Modal
        title={t('微信扫码登录')}
        visible={showWeChatQRLoginModal}
        maskClosable={true}
        onCancel={() => {
          setShowWeChatQRLoginModal(false);
          if (wechatQRPollingIntervalRef.current) {
            clearInterval(wechatQRPollingIntervalRef.current);
            wechatQRPollingIntervalRef.current = null;
          }
        }}
        footer={
          status.wechat_server_address ? (
            <div className='text-center'>
              <Button
                theme='borderless'
                type='tertiary'
                onClick={() => {
                  setShowWeChatQRLoginModal(false);
                  if (wechatQRPollingIntervalRef.current) {
                    clearInterval(wechatQRPollingIntervalRef.current);
                    wechatQRPollingIntervalRef.current = null;
                  }
                  setShowWeChatLoginModal(true);
                }}
              >
                {t('使用验证码登录')}
              </Button>
            </div>
          ) : null
        }
        centered={true}
        width={400}
      >
        <div className='flex flex-col items-center py-4'>
          <div className='relative mb-4'>
            {wechatQRStatus === 'loading' && (
              <div className='w-48 h-48 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg'>
                <div className='text-center'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto'></div>
                  <p className='text-sm text-gray-500 mt-2'>生成二维码中...</p>
                </div>
              </div>
            )}
            {wechatQRStatus === 'active' && (
              <div className='relative'>
                <img
                  src={wechatQRCodeUrl}
                  alt='微信登录二维码'
                  className='w-48 h-48 border rounded-lg'
                />
                {wechatQRPolling && (
                  <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg'>
                    <div className='text-center text-white'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto'></div>
                      <p className='text-sm mt-2'>登录中...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {wechatQRStatus === 'scanned' && (
              <div className='w-48 h-48 flex items-center justify-center bg-green-50 border-2 border-green-300 rounded-lg'>
                <div className='text-center'>
                  <div className='w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2'>
                    <svg
                      className='w-6 h-6 text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                  </div>
                  <p className='text-sm text-green-600'>扫码成功</p>
                  <p className='text-xs text-green-500'>正在登录中...</p>
                </div>
              </div>
            )}
            {wechatQRStatus === 'expired' && (
              <div className='w-48 h-48 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg'>
                <div className='text-center'>
                  <p className='text-sm text-gray-500 mb-2'>二维码已过期</p>
                  <Button
                    size='small'
                    theme='solid'
                    onClick={fetchWeChatQRCode}
                  >
                    刷新二维码
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className='text-center space-y-2'>
            <p className='text-sm text-gray-600'>
              {wechatQRStatus === 'active'
                ? '使用微信扫描上方二维码即可登录'
                : wechatQRStatus === 'expired'
                  ? '二维码已过期，请刷新后重试'
                  : '正在生成二维码...'}
            </p>
            {wechatQRStatus === 'active' && (
              <Button
                size='small'
                theme='borderless'
                onClick={fetchWeChatQRCode}
              >
                刷新二维码
              </Button>
            )}
          </div>
        </div>
      </Modal>
    );
  };

  // 微信登录方式选择模态框
  const renderWeChatMethodSelectModal = () => {
    return (
      <Modal
        title={t('选择微信登录方式')}
        visible={showWeChatMethodSelect}
        maskClosable={true}
        onCancel={() => setShowWeChatMethodSelect(false)}
        footer={null}
        centered={true}
        width={400}
      >
        <div className='flex flex-col space-y-3 py-4'>
          {status.wechat_app_id && (
            <Button
              theme='solid'
              type='primary'
              className='w-full h-12'
              onClick={() => {
                setShowWeChatMethodSelect(false);
                setShowWeChatQRLoginModal(true);
                fetchWeChatQRCode();
              }}
            >
              <div className='flex items-center justify-center'>
                <Icon svg={<WeChatIcon />} style={{ color: '#07C160', marginRight: '8px' }} />
                <span>{t('二维码登录')}</span>
              </div>
            </Button>
          )}
          {status.wechat_server_address && (
            <Button
              theme='outline'
              type='tertiary'
              className='w-full h-12'
              onClick={() => {
                setShowWeChatMethodSelect(false);
                setShowWeChatLoginModal(true);
              }}
            >
              <div className='flex items-center justify-center'>
                <Icon svg={<WeChatIcon />} style={{ color: '#07C160', marginRight: '8px' }} />
                <span>{t('验证码登录')}</span>
              </div>
            </Button>
          )}
          <Button
            theme='borderless'
            type='tertiary'
            className='w-full'
            onClick={() => setShowWeChatMethodSelect(false)}
          >
            {t('取消')}
          </Button>
        </div>
      </Modal>
    );
  };

  // 2FA验证弹窗
  const render2FAModal = () => {
    return (
      <Modal
        title={
          <div className='flex items-center'>
            <div className='w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-3'>
              <svg
                className='w-4 h-4 text-green-600 dark:text-green-400'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M6 8a2 2 0 11-4 0 2 2 0 014 0zM8 7a1 1 0 100 2h8a1 1 0 100-2H8zM6 14a2 2 0 11-4 0 2 2 0 014 0zM8 13a1 1 0 100 2h8a1 1 0 100-2H8z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            两步验证
          </div>
        }
        visible={showTwoFA}
        onCancel={handleBackToLogin}
        footer={null}
        width={450}
        centered
      >
        <TwoFAVerification
          onSuccess={handle2FASuccess}
          onBack={handleBackToLogin}
          isModal={true}
        />
      </Modal>
    );
  };

  return (
    <div className='relative overflow-hidden min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
      {/* 首页背景 */}
      <HeroBackground />
      <div className='w-full max-w-sm mt-[60px] relative z-10'>
        {showEmailLogin ||
          !(
            status.github_oauth ||
            status.discord_oauth ||
            status.oidc_enabled ||
            status.wechat_login ||
            status.linuxdo_oauth ||
            status.telegram_oauth
          )
          ? renderEmailLoginForm()
          : renderOAuthOptions()}
        {renderWeChatLoginModal()}
        {renderWeChatQRLoginModal()}
        {renderWeChatMethodSelectModal()}
        {render2FAModal()}

        {turnstileEnabled && (
          <div className='flex justify-center mt-6'>
            <Turnstile
              sitekey={turnstileSiteKey}
              onVerify={(token) => {
                setTurnstileToken(token);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;
