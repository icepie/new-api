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

import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import { IconChevronDown, IconUserCog, IconKey, IconCreditCard, IconLogout } from '@tabler/icons-react';
import { stringToColor } from '../../../helpers';
import SkeletonWrapper from '../components/SkeletonWrapper';
import GravatarAvatar from '../../common/avatar/GravatarAvatar';

const SPRING = 'cubic-bezier(0.34,1.56,0.64,1)';
const EASE_OUT = 'cubic-bezier(0.22,1,0.36,1)';

const useDark = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
};

const UserArea = ({
  userState,
  isLoading,
  isMobile,
  isSelfUseMode,
  logout,
  navigate,
  t,
}) => {
  const dropdownRef = useRef(null);
  const dark = useDark();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  if (isLoading) {
    return (
      <SkeletonWrapper
        loading={true}
        type='userArea'
        width={50}
        isMobile={isMobile}
      />
    );
  }

  if (userState.user) {
    return (
      <div className='relative' ref={dropdownRef}>
        <Button
          theme='borderless'
          type='tertiary'
          onClick={() => setOpen((v) => !v)}
          className='flex items-center gap-1.5 !p-1 !rounded-full hover:!bg-semi-color-fill-1 !bg-semi-color-fill-0 dark:!bg-semi-color-fill-1 dark:hover:!bg-semi-color-fill-2'
          style={{ transition: `background 0.2s ${SPRING}` }}
        >
          <GravatarAvatar
            email={userState.user.email}
            fallbackText={userState.user.username[0].toUpperCase()}
            size='extra-small'
            color={stringToColor(userState.user.username)}
            className='mr-1'
          />
          <span className='hidden md:inline mr-1' style={{ fontSize: 12, fontWeight: 600, color: dark ? '#ffffff' : '#111827' }}>
            {userState.user.username}
          </span>
          <IconChevronDown size={14} stroke={1.8} style={{ color: dark ? '#ffffff' : '#111827' }} />
        </Button>

        {/* 下拉面板 */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 160,
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
          {[
            { icon: <IconUserCog size={16} stroke={1.8} />,    label: t('个人设置'), onClick: () => { navigate('/console/personal'); setOpen(false); } },
            { icon: <IconKey size={16} stroke={1.8} />,        label: t('令牌管理'),  onClick: () => { navigate('/console/token');    setOpen(false); } },
            { icon: <IconCreditCard size={16} stroke={1.8} />, label: t('钱包管理'),  onClick: () => { navigate('/console/topup');    setOpen(false); } },
          ].map((item, i) => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{
                transitionDelay: open ? `${i * 35}ms` : '0ms',
                transform: open ? 'translateX(0)' : 'translateX(12px)',
                opacity: open ? 1 : 0,
                transition: `transform 0.3s ${SPRING}, opacity 0.2s ${EASE_OUT}, background 0.18s ${SPRING}`,
                width: '100%',
                color: dark ? '#ffffff' : '#111827',
              }}
              className='flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-left select-none hover:bg-black/5 dark:hover:bg-white/8'
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {item.icon}
              <span className='flex-1'>{item.label}</span>
            </button>
          ))}
          {/* 分隔线 + 退出 */}
          <div style={{ borderTop: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', margin: '4px 0' }} />
          <button
            onClick={() => { logout(); setOpen(false); }}
            style={{
              transitionDelay: open ? '105ms' : '0ms',
              transform: open ? 'translateX(0)' : 'translateX(12px)',
              opacity: open ? 1 : 0,
              transition: `transform 0.3s ${SPRING}, opacity 0.2s ${EASE_OUT}, background 0.18s ${SPRING}`,
              width: '100%',
              color: '#ef4444',
            }}
            className='flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-left select-none hover:bg-red-50 dark:hover:bg-red-500/10'
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <IconLogout size={16} stroke={1.8} />
            <span className='flex-1'>{t('退出')}</span>
          </button>
        </div>
      </div>
    );
  } else {
    const showRegisterButton = !isSelfUseMode;

    const commonSizingAndLayoutClass =
      'flex items-center justify-center !py-[10px] !px-1.5';

    const loginButtonSpecificStyling =
      '!bg-white dark:!bg-gray-800 !border !border-gray-300 dark:!border-gray-600 hover:!bg-gray-50 dark:hover:!bg-gray-700 transition-colors';
    let loginButtonClasses = `${commonSizingAndLayoutClass} ${loginButtonSpecificStyling}`;

    let registerButtonClasses = `${commonSizingAndLayoutClass} !bg-black dark:!bg-white hover:!bg-gray-800 dark:hover:!bg-gray-200 transition-colors`;

    const loginButtonTextSpanClass =
      '!text-xs !text-gray-900 dark:!text-gray-100 !p-1.5';
    const registerButtonTextSpanClass = '!text-xs !text-white dark:!text-black !p-1.5';

    if (showRegisterButton) {
      if (isMobile) {
        loginButtonClasses += ' !rounded-full';
      } else {
        loginButtonClasses += ' !rounded-l-full !rounded-r-none';
      }
      registerButtonClasses += ' !rounded-r-full !rounded-l-none';
    } else {
      loginButtonClasses += ' !rounded-full';
    }

    return (
      <div className='flex items-center'>
        <Link to='/login' className='flex'>
          <Button
            theme='borderless'
            type='tertiary'
            className={`${loginButtonClasses} auth-page-button-white`}
            style={{
              backgroundColor: 'white',
              borderColor: '#d1d5db',
              color: '#111827',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <span className={loginButtonTextSpanClass}>{t('登录')}</span>
          </Button>
        </Link>
        {showRegisterButton && (
          <div className='hidden md:block'>
            <Link to='/register' className='flex -ml-px'>
              <Button
                theme='solid'
                type='primary'
                className={`${registerButtonClasses} auth-page-button-black`}
                style={{
                  backgroundColor: 'black',
                  color: 'white',
                  borderColor: 'black',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1f2937';
                  e.currentTarget.style.borderColor = '#1f2937';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'black';
                  e.currentTarget.style.borderColor = 'black';
                }}
              >
                <span className={registerButtonTextSpanClass}>{t('注册')}</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }
};

export default UserArea;
