import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Tag,
  DatePicker,
  Select,
  Statistic,
  Row,
  Col,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getTokens,
  createToken,
  deleteToken,
  getTokenUsage,
  getTokenStats,
} from '../../services/token';

const { RangePicker } = DatePicker;
const { Option } = Select;

const Keys = () => {
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [usageModalVisible, setUsageModalVisible] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [usageData, setUsageData] = useState([]);
  const [usageStats, setUsageStats] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [form] = Form.useForm();
  const [usageFilters, setUsageFilters] = useState({
    startTime: dayjs().subtract(7, 'day'),
    endTime: dayjs(),
    modelType: 'all',
    modelName: 'all',
  });

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const res = await getTokens();
      if (res.success && res.data) {
        setTokens(res.data.items || []);
      } else {
        message.error('获取密钥列表失败');
      }
    } catch (error) {
      message.error('获取密钥列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async (values) => {
    try {
      const res = await createToken({
        name: values.name,
        unlimited_quota: true,
      });

      if (res.success) {
        message.success('创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        fetchTokens();
      } else {
        message.error(res.message || '创建失败');
      }
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleDeleteToken = async (id) => {
    try {
      const res = await deleteToken(id);
      if (res.success) {
        message.success('删除成功');
        fetchTokens();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleViewUsage = async (token) => {
    setSelectedToken(token);
    setUsageModalVisible(true);
    await fetchUsageData(token.key);
  };

  const fetchUsageData = async (tokenKey: string) => {
    setUsageLoading(true);
    try {
      const params = {
        page: 1,
        pageSize: 100,
        tokenName: tokenKey,
        startTimestamp: usageFilters.startTime.unix(),
        endTimestamp: usageFilters.endTime.unix(),
      };

      if (usageFilters.modelType !== 'all') {
        params.type = usageFilters.modelType;
      }

      if (usageFilters.modelName !== 'all') {
        params.modelName = usageFilters.modelName;
      }

      const [usageRes, statsRes] = await Promise.all([
        getTokenUsage(params),
        getTokenStats(params),
      ]);

      if (usageRes.success && usageRes.data) {
        setUsageData(usageRes.data.items || []);
      }

      if (statsRes.success && statsRes.data) {
        setUsageStats(statsRes.data);
      }
    } catch (error) {
      message.error('获取使用明细失败');
    } finally {
      setUsageLoading(false);
    }
  };

  const handleCopyKey = (key) => {
    // 使用更可靠的复制方法
    const textArea = document.createElement('textarea');
    textArea.value = key;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      message.success('已复制到剪贴板');
    } catch (err) {
      // 如果execCommand失败，尝试使用clipboard API
      navigator.clipboard.writeText(key).then(
        () => message.success('已复制到剪贴板'),
        () => message.error('复制失败，请手动复制')
      );
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '密钥',
      dataIndex: 'key',
      key: 'key',
      width: 300,
      render: (text, record) => {
        const isVisible = visibleKeys.has(record.id);
        const fullKey = `sk-${text}`;
        const displayKey = isVisible ? fullKey : `sk-${text.substring(0, 20)}...`;

        return (
          <Space>
            <span style={{ fontFamily: 'monospace' }}>
              {displayKey}
            </span>
            <Button
              type="text"
              size="small"
              icon={isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => toggleKeyVisibility(record.id)}
              title={isVisible ? '隐藏密钥' : '显示完整密钥'}
            />
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyKey(fullKey)}
              title="复制密钥"
            />
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_time',
      key: 'created_time',
      width: 180,
      render: (time) => dayjs.unix(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewUsage(record)}
          >
            查看明细
          </Button>
          <Popconfirm
            title="确定要删除这个密钥吗?"
            onConfirm={() => handleDeleteToken(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="primary"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const usageColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => dayjs.unix(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '模型',
      dataIndex: 'model_name',
      key: 'model_name',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: '输入Token',
      dataIndex: 'prompt_tokens',
      key: 'prompt_tokens',
      width: 120,
    },
    {
      title: '输出Token',
      dataIndex: 'completion_tokens',
      key: 'completion_tokens',
      width: 120,
    },
    {
      title: '费用',
      dataIndex: 'quota',
      key: 'quota',
      width: 120,
      render: (quota) => `$${(quota / 500000).toFixed(6)}`,
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <Card
        title="密钥管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建密钥
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={tokens}
          loading={loading}
          rowKey="id"
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 个密钥`,
            responsive: true,
          }}
        />
      </Card>

      {/* 创建密钥模态框 */}
      <Modal
        title="创建新密钥"
        open={createModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} onFinish={handleCreateToken} layout="vertical">
          <Form.Item
            name="name"
            label="密钥名称"
            rules={[{ required: true, message: '请输入密钥名称' }]}
          >
            <Input placeholder="请输入密钥名称" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 使用明细模态框 */}
      <Modal
        title={`使用明细 - ${selectedToken?.name}`}
        open={usageModalVisible}
        onCancel={() => setUsageModalVisible(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: 1200, top: 20 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 筛选条件 */}
          <Card size="small">
            <Space wrap>
              <RangePicker
                value={[usageFilters.startTime, usageFilters.endTime]}
                onChange={(dates) => {
                  if (dates) {
                    setUsageFilters({
                      ...usageFilters,
                      startTime: dates[0],
                      endTime: dates[1],
                    });
                  }
                }}
              />
              <Select
                value={usageFilters.modelType}
                onChange={(value) =>
                  setUsageFilters({ ...usageFilters, modelType: value })
                }
                style={{ width: 120 }}
              >
                <Option value="all">全部类型</Option>
                <Option value="chat">对话</Option>
                <Option value="embedding">嵌入</Option>
                <Option value="image">图像</Option>
              </Select>
              <Button
                type="primary"
                onClick={() => fetchUsageData(selectedToken?.key)}
              >
                查询
              </Button>
            </Space>
          </Card>

          {/* 统计信息 */}
          {usageStats && (
            <Card size="small">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="总请求数"
                    value={usageStats.total_count || 0}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="总Token数"
                    value={usageStats.total_tokens || 0}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="总费用"
                    value={
                      usageStats.total_quota
                        ? `$${(usageStats.total_quota / 500000).toFixed(4)}`
                        : '$0.0000'
                    }
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="平均费用"
                    value={
                      usageStats.avg_quota
                        ? `$${(usageStats.avg_quota / 500000).toFixed(6)}`
                        : '$0.000000'
                    }
                  />
                </Col>
              </Row>
            </Card>
          )}

          {/* 使用明细表格 */}
          <Table
            columns={usageColumns}
            dataSource={usageData}
            loading={usageLoading}
            rowKey="id"
            scroll={{ x: 1000 }}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Space>
      </Modal>
    </div>
  );
};

export default Keys;
