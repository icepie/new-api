import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Input, Form, message, Space, Typography } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { getUser } from '../../utils/auth';
import request from '../../utils/request';
import { starChangePasswordAdapter, starSendEmailCodeAdapter } from '../../helpers/starAuthAdapter';
import GravatarAvatar from '../../components/common/GravatarAvatar';
import { stringToColor } from '../../utils/gravatar';

const { Title, Text, Paragraph } = Typography;

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [passwordForm] = Form.useForm();
  const [usernameForm] = Form.useForm();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const res = await request.get('/api/user/self');
      if (res.success) {
        setUser(res.data);
      }
    } catch (error) {
      message.error('加载用户信息失败');
    }
  };

  const handlePasswordChange = async (values: any) => {
    setLoading(true);
    try {
      const res = await starChangePasswordAdapter(user.email, values.code, values.newPassword);
      if (res.success) {
        message.success('密码修改成功');
        passwordForm.resetFields();
      } else {
        message.error(res.message || '密码修改失败');
      }
    } catch (error) {
      message.error('密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!user?.email) {
      message.error('未获取到邮箱信息');
      return;
    }

    setSendingCode(true);
    try {
      const res = await starSendEmailCodeAdapter(user.email, 'change_password');
      if (res.success) {
        message.success('验证码已发送，请查收邮件');
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev === 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        message.error(res.message || '发送验证码失败');
      }
    } catch (error) {
      message.error('发送验证码失败，请重试');
    } finally {
      setSendingCode(false);
    }
  };

  const handleUsernameChange = async (values: any) => {
    setLoading(true);
    try {
      const res = await request.put('/api/user/self', {
        username: values.username,
      });
      if (res.success) {
        message.success('用户名修改成功');
        loadUserData();
      }
    } catch (error) {
      message.error('用户名修改失败');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarText = () => {
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return 'NA';
  };

  const getRoleTag = () => {
    if (user?.role === 100) {
      return <Tag color="red">超级管理员</Tag>;
    } else if (user?.role === 10) {
      return <Tag color="blue">管理员</Tag>;
    }
    return <Tag>普通用户</Tag>;
  };

  const renderQuota = (quota: number) => {
    return `$${(quota / 500000).toFixed(2)}`;
  };

  if (!user) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Text>加载中...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* 用户信息卡片 */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            padding: '40px 24px',
            marginTop: -24,
            marginLeft: -24,
            marginRight: -24,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <GravatarAvatar
              email={user?.email}
              fallbackText={getAvatarText()}
              color={stringToColor(user?.username || '')}
              size={80}
              style={{
                fontSize: 32,
              }}
            />
            <div style={{ flex: 1 }}>
              <Title level={2} style={{ color: 'white', margin: 0 }}>
                {user.username}
              </Title>
              <div style={{ marginTop: 8 }}>
                {getRoleTag()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <Text type="secondary">用户ID</Text>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{user.id}</div>
          </div>
          <div>
            <Text type="secondary">邮箱</Text>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{user.email || '未设置'}</div>
          </div>
          <div>
            <Text type="secondary">剩余额度</Text>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#52c41a' }}>
              {renderQuota(user.quota)}
            </div>
          </div>
          <div>
            <Text type="secondary">已用额度</Text>
            <div style={{ fontSize: 16, fontWeight: 500 }}>
              {renderQuota(user.used_quota)}
            </div>
          </div>
        </div>
      </Card>

      {/* 账户管理 */}
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>账户管理</span>
          </Space>
        }
        style={{ borderRadius: 16 }}
      >
        {/* 修改用户名 */}
        <Card type="inner" title="修改用户名" style={{ marginBottom: 16 }}>
          <Form
            form={usernameForm}
            layout="inline"
            onFinish={handleUsernameChange}
            initialValues={{ username: user.username }}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
              style={{ flex: 1 }}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="新用户名"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                修改
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 修改密码 */}
        <Card type="inner" title="修改密码">
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handlePasswordChange}
          >
            <Form.Item label="邮箱">
              <Input
                disabled
                value={user?.email || ''}
                prefix={<MailOutlined />}
                placeholder="自动从账户信息获取"
              />
            </Form.Item>

            <Form.Item label="邮箱验证码">
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item
                  name="code"
                  rules={[{ required: true, message: '请输入验证码' }]}
                  style={{ flex: 1, marginBottom: 0 }}
                >
                  <Input
                    prefix={<SafetyOutlined />}
                    placeholder="请输入验证码"
                  />
                </Form.Item>
                <Button
                  onClick={handleSendCode}
                  disabled={countdown > 0 || sendingCode}
                  loading={sendingCode}
                  style={{ minWidth: 100 }}
                >
                  {countdown > 0 ? `${countdown}秒` : '获取验证码'}
                </Button>
              </div>
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6位' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入新密码"
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请再次输入新密码"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Card>
    </div>
  );
};

export default Profile;
