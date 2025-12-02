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

Star 认证适配器 - 将 Star 认证接口适配为 new-api 格式
*/

import {
  starLogin,
  starRegister,
  starSendEmailCode,
  starResetPassword,
} from './starApi';
import { setUserData, updateAPI } from './index';

/**
 * Star 登录适配器 - 将 Star 登录结果转换为 new-api 格式
 * @param {string} email - 邮箱/用户名
 * @param {string} password - 密码
 * @returns {Promise} 返回 new-api 格式的响应 { success, message, data }
 */
export const starLoginAdapter = async (email, password, aff = null) => {
  try {
    // 如果没有提供 aff 参数，尝试从 localStorage 获取
    const affCode = aff || localStorage.getItem('aff') || null;
    const res = await starLogin(email, password, affCode);
    if (res.success && res.data) {
      // 后端已经通过 setupLogin 返回了完整的用户数据
      // 后端已经将 Star 认证信息保存到 session 中（不再存储在 Cookie 中）
      // 这里直接使用后端返回的完整用户数据
      const userData = res.data;

      // 返回完整的用户数据
      return {
        success: true,
        message: res.message || '登录成功',
        data: userData,
      };
    }
    return {
      success: false,
      message: res.message || '登录失败',
      data: null,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '登录失败，请重试',
      data: null,
    };
  }
};

/**
 * Star 注册适配器 - 调用包装后的接口，返回 new-api 格式
 * @param {string} email - 邮箱
 * @param {string} email_code - 邮箱验证码
 * @param {string} password - 密码
 * @param {string} affCode - 可选邀请码
 * @returns {Promise} 返回 new-api 格式的响应 { success, message }
 */
export const starRegisterAdapter = async (email, email_code, password, affCode = '') => {
  try {
    // 调用包装后的接口（返回 new-api 格式）
    const API = (await import('./api')).API;
    const requestData = {
      email,
      email_code,
      password: btoa(password.trim()), // base64 编码
    };

    // 如果有 aff 码，添加到请求中
    if (affCode) {
      requestData.aff_code = affCode;
    }

    const res = await API.post('/u/register', requestData);

    if (res.data.success && res.data.data) {
      // 后端已经将 Star 认证信息保存到 session 中（不再存储在 Cookie 中）
      // 这里不再需要设置 Cookie，但保留代码以兼容旧版本
      const starData = res.data.data;
      // 注意：后端现在将认证信息存储在 session 中，不再设置 Cookie
      // 这里不再需要调用 setStarAuthCookies
    }

    return {
      success: res.data.success,
      message: res.data.message || (res.data.success ? '注册成功' : '注册失败'),
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || '注册失败，请重试',
    };
  }
};

/**
 * Star 发送验证码适配器 - 调用包装后的接口，返回 new-api 格式
 * @param {string} email - 邮箱
 * @param {string} type_ - 类型: 'register' 或 'back_password'
 * @returns {Promise} 返回 new-api 格式的响应 { success, message }
 */
export const starSendEmailCodeAdapter = async (email, type_ = 'register') => {
  try {
    // 调用包装后的接口（返回 new-api 格式）
    const API = (await import('./api')).API;
    const res = await API.post('/u/send_email', {
      email,
      type_,
    });

    return {
      success: res.data.success,
      message: res.data.message || (res.data.success ? '验证码发送成功' : '发送失败'),
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || '发送验证码失败，请重试',
    };
  }
};

/**
 * Star 找回密码适配器 - 调用包装后的接口，返回 new-api 格式
 * @param {string} email - 邮箱
 * @param {string} email_code - 邮箱验证码
 * @param {string} password - 新密码
 * @returns {Promise} 返回 new-api 格式的响应 { success, message }
 */
export const starResetPasswordAdapter = async (email, email_code, password) => {
  try {
    // 调用包装后的接口（返回 new-api 格式）
    const API = (await import('./api')).API;
    const res = await API.post('/u/back_password', {
      email,
      email_code,
      password: btoa(password.trim()), // base64 编码
    });

    return {
      success: res.data.success,
      message: res.data.message || (res.data.success ? '密码重置成功' : '密码重置失败'),
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || '密码重置失败，请重试',
    };
  }
};

/**
 * 检查是否应该使用 Star 系统
 * @returns {boolean}
 */
export const shouldUseStarSystem = () => {
  // 检查 URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  const forceLegacy = urlParams.get('force_legacy');
  if (forceLegacy === 'true' || forceLegacy === '1') {
    return false;
  }

  // 检查 status 中的配置
  try {
    const savedStatus = localStorage.getItem('status');
    if (savedStatus) {
      const status = JSON.parse(savedStatus);
      return status.star_user_system_enabled === true;
    }
  } catch (e) {
    // 解析失败，返回 false
  }

  return false;
};

