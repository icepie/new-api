import request, { ApiResponse } from '../utils/request';

export interface SystemStatus {
  star_enabled?: boolean;
  [key: string]: any;
}

// 获取系统状态
export const getStatus = (): Promise<ApiResponse<SystemStatus>> => {
  return request.get('/api/status');
};
