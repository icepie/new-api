import axios from 'axios';

// 创建 Star API 实例
const starApi = axios.create({
  baseURL: '/u',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 响应拦截器 - 处理 new-api 格式的响应
starApi.interceptors.response.use(
  (response) => {
    const { success, message, data } = response.data;

    if (success) {
      return { success: true, data, message: message || '' };
    } else {
      return { success: false, message: message || '操作失败' };
    }
  },
  (error) => {
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
      return { success: false, message };
    } else if (error.request) {
      return { success: false, message: '网络连接失败' };
    } else {
      return { success: false, message: '请求发送失败' };
    }
  }
);

/**
 * 发送邮箱验证码
 */
export const starSendEmailCode = async (email: string, type_: string = 'register') => {
  const response = await starApi.post('/send_email', { email, type_ });
  return response;
};

/**
 * 用户注册
 */
export const starRegister = async (email: string, email_code: string, password: string) => {
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
 */
export const starLogin = async (email: string, password: string, aff: string | null = null) => {
  const encodedPassword = btoa(password.trim());

  let url = '/login';
  if (aff) {
    url += `?aff=${encodeURIComponent(aff)}`;
  } else {
    const affFromStorage = localStorage.getItem('aff');
    if (affFromStorage) {
      url += `?aff=${encodeURIComponent(affFromStorage)}`;
    }
  }

  const response = await starApi.post(url, {
    email,
    password: encodedPassword,
  });
  return response;
};

/**
 * 找回密码
 */
export const starResetPassword = async (email: string, email_code: string, password: string) => {
  const encodedPassword = btoa(password.trim());
  const response = await starApi.post('/back_password', {
    email,
    email_code,
    password: encodedPassword,
  });
  return response;
};

/**
 * 修改密码（使用邮箱验证码）
 */
export const starChangePassword = async (email: string, email_code: string, newPassword: string) => {
  const encodedNewPassword = btoa(newPassword.trim());
  const response = await starApi.post('/change_user_info', {
    change_type: 'password',
    email,
    email_code,
    new_password: encodedNewPassword,
  });
  return response;
};

export default starApi;
