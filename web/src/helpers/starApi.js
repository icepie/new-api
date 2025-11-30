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

import axios from 'axios';
import { showError, getUserIdFromLocalStorage } from './utils';

// 创建 Star API 实例
const starApi = axios.create({
  baseURL: '/u',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 响应拦截器 - 处理 new-api 格式的响应
starApi.interceptors.response.use(
  (response) => {
    // 后端现在返回 new-api 格式 { success, message, data }
    const { success, message, data } = response.data;
    
    if (success) {
      // 成功时返回数据
      return { success: true, data, message: message || '' };
    } else {
      // 失败时返回错误信息，但不自动显示（让组件自己处理，以便优化错误提示）
      return { success: false, message: message || '操作失败' };
    }
  },
  (error) => {
    // 处理网络层面的错误
    if (error.response) {
      const status = error.response.status;
      let message = `请求错误: ${status}`;
      if (status === 404) {
        message = '请求的资源未找到 (404)';
      } else if (status === 500) {
        message = '服务器内部错误 (500)';
      } else if (status === 504) {
        message = '请求超时，请稍后重试 (504)';
      }
      showError(message);
      return { success: false, message };
    } else if (error.request) {
      showError('网络连接失败，请检查您的网络');
      return { success: false, message: '网络连接失败' };
    } else {
      showError('请求发送失败');
      return { success: false, message: '请求发送失败' };
    }
  }
);

/**
 * 发送邮箱验证码
 * @param {string} email - 邮箱地址
 * @param {string} type_ - 类型: 'register' 或 'back_password'
 */
export const starSendEmailCode = async (email, type_ = 'register') => {
  const response = await starApi.post('/send_email', { email, type_ });
  return response;
};

/**
 * 用户注册
 * @param {string} email - 邮箱地址
 * @param {string} email_code - 邮箱验证码
 * @param {string} password - 密码 (需要 base64 编码)
 */
export const starRegister = async (email, email_code, password) => {
  // 密码需要 base64 编码
  const encodedPassword = btoa(password.trim());
  const response = await starApi.post('/register', {
    email,
    email_code,
    password: encodedPassword,
  });
  return response;
};

/**
 * 用户登录
 * @param {string} email - 邮箱/用户名
 * @param {string} password - 密码 (需要 base64 编码)
 */
export const starLogin = async (email, password) => {
  // 密码需要 base64 编码
  const encodedPassword = btoa(password.trim());
  const response = await starApi.post('/login', {
    email,
    password: encodedPassword,
  });
  return response;
};

/**
 * 找回密码
 * @param {string} email - 邮箱地址
 * @param {string} email_code - 邮箱验证码
 * @param {string} password - 新密码 (需要 base64 编码)
 */
export const starResetPassword = async (email, email_code, password) => {
  // 密码需要 base64 编码
  const encodedPassword = btoa(password.trim());
  const response = await starApi.post('/back_password', {
    email,
    email_code,
    password: encodedPassword,
  });
  return response;
};

/**
 * 获取微信登录二维码
 * @param {string} mode - 模式: 'login' 或 'bind'
 */
export const starGetWechatQRCode = async (mode = 'login') => {
  const response = await starApi.get('/wechat_login_qr', { params: { mode } });
  return response;
};

/**
 * 检查微信二维码登录状态
 * @param {string} ticket - 二维码 ticket
 */
export const starCheckWechatLoginStatus = async (ticket) => {
  const instance = axios.create({
    baseURL: '/u',
    timeout: 10000,
  });
  return instance.get('/qr_login_status', { params: { ticket } }).then((response) => {
    // 后端现在返回 new-api 格式 { success, message, data }
    // 如果登录成功，data 包含用户信息（id, username 等）
    // 如果还在处理中，data 可能包含 wechat_temp_token
    // 如果未扫码，data 可能为空或包含状态信息
    const { success, message, data } = response.data;
    
    if (success) {
      // 如果返回了用户数据（包含 id 字段），说明登录成功
      // setupLogin 返回的数据结构：{ id, username, display_name, role, status, group }
      if (data && data.id !== undefined && data.id !== null) {
        // 登录成功，直接返回用户数据
        return { success: true, data };
      }
      
      // 如果返回了 wechat_temp_token，说明已扫码但后端正在处理
      if (data && data.wechat_temp_token) {
        return { success: true, data };
      }
      
      // 如果返回了 xuserid 等（兼容旧格式），也认为成功
      if (data && (data.xuserid || data.xtoken)) {
        return { success: true, data };
      }
      
      // 未扫码或等待中，继续轮询
      return { success: true, data: null, message: '未扫码' };
    } else {
      // 失败情况
      if (typeof message === 'string' && (message.includes('无数据') || message.includes('尚未扫码'))) {
        return { success: false, data: null, message: '未扫码' };
      }
      // 二维码过期（或其他致命错误）
      throw new Error(message || '二维码已过期');
    }
  });
};

/**
 * 微信绑定/登录
 * @param {object} data - 绑定数据
 */
export const starWechatBind = async (data) => {
  const response = await starApi.post('/wechat_bind', data);
  return response;
};

/**
 * 设置 Star 认证 cookies
 * @param {object} authData - 认证数据 { xuserid, xtoken, xy_uuid_token }
 */
export const setStarAuthCookies = (authData) => {
  if (authData.xuserid) {
    document.cookie = `xuserid=${authData.xuserid}; path=/; max-age=${60 * 60 * 24 * 3}`; // 3天
  }
  if (authData.xtoken) {
    document.cookie = `xtoken=${authData.xtoken}; path=/; max-age=${60 * 60 * 24 * 3}`; // 3天
  }
  if (authData.xy_uuid_token) {
    document.cookie = `xy_uuid_token=${authData.xy_uuid_token}; path=/; max-age=${60 * 60 * 24 * 90}`; // 90天
  }
};

/**
 * 获取 Star 认证 cookies
 */
export const getStarAuthCookies = () => {
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  return {
    xuserid: cookies.xuserid || '',
    xtoken: cookies.xtoken || '',
    xy_uuid_token: cookies.xy_uuid_token || '',
  };
};

/**
 * 清除 Star 认证 cookies
 */
export const clearStarAuthCookies = () => {
  document.cookie = 'xuserid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'xtoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'xy_uuid_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

/**
 * 获取 Star 用户信息
 * @param {string} xuserid - Star 用户 ID
 * @param {string} xtoken - Star 认证 token
 */
export const starGetUserInfo = async () => {
  const instance = axios.create({
    baseURL: '/u',
    timeout: 10000,
    headers: {
      'New-API-User': getUserIdFromLocalStorage(),
    },
  });
  
  try {
    // 后端会从 session 获取认证信息，但需要 New-API-User header 来通过中间件验证
    const response = await instance.get('/get_user_info');
    
    // new-api 包装后的格式: {"success": true, "message": "", "data": {...}}
    const { success, message, data } = response.data;
    
    if (success) {
      return { success: true, data, message: message || '' };
    } else {
      return { success: false, message: message || '获取用户信息失败' };
    }
  } catch (error) {
    console.error('starGetUserInfo 请求失败:', error);
    if (error.response && error.response.data) {
      const { message } = error.response.data;
      throw new Error(message || '获取用户信息失败，请重试');
    }
    throw new Error('获取用户信息失败，请重试');
  }
};

/**
 * 修改 Star 用户信息
 * @param {string} changeType - 修改类型: 'username', 'email', 'tel'
 * @param {object} params - 参数对象
 */
export const starChangeUserInfo = async (changeType, params) => {
  console.log('starChangeUserInfo 被调用:', { changeType, params });
  const instance = axios.create({
    baseURL: '/u',
    timeout: 10000,
    headers: {
      'New-API-User': getUserIdFromLocalStorage(),
    },
  });

  const requestData = {
    change_type: changeType,
    ...params,
  };

  console.log('请求数据:', requestData);
  console.log('发送 POST 请求到 /u/change_user_info (后端将从 session 获取认证信息)');

  try {
    // 不传 headers，让后端从 session 获取认证信息
    const response = await instance.post('/change_user_info', requestData);
    
    console.log('收到响应:', response.data);
    
    // new-api 包装后的格式: {"success": true, "message": "", "data": {...}}
    const { success, message, data } = response.data;
    
    if (success) {
      return { success: true, data, message: message || '' };
    } else {
      console.error('修改失败，响应:', { success, message });
      return { success: false, message: message || '修改失败' };
    }
  } catch (error) {
    console.error('修改用户信息请求失败:', error);
    if (error.response) {
      console.error('错误响应:', error.response.data);
      const { message } = error.response.data || {};
      throw new Error(message || '修改失败，请重试');
    }
    throw new Error(error.message || '修改失败，请重试');
  }
};

export default starApi;

