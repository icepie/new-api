// 认证相关工具函数

export interface User {
  id: number;
  username?: string;
  email?: string;
  role?: number;
  [key: string]: any;
}

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
};

export const setUser = (user: User): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const getUser = (): User | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const removeUser = (): void => {
  localStorage.removeItem('user');
};

export const isAuthenticated = (): boolean => {
  const user = getUser();
  return !!(user && user.id);
};

export const logout = (): void => {
  removeToken();
  removeUser();
  window.location.href = '/login';
};
