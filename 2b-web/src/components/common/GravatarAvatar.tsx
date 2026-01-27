import React, { useState, useEffect } from 'react';
import { Avatar } from 'antd';
import { getGravatarUrl } from '../../utils/gravatar';

interface GravatarAvatarProps {
  email?: string;
  fallbackText?: string;
  color?: string;
  size?: number | 'large' | 'small' | 'default';
  className?: string;
  style?: React.CSSProperties;
}

const GravatarAvatar: React.FC<GravatarAvatarProps> = ({
  email,
  fallbackText = 'NA',
  color = '#1890ff',
  size = 'default',
  className = '',
  style = {},
}) => {
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (email) {
      const url = getGravatarUrl(email, 200, '404');

      // 预加载图片以检查是否存在
      const img = new Image();
      img.onload = () => {
        setAvatarSrc(url);
        setImageLoaded(true);
      };
      img.onerror = () => {
        // Gravatar 不存在，使用 fallback
        setImageLoaded(false);
        setAvatarSrc(null);
      };
      img.src = url;
    } else {
      setImageLoaded(false);
      setAvatarSrc(null);
    }
  }, [email]);

  return (
    <Avatar
      size={size}
      style={{
        backgroundColor: !imageLoaded ? color : undefined,
        ...style,
      }}
      className={className}
      src={imageLoaded ? avatarSrc : undefined}
    >
      {!imageLoaded && fallbackText}
    </Avatar>
  );
};

export default GravatarAvatar;
