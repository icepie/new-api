import React from 'react';
import { Layout, Button, Dropdown, Menu } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  HomeOutlined,
  DollarOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { logout, getUser, isAuthenticated } from '../../utils/auth';
import GravatarAvatar from '../common/GravatarAvatar';
import { stringToColor } from '../../utils/gravatar';

const { Header, Content } = Layout;

const TopNavLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const authenticated = isAuthenticated();

  const handleLogout = () => {
    logout();
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
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          API Gateway
        </div>
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
          }}
        />
        {authenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="primary" onClick={() => navigate('/keys')}>
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
                <span>{user?.username || '用户'}</span>
              </div>
            </Dropdown>
          </div>
        ) : (
          <Button type="primary" onClick={() => navigate('/login')}>
            登录
          </Button>
        )}
      </Header>
      <Content
        style={{
          marginTop: 64,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  );
};

export default TopNavLayout;
