import gravatarUrl from 'gravatar-url';

/**
 * 生成 Gravatar URL
 * @param email 邮箱地址
 * @param size 图片大小（默认200）
 * @param defaultType 默认图片类型（默认404表示不存在时返回404）
 */
export const getGravatarUrl = (
  email: string,
  size: number = 200,
  defaultType: string = '404'
): string => {
  if (!email) return '';

  return gravatarUrl(email, {
    size,
    default: defaultType,
  });
};

/**
 * 根据字符串生成颜色
 * @param str 输入字符串
 */
export const stringToColor = (str: string): string => {
  if (!str) return '#1890ff';

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};
