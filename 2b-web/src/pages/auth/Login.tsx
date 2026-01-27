import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { login, starLogin } from '../../services/auth';
import { setToken, setUser } from '../../utils/auth';
import { getStatus } from '../../services/status';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [starEnabled, setStarEnabled] = useState(false);

  // 获取系统状态,检查 star 登录是否启用
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await getStatus();
        if (res.success && res.data) {
          // 检查是否启用 star 登录
          const enabled = res.data.star_enabled !== false;
          setStarEnabled(enabled);
        }
      } catch (error) {
        console.error('获取系统状态失败:', error);
        // 失败时默认使用普通登录
        setStarEnabled(false);
      } finally {
        setStatusLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const onFinishNormal = async (values) => {
    setLoading(true);
    try {
      const res = await login({
        username: values.username,
        password: values.password,
      });

      if (res.success && res.data) {
        setUser(res.data);
        message.success('登录成功');
        window.location.href = '/';
      } else {
        message.error(res.message || '登录失败');
      }
    } catch (error) {
      message.error('登录失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  const onFinishStar = async (values) => {
    setLoading(true);
    try {
      const res = await starLogin({
        username: values.username,
        password: values.password,
      });

      if (res.success && res.data) {
        setUser(res.data);
        message.success('登录成功');
        window.location.href = '/';
      } else {
        message.error(res.message || '登录失败');
      }
    } catch (error) {
      message.error('登录失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  // 渲染登录表单
  const renderLoginForm = () => {
    const onFinish = starEnabled ? onFinishStar : onFinishNormal;

    return (
      <Form
        name="login"
        onFinish={onFinish}
        autoComplete="off"
        size="large"
      >
        <Form.Item
          name="username"
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
    );
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
          <h1 style={{ fontSize: 32, fontWeight: 'bold', margin: 0 }}>
            欢迎登录
          </h1>
          {starEnabled && (
            <p style={{ color: '#666', fontSize: 16, marginTop: 8 }}>
              使用 Star 登录
            </p>
          )}
        </div>

        {statusLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {renderLoginForm()}

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 15 }}>
              <Link to="/reset-password">忘记密码?</Link>
              <span style={{ margin: '0 8px' }}>|</span>
              <Link to="/register">注册账号</Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Login;
