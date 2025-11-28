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
import { Link, useNavigate } from 'react-router-dom';
import { Button, Dropdown } from '@douyinfe/semi-ui';
import { IconMenu } from '@douyinfe/semi-icons';
import SkeletonWrapper from '../components/SkeletonWrapper';

const Navigation = ({
  mainNavLinks,
  isMobile,
  isLoading,
  userState,
  pricingRequireAuth,
}) => {
  const navigate = useNavigate();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const renderNavLinks = () => {
    const baseClasses =
      'flex-shrink-0 flex items-center gap-1 font-semibold rounded-md transition-all duration-200 ease-in-out';
    const hoverClasses = 'hover:text-semi-color-primary';
    const spacingClasses = isMobile ? 'p-1' : 'p-2';

    const commonLinkClasses = `${baseClasses} ${spacingClasses} ${hoverClasses}`;

    return mainNavLinks.map((link) => {
      const linkContent = <span>{link.text}</span>;

      if (link.isExternal) {
        return (
          <a
            key={link.itemKey}
            href={link.externalLink}
            target='_blank'
            rel='noopener noreferrer'
            className={commonLinkClasses}
          >
            {linkContent}
          </a>
        );
      }

      let targetPath = link.to;
      if (link.itemKey === 'console' && !userState.user) {
        targetPath = '/login';
      }
      if (link.itemKey === 'pricing' && pricingRequireAuth && !userState.user) {
        targetPath = '/login';
      }

      return (
        <Link key={link.itemKey} to={targetPath} className={commonLinkClasses}>
          {linkContent}
        </Link>
      );
    });
  };

  // 移动端使用折叠菜单
  if (isMobile) {
    const handleNavClick = (link) => {
      // 先关闭菜单
      setDropdownVisible(false);

      // 延迟导航，确保菜单关闭动画完成
      setTimeout(() => {
        if (link.isExternal) {
          window.open(link.externalLink, '_blank', 'noopener,noreferrer');
        } else {
          let targetPath = link.to;
          if (link.itemKey === 'console' && !userState.user) {
            targetPath = '/login';
          }
          if (link.itemKey === 'pricing' && pricingRequireAuth && !userState.user) {
            targetPath = '/login';
          }
          navigate(targetPath);
        }
      }, 100);
    };

    return (
      <SkeletonWrapper
        loading={isLoading}
        type='navigation'
        count={1}
        width={40}
        height={40}
        isMobile={isMobile}
      >
        <Dropdown
          trigger='click'
          position='bottomRight'
          visible={dropdownVisible}
          onVisibleChange={(visible) => setDropdownVisible(visible)}
          clickToHide={true}
          render={
            <Dropdown.Menu className='!bg-semi-color-bg-overlay !border-semi-color-border !shadow-lg !rounded-lg dark:!bg-gray-700 dark:!border-gray-600'>
              {mainNavLinks.map((link) => (
                <Dropdown.Item
                  key={link.itemKey}
                  onClick={() => handleNavClick(link)}
                  className='!flex !items-center !gap-2 !px-3 !py-2 !text-sm !text-semi-color-text-0 dark:!text-gray-200 hover:!bg-semi-color-fill-1 dark:hover:!bg-gray-600 transition-colors'
                >
                  <span>{link.text}</span>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          }
        >
          <Button
            icon={<IconMenu className='text-lg' />}
            aria-label='导航菜单'
            theme='borderless'
            type='tertiary'
            onClick={() => setDropdownVisible(!dropdownVisible)}
            className='!p-1.5 !text-current focus:!bg-semi-color-fill-1 dark:focus:!bg-gray-700 !rounded-full !bg-semi-color-fill-0 dark:!bg-semi-color-fill-1 hover:!bg-semi-color-fill-1 dark:hover:!bg-semi-color-fill-2'
          />
        </Dropdown>
      </SkeletonWrapper>
    );
  }

  // 桌面端保持原有样式
  return (
    <nav className='flex flex-1 items-center gap-1 lg:gap-2 mx-2 md:mx-4 overflow-x-auto whitespace-nowrap scrollbar-hide'>
      <SkeletonWrapper
        loading={isLoading}
        type='navigation'
        count={4}
        width={60}
        height={16}
        isMobile={isMobile}
      >
        {renderNavLinks()}
      </SkeletonWrapper>
    </nav>
  );
};

export default Navigation;
