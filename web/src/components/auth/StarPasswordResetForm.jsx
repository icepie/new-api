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

import React, { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getLogo,
  getSystemName,
  showError,
  showSuccess,
} from '../../helpers';
import {
  starResetPasswordAdapter,
  starSendEmailCodeAdapter,
} from '../../helpers/starAuthAdapter';
import { Button, Card, Form, Input } from '@douyinfe/semi-ui';
import Title from '@douyinfe/semi-ui/lib/es/typography/title';
import Text from '@douyinfe/semi-ui/lib/es/typography/text';
import { IconEyeOpened, IconEyeClosed, IconMail, IconLock, IconKey } from '@douyinfe/semi-icons';
import LogoImage from '../common/logo/LogoImage';
import HeroBackground from '../homepage/HeroBackground';

const StarPasswordResetForm = () => {
  let navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const formApiRef = useRef(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 邮箱格式验证
  const validateEmail = (value) => {
    const emailRegex = /^[\w-.+]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!value || emailRegex.test(value)) {
      setEmailError('');
      return true;
    } else {
      setEmailError(t('请输入有效的邮箱地址'));
      return false;
    }
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!validateEmail(email)) return;
    setIsSendingCode(true);
    try {
      const res = await starSendEmailCodeAdapter(email, 'back_password');
      if (res.success) {
        showSuccess(t('验证码已发送，请注意查收'));
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev === 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        const errorMsg = res.message || '';
        if (errorMsg) {
          // 尝试翻译错误消息，如果没有翻译键则显示原文
          showError(t(errorMsg) !== errorMsg ? t(errorMsg) : errorMsg);
        } else {
          showError(t('发送验证码失败'));
        }
      }
    } catch (error) {
      showError(t('发送验证码失败，请重试'));
    } finally {
      setIsSendingCode(false);
    }
  };

  // 重置密码
  const handleResetPassword = async (values) => {
    // 防止重复提交
    if (isResetting) {
      return;
    }
    
    const { email: formEmail, code: formCode, password: formPassword } = values || {};
    
    // 验证邮箱
    if (emailError || !formEmail || !validateEmail(formEmail)) {
      showError(t('请填写有效的邮箱地址'));
      return;
    }
    
    if (!formCode || !formPassword) {
      showError(t('请填写完整的找回密码信息'));
      return;
    }

    setIsResetting(true);
    try {
      const res = await starResetPasswordAdapter(formEmail, formCode, formPassword);
      if (res.success) {
        showSuccess(t('密码重置成功！请使用新密码登录'));
        navigate(`/login${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
      } else {
        // 优化错误提示
        let errorMessage = res.message || '';
        
        // 解析后端返回的错误信息，提取更友好的提示
        if (errorMessage.includes('验证码错误') || errorMessage.includes('验证码不正确') || 
            errorMessage.includes('verification code error') || errorMessage.includes('invalid code')) {
          errorMessage = t('验证码错误，请检查后重试');
        } else if (errorMessage.includes('验证码已过期') || errorMessage.includes('验证码过期') || 
                   errorMessage.includes('code expired') || errorMessage.includes('verification expired')) {
          errorMessage = t('验证码已过期，请重新获取');
        } else if (errorMessage.includes('账号不存在') || errorMessage.includes('用户不存在') || 
                   errorMessage.includes('邮箱不存在') || errorMessage.includes('account not found') || 
                   errorMessage.includes('user not found') || errorMessage.includes('email not found')) {
          errorMessage = t('该邮箱未注册，请检查邮箱地址');
        } else if ((errorMessage.includes('密码') && errorMessage.includes('长度')) || 
                   errorMessage.includes('password length') || errorMessage.includes('password too')) {
          errorMessage = t('密码长度不符合要求，请检查密码规则');
        } else if (errorMessage.includes('邮箱格式') || errorMessage.includes('邮箱无效') || 
                   errorMessage.includes('invalid email') || errorMessage.includes('email format')) {
          errorMessage = t('邮箱格式不正确，请检查邮箱地址');
        } else if (errorMessage) {
          // 对于其他未知错误，尝试使用 t() 处理，如果没有翻译键则显示原文
          errorMessage = t(errorMessage) !== errorMessage ? t(errorMessage) : errorMessage;
        } else {
          errorMessage = t('密码重置失败，请重试');
        }
        
        showError(errorMessage);
      }
    } catch (error) {
      let errorMessage = t('密码重置失败，请重试');
      if (error.message) {
        if (error.message.includes('网络') || error.message.includes('Network')) {
          errorMessage = t('网络连接失败，请检查网络后重试');
        } else if (error.message.includes('超时') || error.message.includes('timeout')) {
          errorMessage = t('请求超时，请稍后重试');
        }
      }
      showError(errorMessage);
    } finally {
      setIsResetting(false);
    }
  };

  const logo = getLogo();
  const systemName = getSystemName();

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

          <Card className="border-0 !rounded-2xl overflow-hidden">
            <div className="flex justify-center pt-6 pb-2">
              <Title heading={3} className="text-gray-800 dark:text-gray-200">
                {t('找回密码')}
              </Title>
            </div>
            <div className="px-2 py-8">
              <Form 
                className="space-y-3" 
                getFormApi={(formApi) => { formApiRef.current = formApi; }}
                onSubmit={handleResetPassword}
              >
                <Form.Input
                  field="email"
                  label={t('邮箱')}
                  type="email"
                  placeholder={t('请输入您的邮箱地址')}
                  value={email}
                  onChange={(value) => {
                    setEmail(value);
                    validateEmail(value);
                  }}
                  onBlur={() => validateEmail(email)}
                  validateStatus={emailError ? 'error' : ''}
                  rules={[{ required: true, message: t('请输入邮箱') }]}
                  size="large"
                  className="!rounded-lg"
                  prefix={<IconMail />}
                />
                {emailError && (
                  <Text className="text-red-500 text-xs mt-1">{emailError}</Text>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <div className="flex-1">
                    <Form.Input
                      field="code"
                      label={t('邮箱验证码')}
                      placeholder={t('请输入验证码')}
                      value={code}
                      onChange={(value) => setCode(value)}
                      rules={[{ required: true, message: t('请输入验证码') }]}
                      size="large"
                      className="!rounded-lg flex-1"
                      prefix={<IconKey />}
                    />
                  </div>
                  <div className="flex items-end sm:pb-[12px]">
                    <Button
                      onClick={handleSendCode}
                      disabled={!!emailError || !email || isSendingCode || countdown > 0}
                      loading={isSendingCode && countdown === 0}
                      size="large"
                      className="!rounded-lg w-full sm:w-auto whitespace-nowrap"
                      type="primary"
                      theme="outline"
                    >
                      {isSendingCode && countdown === 0 ? t('发送中...') : countdown > 0 ? `${t('重新发送')} (${countdown})` : t('获取验证码')}
                    </Button>
                  </div>
                </div>

                <Form.Input
                  field="password"
                  label={t('新密码')}
                  mode="password"
                  placeholder={t('请输入您的新密码')}
                  value={password}
                  onChange={(value) => setPassword(value)}
                  rules={[{ required: true, message: t('请输入新密码') }]}
                  size="large"
                  className="!rounded-lg"
                  prefix={<IconLock />}
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
                    loading={isResetting}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!formApiRef.current) {
                        showError(t('表单未初始化'));
                        return;
                      }
                      // 防止重复提交
                      if (isResetting) {
                        return;
                      }
                      try {
                        const values = await formApiRef.current.validate();
                        await handleResetPassword(values);
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
                    {t('重置密码')}
                  </Button>
                </div>
              </Form>

              <div className="text-center mt-6 text-sm">
                <Text className="auth-page-link-text">
                  {t('还没有账户？')}{' '}
                  <Link
                    to={`/register${searchParams.toString() ? '?' + searchParams.toString() : ''}`}
                    className="auth-page-link font-medium"
                  >
                    {t('注册')}
                  </Link>
                </Text>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StarPasswordResetForm;

