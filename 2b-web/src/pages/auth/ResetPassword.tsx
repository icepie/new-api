import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Steps } from 'antd';
import { MailOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { sendPasswordResetEmail, resetPassword } from '../../services/auth';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');

  const onSendEmail = async (values) => {
    setLoading(true);
    try {
      const res = await sendPasswordResetEmail(values.email);

      if (res.success) {
        message.success('重置邮件已发送,请查收');
        setEmail(values.email);
        setCurrentStep(1);
      } else {
        message.error(res.message || '发送失败');
      }
    } catch (error) {
      message.error('发送失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async (values) => {
    setLoading(true);
    try {
      const res = await resetPassword({
        email: email,
        token: values.token,
        password: values.password,
      });

      if (res.success) {
        message.success('密码重置成功,请登录');
        navigate('/login');
      } else {
        message.error(res.message || '重置失败');
      }
    } catch (error) {
      message.error('重置失败,请重试');
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
          maxWidth: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
            重置密码
          </h1>
        </div>

        <Steps
          current={currentStep}
          items={[
            { title: '验证邮箱' },
            { title: '重置密码' },
          ]}
          style={{ marginBottom: 32 }}
        />

        {currentStep === 0 && (
          <Form
            name="send_email"
            onFinish={onSendEmail}
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
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
              >
                发送重置邮件
              </Button>
            </Form.Item>
          </Form>
        )}

        {currentStep === 1 && (
          <Form
            name="reset_password"
            onFinish={onResetPassword}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="token"
              rules={[{ required: true, message: '请输入验证码' }]}
            >
              <Input
                prefix={<SafetyOutlined />}
                placeholder="邮件中的验证码"
              />
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
                placeholder="新密码"
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

            <Form.Item>
              <Button
                type="link"
                onClick={() => setCurrentStep(0)}
                block
              >
                返回上一步
              </Button>
            </Form.Item>
          </Form>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login">返回登录</Link>
        </div>
      </Card>
    </div>
  );
};

export default ResetPassword;
