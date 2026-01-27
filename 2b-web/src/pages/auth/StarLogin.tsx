import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { starLoginAdapter } from '../../helpers/starAuthAdapter';
import { setUser } from '../../utils/auth';

const StarLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 账号密码登录
  const handlePasswordLogin = async (values: any) => {
    setLoading(true);
    try {
      const res = await starLoginAdapter(values.usernameOrEmail, values.password);
      if (res.success && res.data) {
        setUser(res.data);
        message.success('登录成功');
        navigate('/');
      } else {
        message.error(res.message || '登录失败');
      }
    } catch (error) {
      message.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      padding: '20px',
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
            欢迎登录
          </h1>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={handlePasswordLogin}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="usernameOrEmail"
            rules={[{ required: true, message: '请输入用户名或邮箱' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名或邮箱"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/reset-password">忘记密码?</Link>
          <span style={{ margin: '0 8px' }}>|</span>
          <Link to="/register">注册账号</Link>
        </div>
      </Card>
    </div>
  );
};

export default StarLogin;
