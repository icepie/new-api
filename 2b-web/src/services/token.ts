import request, { ApiResponse } from '../utils/request';

export interface Token {
  id: number;
  key: string;
  name: string;
  status: number;
  remain_quota: number;
  unlimited_quota: boolean;
  expired_time: number;
  created_at: number;
  [key: string]: any;
}

export interface TokenListResponse {
  items: Token[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateTokenData {
  name: string;
  unlimited_quota?: boolean;
  remain_quota?: number;
  expired_time?: number;
}

// 获取token列表
export const getTokens = (page = 1, size = 10): Promise<ApiResponse<TokenListResponse>> => {
  return request.get(`/api/token/?p=${page}&size=${size}`);
};

// 获取单个token详情
export const getToken = (id: number): Promise<ApiResponse<Token>> => {
  return request.get(`/api/token/${id}`);
};

// 创建token
export const createToken = (data: CreateTokenData): Promise<ApiResponse<Token>> => {
  return request.post('/api/token/', data);
};

// 更新token
export const updateToken = (data: Partial<Token> & { id: number }): Promise<ApiResponse<Token>> => {
  return request.put('/api/token/', data);
};

// 删除token
export const deleteToken = (id: number): Promise<ApiResponse> => {
  return request.delete(`/api/token/${id}/`);
};

// 批量删除tokens
export const batchDeleteTokens = (ids: number[]): Promise<ApiResponse<number>> => {
  return request.post('/api/token/batch', { ids });
};

// 启用/禁用token
export const updateTokenStatus = (id: number, status: number): Promise<ApiResponse<Token>> => {
  return request.put('/api/token/?status_only=true', { id, status });
};

// 搜索tokens
export const searchTokens = (keyword = '', token = ''): Promise<ApiResponse<Token[]>> => {
  return request.get(`/api/token/search?keyword=${keyword}&token=${token}`);
};

export interface UsageLogParams {
  page?: number;
  pageSize?: number;
  type?: number;
  tokenName?: string;
  modelName?: string;
  startTimestamp?: string | number;
  endTimestamp?: string | number;
  group?: string;
}

// 获取使用日志
export const getUsageLogs = (params: UsageLogParams): Promise<ApiResponse<any>> => {
  const {
    page = 1,
    pageSize = 10,
    type = 0,
    tokenName = '',
    modelName = '',
    startTimestamp = '',
    endTimestamp = '',
    group = '',
  } = params;

  const url = `/api/log/self/?p=${page}&page_size=${pageSize}&type=${type}&token_name=${tokenName}&model_name=${modelName}&start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}&group=${group}`;
  return request.get(encodeURI(url));
};

// 获取使用统计
export const getUsageStats = (params: UsageLogParams): Promise<ApiResponse<any>> => {
  const {
    type = 0,
    tokenName = '',
    modelName = '',
    startTimestamp = '',
    endTimestamp = '',
    group = '',
  } = params;

  const url = `/api/log/self/stat?type=${type}&token_name=${tokenName}&model_name=${modelName}&start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}&group=${group}`;
  return request.get(encodeURI(url));
};

// 别名导出，保持向后兼容
export const getTokenUsage = getUsageLogs;
export const getTokenStats = getUsageStats;
