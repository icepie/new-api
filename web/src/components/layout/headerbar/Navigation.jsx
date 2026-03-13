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

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button, Dropdown } from '@douyinfe/semi-ui';
import { IconMenu } from '@douyinfe/semi-icons';
import {
  Home,
  LayoutDashboard,
  CircleDollarSign,
  BookOpen,
  FileCode2,
  Info,
  ExternalLink,
} from 'lucide-react';
import SkeletonWrapper from '../components/SkeletonWrapper';

const NAV_ICONS = {
  home: Home,
  console: LayoutDashboard,
  pricing: CircleDollarSign,
  docs: BookOpen,
  apiDocs: FileCode2,
  about: Info,
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
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const isActive = (link) => {
    if (link.isExternal) return false;
    const path = link.to;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getTargetPath = (link) => {
    if (link.itemKey === 'console' && !userState.user) return '/login';
    if (link.itemKey === 'pricing' && pricingRequireAuth && !userState.user) return '/login';
    return link.to;
  };

  const renderNavLinks = () =>
    mainNavLinks.map((link) => {
      const Icon = NAV_ICONS[link.itemKey];
      const active = isActive(link);

      const content = (
        <>
          {Icon && <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />}
          <span>{link.text}</span>
          {link.isExternal && <ExternalLink size={11} className='opacity-50' />}
        </>
      );

      const cls = `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
        ${active
          ? 'bg-black/8 dark:bg-white/10 text-gray-900 dark:text-white'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8'
        }`;

      if (link.isExternal) {
        return (
          <a key={link.itemKey} href={link.externalLink} target='_blank' rel='noopener noreferrer' className={cls}>
            {content}
          </a>
        );
      }

      return (
        <Link key={link.itemKey} to={getTargetPath(link)} className={cls}>
          {content}
        </Link>
      );
    });

  // 移动端折叠菜单
  if (isMobile) {
    const handleNavClick = (link) => {
      setDropdownVisible(false);
      setTimeout(() => {
        if (link.isExternal) {
          window.open(link.externalLink, '_blank', 'noopener,noreferrer');
        } else {
          navigate(getTargetPath(link));
        }
      }, 100);
    };

    return (
      <SkeletonWrapper loading={isLoading} type='navigation' count={1} width={40} height={40} isMobile={isMobile}>
        <Dropdown
          trigger='click'
          position='bottomRight'
          visible={dropdownVisible}
          onVisibleChange={setDropdownVisible}
          clickToHide={true}
          render={
            <Dropdown.Menu className='!bg-semi-color-bg-overlay !border-semi-color-border !shadow-lg !rounded-xl dark:!bg-gray-800 dark:!border-gray-700 !min-w-40'>
              {mainNavLinks.map((link) => {
                const Icon = NAV_ICONS[link.itemKey];
                const active = isActive(link);
                return (
                  <Dropdown.Item
                    key={link.itemKey}
                    onClick={() => handleNavClick(link)}
                    className={`!flex !items-center !gap-2.5 !px-3 !py-2 !text-sm transition-colors
                      ${active
                        ? '!text-semi-color-primary dark:!text-blue-400 !font-medium'
                        : '!text-semi-color-text-0 dark:!text-gray-200 hover:!bg-semi-color-fill-1 dark:hover:!bg-gray-700'
                      }`}
                  >
                    {Icon && <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />}
                    <span>{link.text}</span>
                    {link.isExternal && <ExternalLink size={11} className='opacity-40 ml-auto' />}
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Menu>
          }
        >
          <Button
            icon={<IconMenu className='text-lg' />}
            aria-label='导航菜单'
            theme='borderless'
            type='tertiary'
            onClick={() => setDropdownVisible(!dropdownVisible)}
            className='!p-1.5 !text-current !rounded-full !bg-semi-color-fill-0 dark:!bg-semi-color-fill-1 hover:!bg-semi-color-fill-1 dark:hover:!bg-semi-color-fill-2'
          />
        </Dropdown>
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
