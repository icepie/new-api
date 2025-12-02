/*
Copyright (C) 2025 QuantumNous

Star 认证适配器 - 将 Star 认证接口适配为 new-api 格式
*/

import {
  starLogin,
  starRegister,
  starSendEmailCode,
  starResetPassword,
  setStarAuthCookies,
} from './starApi';
import { setUserData, updateAPI } from './index';

/**
 * Star 登录适配器 - 将 Star 登录结果转换为 new-api 格式
 * @param {string} email - 邮箱/用户名
 * @param {string} password - 密码
 * @returns {Promise} 返回 new-api 格式的响应 { success, message, data }
 */
export const starLoginAdapter = async (email, password) => {
  try {
    const res = await starLogin(email, password);
    if (res.success && res.data) {
      // 后端已经通过 setupLogin 返回了完整的用户数据
      // 后端已经设置了 session 和 cookies（包括 xuserid, xtoken）
      // 这里直接使用后端返回的完整用户数据
      const userData = res.data;
      
      // 尝试从 cookies 中读取 xy_uuid_token（如果存在）
      // 注意：后端可能没有返回 xy_uuid_token，它可能只在某些情况下设置
      // 如果 cookies 中已经有这些值，说明后端已经设置了
      
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
      const starData = res.data.data;
      const { xuserid, xtoken, xy_uuid_token } = starData;
      if (xuserid && xtoken && xy_uuid_token) {
        // 设置 Star 认证 cookies
        setStarAuthCookies({ xuserid, xtoken, xy_uuid_token });
      }
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

