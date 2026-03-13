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

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useActualTheme } from '../../../context/Theme';

const SPRING = 'cubic-bezier(0.34,1.56,0.64,1)';
const EASE_OUT = 'cubic-bezier(0.22,1,0.36,1)';

const ThemeToggle = ({ theme, onThemeToggle, t }) => {
  const actualTheme = useActualTheme();
  const dark = actualTheme === 'dark';
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const themeOptions = useMemo(() => [
    { key: 'light', icon: <Sun size={16} />,    label: t('浅色模式'), description: t('始终使用浅色主题') },
    { key: 'dark',  icon: <Moon size={16} />,   label: t('深色模式'), description: t('始终使用深色主题') },
    { key: 'auto',  icon: <Monitor size={16} />, label: t('自动模式'), description: t('跟随系统主题设置') },
  ], [t]);

  const currentIcon = useMemo(() => {
    const opt = themeOptions.find((o) => o.key === theme);
    return opt ? React.cloneElement(opt.icon, { size: 18 }) : <Monitor size={18} />;
  }, [theme, themeOptions]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Button
        icon={currentIcon}
        aria-label={t('切换主题')}
        theme='borderless'
        type='tertiary'
        onClick={() => setOpen((v) => !v)}
        className='!p-1.5 !text-current !rounded-full !bg-semi-color-fill-0 dark:!bg-semi-color-fill-1 hover:!bg-semi-color-fill-1 dark:hover:!bg-semi-color-fill-2'
        style={{ transition: `background 0.2s ${SPRING}` }}
      />

      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          minWidth: 180,
          transformOrigin: 'top right',
          transform: open ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(-8px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: `transform 0.28s ${SPRING}, opacity 0.2s ${EASE_OUT}`,
          zIndex: 200,
          backgroundColor: dark ? '#27272a' : '#ffffff',
        }}
        className='rounded-2xl shadow-xl overflow-hidden py-1.5'
      >
        {themeOptions.map((opt, i) => {
          const active = theme === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => { onThemeToggle(opt.key); setOpen(false); }}
              style={{
                transitionDelay: open ? `${i * 25}ms` : '0ms',
                transform: open ? 'translateX(0)' : 'translateX(12px)',
                opacity: open ? 1 : 0,
                transition: `transform 0.3s ${SPRING}, opacity 0.2s ${EASE_OUT}, background 0.18s ${SPRING}`,
                width: '100%',
                ...(active
                  ? { backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', color: dark ? '#ffffff' : '#111827' }
                  : {}
                ),
              }}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm text-left select-none
                ${active ? 'font-semibold' : 'text-gray-800 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-white/8'}`}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {opt.icon}
              <div className='flex flex-col'>
                <span>{opt.label}</span>
                <span className='text-xs text-gray-400 dark:text-gray-500 font-normal'>{opt.description}</span>
              </div>
            </button>
          );
        })}

      </div>
    </div>
  );
};

export default ThemeToggle;
