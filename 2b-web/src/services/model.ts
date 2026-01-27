import request, { ApiResponse } from '../utils/request';

// 获取模型列表
export const getModels = (): Promise<ApiResponse<string[]>> => {
  return request.get('/api/user/models');
};

// 获取模型价格
export const getModelPrices = (): Promise<ApiResponse<any>> => {
  return request.get('/api/prices');
};

// 获取用户分组信息
export const getUserGroups = (): Promise<ApiResponse<any>> => {
  return request.get('/api/user/self/groups');
};
