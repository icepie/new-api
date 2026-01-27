import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { starRegisterAdapter, starSendEmailCodeAdapter } from '../../helpers/starAuthAdapter';

const StarRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [form] = Form.useForm();

  // 从 URL 参数获取 aff 码并保存到 localStorage
  useEffect(() => {
    const affCode = searchParams.get('aff');
    if (affCode) {
      localStorage.setItem('aff', affCode);
    }
  }, [searchParams]);

  // 发送验证码
  const handleSendCode = async () => {
    try {
      const email = await form.validateFields(['email']);
      setSendingCode(true);
      const res = await starSendEmailCodeAdapter(email.email, 'register');
      if (res.success) {
        message.success('验证码已发送到您的邮箱，请查收！');
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

  // 注册
  const handleRegister = async (values: any) => {
    setLoading(true);
    try {
      const affCode = searchParams.get('aff') || localStorage.getItem('aff') || '';
      const res = await starRegisterAdapter(values.email, values.code, values.password, affCode);
      if (res.success) {
        message.success('注册成功！');
        navigate('/login');
      } else {
        message.error(res.message || '注册失败');
      }
    } catch (error) {
      message.error('注册失败，请重试');
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
            注册账号
          </h1>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={handleRegister}
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
              placeholder="邮箱地址"
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
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码（至少6个字符）"
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
              placeholder="确认密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              注册
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          已有账号? <Link to="/login">立即登录</Link>
        </div>
      </Card>
    </div>
  );
};

export default StarRegister;
