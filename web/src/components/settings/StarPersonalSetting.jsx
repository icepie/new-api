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

import React, { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  API,
  copy,
  showError,
  showSuccess,
  setStatusData,
  setUserData,
} from '../../helpers';
import { UserContext } from '../../context/User';
import { useTranslation } from 'react-i18next';

// 导入子组件
import UserInfoHeader from './personal/components/UserInfoHeader';
import StarAccountManagement from './personal/cards/StarAccountManagement';
import NotificationSettings from './personal/cards/NotificationSettings';
import StarEmailBindModal from './personal/modals/StarEmailBindModal';
import StarWeChatBindModal from './personal/modals/StarWeChatBindModal';
import StarChangePasswordModal from './personal/modals/StarChangePasswordModal';
import StarChangeUsernameModal from './personal/modals/StarChangeUsernameModal';
import {
  starSendEmailCode,
  starGetWechatQRCode,
  starWechatBind,
  starCheckWechatLoginStatus,
  starGetUserInfo,
  starChangeUserInfo,
  getStarAuthCookies,
} from '../../helpers/starApi';

const StarPersonalSetting = () => {
  const [userState, userDispatch] = useContext(UserContext);
  let navigate = useNavigate();
  const { t } = useTranslation();

  const [inputs, setInputs] = useState({
    wechat_verification_code: '',
    email_verification_code: '',
    email: '',
    original_password: '',
    set_new_password: '',
    set_new_password_confirmation: '',
    email_code: '',
    username: '',
  });
  const [status, setStatus] = useState({});
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showWeChatBindModal, setShowWeChatBindModal] = useState(false);
  const [showEmailBindModal, setShowEmailBindModal] = useState(false);
  const [showChangeUsernameModal, setShowChangeUsernameModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [systemToken, setSystemToken] = useState('');
  const [wechatQRCode, setWechatQRCode] = useState('');
  const [wechatTicket, setWechatTicket] = useState('');
  const [wechatQRStatus, setWechatQRStatus] = useState('loading'); // 'loading', 'active', 'scanned', 'expired', 'completed'
  const wechatPollingRef = useRef(null);
  const [starUserInfo, setStarUserInfo] = useState(null); // Star 用户信息
  const [notificationSettings, setNotificationSettings] = useState({
    warningType: 'email',
    warningThreshold: 100000,
    webhookUrl: '',
    webhookSecret: '',
    notificationEmail: '',
    barkUrl: '',
    gotifyUrl: '',
    gotifyToken: '',
    gotifyPriority: 5,
    acceptUnsetModelRatioModel: false,
    recordIpLog: false,
  });

  useEffect(() => {
    let saved = localStorage.getItem('status');
    if (saved) {
      const parsed = JSON.parse(saved);
      setStatus(parsed);
    }
    // Always refresh status from server
    (async () => {
      try {
        const res = await API.get('/api/status');
        const { success, data } = res.data;
        if (success && data) {
          setStatus(data);
          setStatusData(data);
        }
      } catch (e) {
        // ignore and keep local status
      }
    })();

    getUserData();
    loadStarUserInfo();

    // 清理函数
    return () => {
      stopWechatPolling();
    };
  }, []);

  // 初始化用户名输入框
  useEffect(() => {
    if (userState.user?.username) {
      setInputs((prev) => ({
        ...prev,
        username: userState.user.username,
      }));
    }
  }, [userState.user?.username]);

  // 加载 Star 用户信息
  const loadStarUserInfo = async () => {
    // 检查用户是否有 star_user_id
    const starUserId = userState.user?.star_user_id;
    
    console.log('loadStarUserInfo - starUserId:', starUserId);
    
    // 如果用户有 star_user_id，调用 API（后端会从 session 获取）
    if (starUserId) {
      try {
        console.log('调用 starGetUserInfo (后端从 session 获取认证信息)');
        const res = await starGetUserInfo();
        console.log('starGetUserInfo 响应:', res);
        if (res.success && res.data) {
          setStarUserInfo(res.data);
          console.log('Star 用户信息已设置:', res.data);
        } else {
          console.error('获取 Star 用户信息失败:', res.message);
        }
      } catch (error) {
        console.error('获取 Star 用户信息异常:', error);
      }
    } else {
      console.warn('用户未绑定 Star 账户');
    }
  };

  useEffect(() => {
    let countdownInterval = null;
    if (disableButton && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      setDisableButton(false);
      setCountdown(30);
    }
    return () => clearInterval(countdownInterval);
  }, [disableButton, countdown]);

  useEffect(() => {
    if (userState?.user?.setting) {
      const settings = JSON.parse(userState.user.setting);
      setNotificationSettings({
        warningType: settings.notify_type || 'email',
        warningThreshold: settings.quota_warning_threshold || 500000,
        webhookUrl: settings.webhook_url || '',
        webhookSecret: settings.webhook_secret || '',
        notificationEmail: settings.notification_email || '',
        barkUrl: settings.bark_url || '',
        gotifyUrl: settings.gotify_url || '',
        gotifyToken: settings.gotify_token || '',
        gotifyPriority:
          settings.gotify_priority !== undefined ? settings.gotify_priority : 5,
        acceptUnsetModelRatioModel:
          settings.accept_unset_model_ratio_model || false,
        recordIpLog: settings.record_ip_log || false,
      });
    }
  }, [userState?.user?.setting]);

  // 微信绑定二维码轮询
  useEffect(() => {
    // 只有在有 ticket 且状态为 active 或 scanned 且没有正在运行的轮询时才启动
    // 排除 completed 和 expired 状态
    if (wechatTicket && (wechatQRStatus === 'active' || wechatQRStatus === 'scanned') && wechatQRStatus !== 'completed' && wechatQRStatus !== 'expired' && !wechatPollingRef.current) {
      // 使用递归 setTimeout 实现动态间隔：前30次每2秒，之后每3秒
      let pollingCount = 0;
      
      const scheduleNextPoll = () => {
        // 检查是否应该继续轮询（包括 completed 状态）
        if (!wechatTicket || wechatQRStatus === 'expired' || wechatQRStatus === 'completed') {
          stopWechatPolling();
          return;
        }
        
        const interval = pollingCount < 30 ? 2000 : 3000;
        wechatPollingRef.current = setTimeout(() => {
          // 在回调中再次检查状态（包括 completed 状态）
          if (!wechatTicket || wechatQRStatus === 'expired' || wechatQRStatus === 'completed') {
            stopWechatPolling();
            return;
          }
          
          // 执行检查
          checkWechatBindStatus().then(() => {
            pollingCount++;
            // 检查是否应该继续轮询（排除 completed 状态）
            if (wechatTicket && wechatQRStatus !== 'expired' && wechatQRStatus !== 'loading' && wechatQRStatus !== 'completed') {
              scheduleNextPoll(); // 递归调度下一次
            } else {
              stopWechatPolling();
            }
          }).catch(() => {
            pollingCount++;
            // 错误处理：如果还有 ticket 且未过期且未完成，继续轮询
            if (wechatTicket && wechatQRStatus !== 'expired' && wechatQRStatus !== 'loading' && wechatQRStatus !== 'completed') {
              scheduleNextPoll();
            } else {
              stopWechatPolling();
            }
          });
        }, interval);
      };
      
      // 立即执行一次检查
      checkWechatBindStatus().then(() => {
        pollingCount++;
        // 开始第一次调度（排除已完成和过期状态）
        if (wechatTicket && (wechatQRStatus === 'active' || wechatQRStatus === 'scanned') && wechatQRStatus !== 'completed' && wechatQRStatus !== 'expired' && !wechatPollingRef.current) {
          scheduleNextPoll();
        }
      }).catch(() => {
        pollingCount++;
        // 即使第一次检查失败，也继续轮询（可能是网络问题），但排除已完成和过期状态
        if (wechatTicket && (wechatQRStatus === 'active' || wechatQRStatus === 'scanned') && wechatQRStatus !== 'completed' && wechatQRStatus !== 'expired' && !wechatPollingRef.current) {
          scheduleNextPoll();
        }
      });
      
      // 2分钟后自动过期
      const timeoutId = setTimeout(() => {
        setWechatQRStatus('expired');
        stopWechatPolling();
      }, 2 * 60 * 1000);
      
      return () => {
        stopWechatPolling();
        clearTimeout(timeoutId);
      };
    }
  }, [wechatTicket, wechatQRStatus]);

  const handleInputChange = (name, value) => {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  };

  const generateAccessToken = async () => {
    const res = await API.get('/api/user/token');
    const { success, message, data } = res.data;
    if (success) {
      setSystemToken(data);
      await copy(data);
      showSuccess(t('令牌已重置并已复制到剪贴板'));
    } else {
      showError(message);
    }
  };

  const getUserData = async () => {
    let res = await API.get(`/api/user/self`);
    const { success, message, data } = res.data;
    if (success) {
      userDispatch({ type: 'login', payload: data });
      setUserData(data);
    } else {
      showError(message);
    }
  };

  const handleSystemTokenClick = async (e) => {
    e.target.select();
    await copy(e.target.value);
    showSuccess(t('系统令牌已复制到剪切板'));
  };

  // 停止微信二维码轮询
  const stopWechatPolling = () => {
    if (wechatPollingRef.current) {
      // 支持 clearInterval 和 clearTimeout（因为可能使用 setTimeout）
      if (typeof wechatPollingRef.current === 'number') {
        clearTimeout(wechatPollingRef.current);
      } else {
        clearInterval(wechatPollingRef.current);
      }
      wechatPollingRef.current = null;
    }
  };

  // 检查微信绑定状态
  const checkWechatBindStatus = async () => {
    // 如果没有 ticket 或状态为 completed/expired，停止轮询
    if (!wechatTicket || wechatQRStatus === 'completed' || wechatQRStatus === 'expired') {
      stopWechatPolling();
      return;
    }

    try {
      const res = await starCheckWechatLoginStatus(wechatTicket);
      
      if (res.success && res.data) {
        // 如果返回了 wechat_temp_token，说明已扫码，需要手动调用绑定接口
        if (res.data.wechat_temp_token) {
          setWechatQRStatus('scanned');
          // 停止轮询，等待用户确认或自动绑定
          stopWechatPolling();
          setWechatTicket(''); // 清除 ticket，防止轮询继续
          // 自动调用绑定接口
          await bindWeChatWithToken(res.data.wechat_temp_token);
          return;
        }
        
        // 如果返回了用户数据（包含 id 字段），说明绑定成功（老用户直接登录的情况）
        if (res.data && res.data.id !== undefined && res.data.id !== null) {
          // 绑定成功，停止轮询并清除 ticket，防止重复触发成功提示
          stopWechatPolling();
          setWechatTicket(''); // 清除 ticket，确保轮询完全停止
          setWechatQRStatus('completed'); // 设置为完成状态，防止轮询继续
          showSuccess(t('微信账户绑定成功！'));
          setShowWeChatBindModal(false);
          await getUserData();
          await loadStarUserInfo(); // 刷新 Star 用户信息
          return;
        }
        
        // 其他情况（未扫码或处理中），继续轮询
      } else if (res.message && (res.message.includes('过期') || res.message.includes('已过期'))) {
        setWechatQRStatus('expired');
        stopWechatPolling();
      }
    } catch (error) {
      // 如果是过期错误，更新状态
      if (error.message && (error.message.includes('过期') || error.message.includes('已过期'))) {
        setWechatQRStatus('expired');
        stopWechatPolling();
      } else if (error.message && (error.message.includes('502') || error.message.includes('Bad Gateway'))) {
        // Star 后端服务不可用，停止轮询并提示
        setWechatQRStatus('expired');
        stopWechatPolling();
        showError(t('Star 后端服务暂时不可用，请稍后重试'));
      } else {
        // 其他错误，记录日志但不继续轮询（避免重复错误）
        console.error('检查微信绑定状态失败:', error);
        // 不继续轮询，避免重复错误
        stopWechatPolling();
      }
    }
  };

  // Star 微信绑定 - 获取二维码
  const handleGetWeChatQRCode = async () => {
    setWechatQRStatus('loading');
    stopWechatPolling();
    
    try {
      const res = await starGetWechatQRCode('bind');
      if (res.success && res.data) {
        setWechatQRCode(res.data.qr_code_url || res.data.qr_url || '');
        const ticket = res.data.ticket || '';
        setWechatTicket(ticket);
        setWechatQRStatus('active');
        setShowWeChatBindModal(true);
        
        // 注意：轮询会在 useEffect 中自动开始
      } else {
        setWechatQRStatus('expired');
        showError(res.message || t('获取微信二维码失败'));
      }
    } catch (error) {
      setWechatQRStatus('expired');
      showError(t('获取微信二维码失败，请重试'));
    }
  };

  // 使用 token 绑定微信
  const bindWeChatWithToken = async (wechatTempToken) => {
    // 在绑定场景下，后端会自动从 session 中获取 Star 认证信息
    // 如果前端有 Cookie 中的认证信息，可以传递给后端（可选）
    // 如果没有，后端会从 session 中获取
    const authCookies = getStarAuthCookies();
    
    setLoading(true);
    try {
      const bindData = {
        wechat_temp_token: wechatTempToken,
      };
      
      // 如果存在 Cookie 中的认证信息，传递给后端（可选，后端会优先使用）
      // 如果不存在，后端会自动从 session 中获取
      if (authCookies.xuserid && authCookies.xtoken) {
        bindData.xuserid = parseInt(authCookies.xuserid);
        bindData.xtoken = authCookies.xtoken;
      }
      
      const res = await starWechatBind(bindData);

      if (res.success && res.data) {
        // 如果返回了用户数据（包含 id），说明绑定成功并更新了 session
        // 先更新用户数据，确保 localStorage 中的用户 ID 是最新的
        if (res.data.id) {
          // 更新用户状态
          userDispatch({ type: 'login', payload: res.data });
          setUserData(res.data);
        }
        
        // 停止轮询并清除 ticket，防止重复触发成功提示
        stopWechatPolling();
        setWechatTicket(''); // 清除 ticket，确保轮询完全停止
        setWechatQRStatus('completed'); // 设置为完成状态，防止轮询继续
        
        showSuccess(t('微信账户绑定成功！'));
        setShowWeChatBindModal(false);
        
        // 刷新用户数据
        await getUserData();
        // 等待一下确保 getUserData 完成后再调用 loadStarUserInfo
        setTimeout(async () => {
          await loadStarUserInfo(); // 刷新 Star 用户信息
        }, 100);
      } else {
        showError(res.message || t('微信绑定失败'));
      }
    } catch (error) {
      // 检查是否是 Star 后端服务不可用
      if (error.message && (error.message.includes('502') || error.message.includes('Bad Gateway'))) {
        showError(t('Star 后端服务暂时不可用，请稍后重试'));
      } else if (error.message && error.message.includes('缺少必需参数')) {
        showError(t('绑定微信需要 Star 账户认证，请先登录 Star 账户'));
      } else {
        showError(t('微信绑定失败，请重试'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Star 微信绑定（手动确认，用于已扫码的情况）
  // 注意：由于后端已经统一处理绑定流程，这个函数主要用于手动触发检查
  const bindWeChat = async () => {
    if (!wechatTicket) {
      showError(t('请先获取微信二维码'));
      return;
    }

    // 手动触发一次检查
    await checkWechatBindStatus();
  };

  // Star 修改用户名
  const changeUsername = async (values) => {
    console.log('changeUsername 被调用，参数:', values);
    if (loading) {
      console.warn('正在加载中，忽略重复调用');
      return;
    }
    const { username } = values || {};

    if (!username || username.trim() === '') {
      console.error('用户名为空');
      showError(t('请输入用户名！'));
      return;
    }

    console.log('设置 loading 为 true');
    setLoading(true);
    try {
      console.log('修改用户名 - 调用 starChangeUserInfo:', { changeType: 'username', username: username.trim() });
      const res = await starChangeUserInfo('username', { username: username.trim() });
      console.log('修改用户名 - 响应:', res);
      if (res.success) {
        showSuccess(t('用户名修改成功！'));
        setShowChangeUsernameModal(false);
        setInputs((prev) => ({
          ...prev,
          username: '',
        }));
        await getUserData();
        await loadStarUserInfo(); // 刷新 Star 用户信息
      } else {
        console.error('修改用户名失败:', res.message);
        showError(res.message || t('用户名修改失败'));
      }
    } catch (error) {
      console.error('修改用户名异常:', error);
      showError(error.message || t('用户名修改失败，请重试'));
    } finally {
      console.log('设置 loading 为 false');
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (inputs.set_new_password === '') {
      showError(t('请输入新密码！'));
      return;
    }
    if (inputs.set_new_password !== inputs.set_new_password_confirmation) {
      showError(t('两次输入的密码不一致！'));
      return;
    }
    if (!inputs.email_code) {
      showError(t('请输入邮箱验证码！'));
      return;
    }

    setLoading(true);
    try {
      // 使用 Star 后端的找回密码接口来修改密码
      // 注意：这需要用户先发送验证码到邮箱
      const res = await API.post('/u/back_password', {
        email: userState.user?.email || inputs.email,
        password: btoa(inputs.set_new_password.trim()),
        email_code: inputs.email_code,
      });

      const { success, message } = res.data;
      if (success) {
        showSuccess(t('密码修改成功！'));
        setShowChangePasswordModal(false);
        // 清空输入
        setInputs((prev) => ({
          ...prev,
          original_password: '',
          set_new_password: '',
          set_new_password_confirmation: '',
          email_code: '',
        }));
      } else {
        showError(message || t('密码修改失败'));
      }
    } catch (error) {
      showError(t('密码修改失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  // Star 发送邮箱验证码（用于绑定邮箱或修改密码）
  const sendVerificationCode = async (type = 'bind') => {
    const email = inputs.email || userState.user?.email;
    if (!email) {
      showError(t('请输入邮箱！'));
      return;
    }

    setDisableButton(true);
    setLoading(true);
    try {
      // 对于绑定邮箱，使用 'register' 类型
      // 对于修改密码，使用 'back_password' 类型
      const type_ = type === 'change_password' ? 'back_password' : 'register';
      const res = await starSendEmailCode(email, type_);
      if (res.success) {
        showSuccess(t('验证码发送成功，请检查邮箱！'));
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
        showError(res.message || t('发送验证码失败'));
      }
    } catch (error) {
      showError(t('发送验证码失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  // Star 绑定邮箱
  const bindEmail = async () => {
    if (inputs.email_verification_code === '') {
      showError(t('请输入邮箱验证码！'));
      return;
    }
    if (!inputs.email) {
      showError(t('请输入邮箱地址！'));
      return;
    }

    setLoading(true);
    try {
      // Star 后端可能没有专门的绑定邮箱接口
      // 这里可能需要调用 Star 后端的接口，或者使用 new-api 的接口
      // 暂时使用 new-api 的接口，但需要验证码
      const res = await API.get(
        `/api/oauth/email/bind?email=${inputs.email}&code=${inputs.email_verification_code}`,
      );
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('邮箱账户绑定成功！'));
        setShowEmailBindModal(false);
        await getUserData();
        await loadStarUserInfo(); // 刷新 Star 用户信息
      } else {
        showError(message || t('邮箱绑定失败'));
      }
    } catch (error) {
      showError(t('邮箱绑定失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSettingChange = (type, value) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [type]: value.target
        ? value.target.value !== undefined
          ? value.target.value
          : value.target.checked
        : value,
    }));
  };

  const saveNotificationSettings = async () => {
    try {
      const res = await API.put('/api/user/setting', {
        notify_type: notificationSettings.warningType,
        quota_warning_threshold: parseFloat(
          notificationSettings.warningThreshold,
        ),
        webhook_url: notificationSettings.webhookUrl,
        webhook_secret: notificationSettings.webhookSecret,
        notification_email: notificationSettings.notificationEmail,
        bark_url: notificationSettings.barkUrl,
        gotify_url: notificationSettings.gotifyUrl,
        gotify_token: notificationSettings.gotifyToken,
        gotify_priority: (() => {
          const parsed = parseInt(notificationSettings.gotifyPriority);
          return isNaN(parsed) ? 5 : parsed;
        })(),
        accept_unset_model_ratio_model:
          notificationSettings.acceptUnsetModelRatioModel,
        record_ip_log: notificationSettings.recordIpLog,
      });

      if (res.data.success) {
        showSuccess(t('设置保存成功'));
        await getUserData();
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(t('设置保存失败'));
    }
  };

  return (
    <div className='mt-[60px]'>
      <div className='flex justify-center'>
        <div className='w-full max-w-7xl mx-auto px-2'>
          {/* 顶部用户信息区域 */}
          <UserInfoHeader t={t} userState={userState} />

          {/* 账户管理和其他设置 */}
          <div className='grid grid-cols-1 xl:grid-cols-2 items-start gap-4 md:gap-6 mt-4 md:mt-6'>
            {/* 左侧：账户管理设置 */}
            <StarAccountManagement
              t={t}
              userState={userState}
              status={status}
              systemToken={systemToken}
              setShowEmailBindModal={setShowEmailBindModal}
              setShowWeChatBindModal={handleGetWeChatQRCode}
              generateAccessToken={generateAccessToken}
              handleSystemTokenClick={handleSystemTokenClick}
              setShowChangePasswordModal={setShowChangePasswordModal}
              setShowChangeUsernameModal={setShowChangeUsernameModal}
              starUserInfo={starUserInfo}
            />

            {/* 右侧：其他设置 */}
            <NotificationSettings
              t={t}
              notificationSettings={notificationSettings}
              handleNotificationSettingChange={handleNotificationSettingChange}
              saveNotificationSettings={saveNotificationSettings}
            />
          </div>
        </div>
      </div>

      {/* 模态框组件 */}
      <StarEmailBindModal
        t={t}
        showEmailBindModal={showEmailBindModal}
        setShowEmailBindModal={setShowEmailBindModal}
        inputs={inputs}
        handleInputChange={handleInputChange}
        sendVerificationCode={() => sendVerificationCode('bind')}
        bindEmail={bindEmail}
        disableButton={disableButton}
        loading={loading}
        countdown={countdown}
      />

      <StarWeChatBindModal
        t={t}
        showWeChatBindModal={showWeChatBindModal}
        setShowWeChatBindModal={setShowWeChatBindModal}
        inputs={inputs}
        handleInputChange={handleInputChange}
        bindWeChat={bindWeChat}
        wechatQRCode={wechatQRCode}
        wechatQRStatus={wechatQRStatus}
        loading={loading}
      />

      <StarChangePasswordModal
        t={t}
        showChangePasswordModal={showChangePasswordModal}
        setShowChangePasswordModal={setShowChangePasswordModal}
        inputs={inputs}
        handleInputChange={handleInputChange}
        changePassword={changePassword}
        sendVerificationCode={() => sendVerificationCode('change_password')}
        disableButton={disableButton}
        loading={loading}
        countdown={countdown}
        userEmail={userState.user?.email}
      />

      <StarChangeUsernameModal
        t={t}
        showChangeUsernameModal={showChangeUsernameModal}
        setShowChangeUsernameModal={setShowChangeUsernameModal}
        inputs={inputs}
        handleInputChange={handleInputChange}
        changeUsername={changeUsername}
        loading={loading}
        userState={userState}
      />
    </div>
  );
};

export default StarPersonalSetting;

