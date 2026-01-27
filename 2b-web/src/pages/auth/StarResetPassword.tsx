import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { starResetPasswordAdapter, starSendEmailCodeAdapter } from '../../helpers/starAuthAdapter';

const StarResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [form] = Form.useForm();

  // 发送验证码
  const handleSendCode = async () => {
    try {
      const email = await form.validateFields(['email']);
      setSendingCode(true);
      const res = await starSendEmailCodeAdapter(email.email, 'back_password');
      if (res.success) {
        message.success('验证码已发送，请注意查收');
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
    } catch (error: any) {
      if (error.errorFields) {
        message.error('请先输入有效的邮箱地址');
      } else {
        message.error('发送验证码失败，请重试');
      }
    } finally {
      setSendingCode(false);
    }
  };

  // 重置密码
  const handleResetPassword = async (values: any) => {
    setLoading(true);
    try {
      const res = await starResetPasswordAdapter(values.email, values.code, values.password);
      if (res.success) {
        message.success('密码重置成功！请使用新密码登录');
        navigate('/login');
      } else {
        message.error(res.message || '密码重置失败');
      }
    } catch (error) {
      message.error('密码重置失败，请重试');
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
            重置密码
          </h1>
        </div>

        <Form
          form={form}
          name="reset-password"
          onFinish={handleResetPassword}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="注册时使用的邮箱"
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item
                name="code"
                rules={[{ required: true, message: '请输入验证码' }]}
                style={{ flex: 1, marginBottom: 0 }}
              >
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="邮箱验证码"
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
            name="password"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="新密码（至少6个字符）"
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="确认新密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              重置密码
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login">返回登录</Link>
          <span style={{ margin: '0 8px' }}>|</span>
          <Link to="/register">注册账号</Link>
        </div>
      </Card>
    </div>
  );
};

export default StarResetPassword;
