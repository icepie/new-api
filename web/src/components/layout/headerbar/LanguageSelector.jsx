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

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconLanguage } from '@tabler/icons-react';

const SPRING = 'cubic-bezier(0.34,1.56,0.64,1)';
const EASE_OUT = 'cubic-bezier(0.22,1,0.36,1)';

const useDark = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
};

const LANGS = [
  { key: 'zh-CN', label: '简体中文' },
  { key: 'zh-TW', label: '繁體中文' },
  { key: 'en',    label: 'English' },
  { key: 'fr',    label: 'Français' },
  { key: 'ja',    label: '日本語' },
  { key: 'ru',    label: 'Русский' },
  { key: 'vi',    label: 'Tiếng Việt' },
];

const LanguageSelector = ({ currentLang, onLanguageChange, t }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const dark = useDark();

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
        icon={<IconLanguage size={18} stroke={1.8} color={dark ? '#ffffff' : '#111827'} />}
        aria-label={t('common.changeLanguage')}
        theme='borderless'
        type='tertiary'
        onClick={() => setOpen((v) => !v)}
        style={{ color: dark ? '#ffffff' : '#111827', transition: `background 0.2s ${SPRING}` }}
        className='!p-1.5 !rounded-full !bg-semi-color-fill-0 dark:!bg-semi-color-fill-1 hover:!bg-semi-color-fill-1 dark:hover:!bg-semi-color-fill-2'
      />

      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          minWidth: 140,
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
        {LANGS.map((lang, i) => {
          const active = currentLang === lang.key;
          return (
            <button
              key={lang.key}
              onClick={() => { onLanguageChange(lang.key); setOpen(false); }}
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
              className={`flex items-center px-4 py-2 text-sm text-left select-none
                ${active ? 'font-semibold' : 'font-medium text-gray-800 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-white/8'}`}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSelector;
