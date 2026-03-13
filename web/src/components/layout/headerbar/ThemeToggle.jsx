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

import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';

// 控制是否启用面板模式（false = 点击循环切换）
const PANEL_MODE = false;

const CYCLE = ['light', 'dark', 'auto'];

const useDark = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
};

const ThemeToggle = ({ theme, onThemeToggle, t }) => {
  const dark = useDark();
  const iconColor = dark ? '#ffffff' : '#111827';

  const currentIcon = useMemo(() => {
    if (theme === 'light') return <IconSun size={18} stroke={1.8} color={iconColor} />;
    if (theme === 'dark')  return <IconMoon size={18} stroke={1.8} color={iconColor} />;
    return <IconDeviceDesktop size={18} stroke={1.8} color={iconColor} />;
  }, [theme, iconColor]);

  const handleClick = () => {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    onThemeToggle(next);
  };

  return (
    <Button
      icon={currentIcon}
      aria-label={t('切换主题')}
      theme='borderless'
      type='tertiary'
      onClick={handleClick}
      style={{ color: iconColor }}
      className='!p-1.5 !rounded-full !bg-semi-color-fill-0 dark:!bg-semi-color-fill-1 hover:!bg-semi-color-fill-1 dark:hover:!bg-semi-color-fill-2'
    />
  );
};

export default ThemeToggle;
