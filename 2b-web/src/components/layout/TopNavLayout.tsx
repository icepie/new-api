import React, { useState } from 'react';
import { Layout, Button, Dropdown, Menu, Drawer } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  HomeOutlined,
  DollarOutlined,
  KeyOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { logout, getUser, isAuthenticated } from '../../utils/auth';
import GravatarAvatar from '../common/GravatarAvatar';
import { stringToColor } from '../../utils/gravatar';
import './TopNavLayout.css';

const { Header, Content } = Layout;

const TopNavLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const authenticated = isAuthenticated();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const navMenuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/pricing',
      icon: <DollarOutlined />,
      label: '价格',
    },
    {
      key: '/keys',
      icon: <KeyOutlined />,
      label: '密钥管理',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    setMobileMenuOpen(false);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '0 16px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onClick={() => navigate('/')}
        >
          <img src="/logo.svg" alt="Logo" style={{ height: 32 }} />
          <span style={{ fontSize: 18, fontWeight: 'normal', fontStyle: 'italic' }}>
            NiceRouter Enterprise
          </span>
        </div>

        {/* Desktop Menu */}
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={navMenuItems}
          onClick={handleMenuClick}
          style={{
            border: 'none',
            background: 'transparent',
            flex: 1,
            justifyContent: 'center',
            display: 'none',
          }}
          className="desktop-menu"
        />

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {authenticated ? (
            <>
              <Button
                type="primary"
                onClick={() => navigate('/keys')}
                style={{ display: 'none' }}
                className="desktop-button"
              >
                控制台
              </Button>
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GravatarAvatar
                    email={user?.email}
                    fallbackText={user?.username ? user.username.slice(0, 1).toUpperCase() : 'U'}
                    color={stringToColor(user?.username || '')}
                    size="default"
                  />
                  <span style={{ display: 'none' }} className="desktop-username">
                    {user?.username || '用户'}
                  </span>
                </div>
              </Dropdown>
            </>
          ) : (
            <Button type="primary" onClick={() => navigate('/login')}>
              登录
            </Button>
          )}

          {/* Mobile Menu Button */}
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileMenuOpen(true)}
            style={{ display: 'none' }}
            className="mobile-menu-button"
          />
        </div>
      </Header>
      <Content
        style={{
          marginTop: 64,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Content>

      {/* Mobile Drawer Menu */}
      <Drawer
        title="菜单"
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
      >
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={navMenuItems}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
        {authenticated && (
          <div style={{ marginTop: 16, padding: '0 16px' }}>
            <Button
              type="primary"
              block
              onClick={() => {
                navigate('/keys');
                setMobileMenuOpen(false);
              }}
            >
              控制台
            </Button>
          </div>
        )}
      </Drawer>
    </Layout>
  );
};

export default TopNavLayout;
