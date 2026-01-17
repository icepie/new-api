/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useState, useEffect } from 'react';
import { Avatar } from '@douyinfe/semi-ui';
import gravatarUrl from 'gravatar-url';

const GravatarAvatar = ({
  email,
  fallbackText,
  color,
  size = 'extra-small',
  className = '',
  ...rest
}) => {
  const [avatarSrc, setAvatarSrc] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (email) {
      const url = gravatarUrl(email, {
        size: 200,
        default: '404' // Return 404 if no gravatar exists
      });

      // Preload the image to check if it exists
      const img = new Image();
      img.onload = () => {
        setAvatarSrc(url);
        setImageLoaded(true);
      };
      img.onerror = () => {
        // Gravatar doesn't exist, keep using fallback
        setImageLoaded(false);
      };
      img.src = url;
    }
  }, [email]);

  return (
    <Avatar
      size={size}
      color={!imageLoaded ? color : undefined}
      className={className}
      src={imageLoaded ? avatarSrc : undefined}
      {...rest}
    >
      {!imageLoaded && fallbackText}
    </Avatar>
  );
};

export default GravatarAvatar;
