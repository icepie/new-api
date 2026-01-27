import request, { ApiResponse } from '../utils/request';
import { User } from '../utils/auth';

interface LoginData {
  username: string;
  password: string;
}

// 用户登录
export const login = (data: LoginData): Promise<ApiResponse<User>> => {
  return request.post('/api/user/login', data);
};

// Star登录 - 使用 /u 路径和 base64 编码密码
export const starLogin = (data: LoginData): Promise<ApiResponse<User>> => {
  // Star登录需要base64编码密码
  const encodedPassword = btoa(data.password.trim());
  return request.post('/u/login', {
    email: data.username, // Star登录使用email字段
    password: encodedPassword,
  });
};

interface RegisterData {
  username: string;
  password: string;
  email?: string;
}

// 用户注册
export const register = (data: RegisterData): Promise<ApiResponse> => {
  return request.post('/api/user/register', data);
};

// 发送重置密码邮件
export const sendPasswordResetEmail = (email: string): Promise<ApiResponse> => {
  return request.post('/api/user/reset', { email });
};

interface ResetPasswordData {
  token: string;
  password: string;
}

// 重置密码
export const resetPassword = (data: ResetPasswordData): Promise<ApiResponse> => {
  return request.post('/api/user/reset/confirm', data);
};

// 获取当前用户信息
export const getCurrentUser = (): Promise<ApiResponse<User>> => {
  return request.get('/api/user/self');
};

// 退出登录
export const logoutApi = (): Promise<ApiResponse> => {
  return request.get('/api/user/logout');
};
