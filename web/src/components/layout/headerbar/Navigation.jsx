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

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import { IconMenu, IconClose } from '@douyinfe/semi-icons';
import {
  IconHome,
  IconLayoutDashboard,
  IconCurrencyDollar,
  IconBook,
  IconCode,
  IconInfoCircle,
  IconExternalLink,
} from '@tabler/icons-react';
import SkeletonWrapper from '../components/SkeletonWrapper';

const NAV_ICONS = {
  home: IconHome,
  console: IconLayoutDashboard,
  pricing: IconCurrencyDollar,
  docs: IconBook,
  apiDocs: IconCode,
  about: IconInfoCircle,
};

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

const Navigation = ({
  mainNavLinks,
  isMobile,
  isLoading,
  userState,
  pricingRequireAuth,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const dark = useDark();

  const isActive = (link) => {
    if (link.isExternal) return false;
    if (link.to === '/') return location.pathname === '/';
    return location.pathname.startsWith(link.to);
  };

  const getTargetPath = (link) => {
    if (link.itemKey === 'console' && !userState.user) return '/login';
    if (link.itemKey === 'pricing' && pricingRequireAuth && !userState.user) return '/login';
    return link.to;
  };

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // 路由变化关闭
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const renderNavLinks = () =>
    mainNavLinks.map((link) => {
      const Icon = NAV_ICONS[link.itemKey];
      const active = isActive(link);

      const content = (
        <>
          {Icon && <Icon size={15} stroke={1.8} />}
          <span>{link.text}</span>
          {link.isExternal && <IconExternalLink size={11} stroke={1.8} className='opacity-50' />}
        </>
      );

      const cls = `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold select-none`;

      const style = {
        transition: `background 0.25s ${SPRING}, color 0.2s ${SPRING}, transform 0.2s ${SPRING}`,
        ...(active
          ? { backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', color: dark ? '#ffffff' : '#111827' }
          : { color: dark ? '#ffffff' : '#111827' }
        ),
      };
      const springProps = {
        style,
        onMouseEnter: (e) => { e.currentTarget.style.transform = 'scale(1.06)'; },
        onMouseLeave: (e) => { e.currentTarget.style.transform = 'scale(1)'; },
        onMouseDown:  (e) => { e.currentTarget.style.transform = 'scale(0.94)'; },
        onMouseUp:    (e) => { e.currentTarget.style.transform = 'scale(1.06)'; },
      };

      if (link.isExternal) {
        return <a key={link.itemKey} href={link.externalLink} target='_blank' rel='noopener noreferrer' className={cls} {...springProps}>{content}</a>;
      }
      return <Link key={link.itemKey} to={getTargetPath(link)} className={cls} {...springProps}>{content}</Link>;
    });

  // 移动端
  if (isMobile) {
    const handleNavClick = (link) => {
      setOpen(false);
      setTimeout(() => {
        if (link.isExternal) window.open(link.externalLink, '_blank', 'noopener,noreferrer');
        else navigate(getTargetPath(link));
      }, 180);
    };

    return (
      <SkeletonWrapper loading={isLoading} type='navigation' count={1} width={40} height={40} isMobile={isMobile}>
        <div ref={menuRef} className='relative'>
          {/* 触发按钮 */}
          <Button
            icon={
              <span style={{ display: 'inline-flex', transition: `transform 0.3s ${SPRING}`, transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                {open ? <IconClose className='text-lg' /> : <IconMenu className='text-lg' />}
              </span>
            }
            aria-label='导航菜单'
            theme='borderless'
            type='tertiary'
            onClick={() => setOpen((v) => !v)}
            className='!p-1.5 !text-current !rounded-full !bg-semi-color-fill-0 dark:!bg-semi-color-fill-1 hover:!bg-semi-color-fill-1 dark:hover:!bg-semi-color-fill-2'
            style={{ transition: `background 0.2s ${SPRING}, transform 0.2s ${SPRING}` }}
          />

          {/* 下拉面板 */}
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
            className='rounded-2xl shadow-xl overflow-hidden py-1.5 bg-white dark:bg-zinc-800'
          >
            {mainNavLinks.map((link, i) => {
              const Icon = NAV_ICONS[link.itemKey];
              const active = isActive(link);
              return (
                <button
                  key={link.itemKey}
                  onClick={() => handleNavClick(link)}
                  style={{
                    transitionDelay: open ? `${i * 35}ms` : '0ms',
                    transform: open ? 'translateX(0)' : 'translateX(12px)',
                    opacity: open ? 1 : 0,
                    transition: `transform 0.3s ${SPRING}, opacity 0.2s ${EASE_OUT}, background 0.18s ${SPRING}`,
                    width: '100%',
                    ...(active
                      ? { backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', color: dark ? '#ffffff' : '#111827' }
                      : {}
                    ),
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-left select-none
                    ${active ? '' : 'text-gray-800 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-white/8'}`}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {Icon && <Icon size={16} stroke={1.8} />}
                  <span className='flex-1'>{link.text}</span>
                  {link.isExternal && <IconExternalLink size={12} stroke={1.8} className='opacity-40' />}
                </button>
              );
            })}
          </div>
        </div>
      </SkeletonWrapper>
    );
  }

  // 桌面端
  return (
    <nav className='flex flex-1 items-center gap-0.5 mx-2 md:mx-4 overflow-x-auto whitespace-nowrap scrollbar-hide'>
      <SkeletonWrapper loading={isLoading} type='navigation' count={4} width={80} height={32} isMobile={isMobile}>
        {renderNavLinks()}
      </SkeletonWrapper>
    </nav>
  );
};

export default Navigation;
