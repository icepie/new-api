import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { User } from './auth';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

const request = axios.create({
  baseURL: '/',
  timeout: 30000,
});

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user: User = JSON.parse(userStr);
        if (user && user.id) {
          config.headers['New-API-User'] = user.id;
        }
      } catch (e) {
        console.error('解析用户数据失败:', e);
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response) => {
    const res: ApiResponse = response.data;

    if (res.success === false) {
      message.error(res.message || '请求失败');

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }

      return Promise.reject(new Error(res.message || '请求失败'));
    }

    return res;
  },
  (error: AxiosError<ApiResponse>) => {
    console.error('请求错误:', error);

    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        message.error('登录已过期,请重新登录');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (status === 403) {
        message.error('没有权限访问');
      } else if (status === 404) {
        message.error('请求的资源不存在');
      } else if (status === 500) {
        message.error('服务器错误');
      } else {
        message.error(data?.message || '请求失败');
      }
    } else if (error.request) {
      message.error('网络错误,请检查网络连接');
    } else {
      message.error(error.message || '请求失败');
    }

    return Promise.reject(error);
  }
);

// 创建类型安全的请求方法
const typedRequest = {
  get: <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
    return request.get(url, config) as Promise<ApiResponse<T>>;
  },
  post: <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
    return request.post(url, data, config) as Promise<ApiResponse<T>>;
  },
  put: <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
    return request.put(url, data, config) as Promise<ApiResponse<T>>;
  },
  delete: <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
    return request.delete(url, config) as Promise<ApiResponse<T>>;
  },
  patch: <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
    return request.patch(url, data, config) as Promise<ApiResponse<T>>;
  },
};

export default typedRequest;
export type { ApiResponse };
