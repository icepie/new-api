import { starLogin, starRegister, starSendEmailCode, starResetPassword, starChangePassword } from './starApi';
import { setUser } from '../utils/auth';

/**
 * Star 登录适配器 - 将 Star 登录结果转换为 new-api 格式
 */
export const starLoginAdapter = async (email: string, password: string, aff: string | null = null) => {
  try {
    const affCode = aff || localStorage.getItem('aff') || null;
    const res = await starLogin(email, password, affCode);
    if (res.success && res.data) {
      const userData = res.data;
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
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '登录失败，请重试',
      data: null,
    };
  }
};

/**
 * Star 注册适配器
 */
export const starRegisterAdapter = async (
  email: string,
  email_code: string,
  password: string,
  affCode: string = ''
) => {
  try {
    const requestData: any = {
      email,
      email_code,
      password: btoa(password.trim()),
    };

    if (affCode) {
      requestData.aff_code = affCode;
    }

    const res = await starRegister(email, email_code, password);

    return {
      success: res.success,
      message: res.message || (res.success ? '注册成功' : '注册失败'),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || '注册失败，请重试',
    };
  }
};

/**
 * Star 发送验证码适配器
 */
export const starSendEmailCodeAdapter = async (email: string, type_: string = 'register') => {
  try {
    const res = await starSendEmailCode(email, type_);
    return {
      success: res.success,
      message: res.message || (res.success ? '验证码发送成功' : '发送失败'),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || '发送验证码失败，请重试',
    };
  }
};

/**
 * Star 找回密码适配器
 */
export const starResetPasswordAdapter = async (
  email: string,
  email_code: string,
  password: string
) => {
  try {
    const res = await starResetPassword(email, email_code, password);
    return {
      success: res.success,
      message: res.message || (res.success ? '密码重置成功' : '密码重置失败'),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || '密码重置失败，请重试',
    };
  }
};

/**
 * Star 修改密码适配器（使用邮箱验证码）
 */
export const starChangePasswordAdapter = async (
  email: string,
  email_code: string,
  newPassword: string
) => {
  try {
    const res = await starChangePassword(email, email_code, newPassword);
    return {
      success: res.success,
      message: res.message || (res.success ? '密码修改成功' : '密码修改失败'),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || '密码修改失败，请重试',
    };
  }
};
