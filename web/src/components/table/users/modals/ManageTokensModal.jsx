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

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Spin,
  Input,
  Tooltip,
  AvatarGroup,
  Avatar,
  Popover,
  Progress,
} from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconEyeOpened,
  IconEyeClosed,
} from '@douyinfe/semi-icons';
import {
  API,
  showError,
  showSuccess,
  renderQuota,
  timestamp2string,
  renderGroup,
  getModelCategories,
  copy,
} from '../../../../helpers';
import EditUserTokenModal from './EditUserTokenModal';

const { Text, Paragraph } = Typography;

const ManageTokensModal = ({ visible, onCancel, user, t }) => {
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showKeys, setShowKeys] = useState({});
  const [editingToken, setEditingToken] = useState({});
  const [showEdit, setShowEdit] = useState(false);

  const loadTokens = async () => {
    if (!user || !user.id) return;

    setLoading(true);
    try {
      const res = await API.get(`/api/user/${user.id}/tokens`, {
        params: {
          p: currentPage - 1,
          size: pageSize,
        },
      });
      const { success, message, data } = res.data;
      if (success) {
        setTokens(data.items || []);
        setTotal(data.total || 0);
      } else {
        showError(t(message));
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && user) {
      loadTokens();
    } else {
      setShowKeys({});
    }
  }, [visible, user, currentPage, pageSize]);

  const handleStatusToggle = async (token) => {
    const newStatus = token.status === 1 ? 2 : 1;
    try {
      const res = await API.put(
        `/api/user/${user.id}/tokens/${token.id}?status_only=true`,
        {
          id: token.id,
          status: newStatus,
        },
      );
      const { success, message } = res.data;
      if (success) {
        showSuccess(t(newStatus === 1 ? '令牌已启用' : '令牌已禁用'));
        loadTokens();
      } else {
        showError(t(message));
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const handleDelete = async (token) => {
    Modal.confirm({
      title: t('确定删除此令牌吗？'),
      content: t('此操作不可逆'),
      onOk: async () => {
        try {
          const res = await API.delete(`/api/user/${user.id}/tokens/${token.id}`);
          const { success, message } = res.data;
          if (success) {
            showSuccess(t('令牌删除成功'));
            loadTokens();
          } else {
            showError(t(message));
          }
        } catch (error) {
          showError(error.message);
        }
      },
    });
  };

  const copyText = async (text) => {
    if (await copy(text)) {
      showSuccess(t('已复制到剪贴板！'));
    } else {
      Modal.error({ title: t('无法复制到剪贴板，请手动复制'), content: text });
    }
  };

  const renderStatus = (status) => {
    switch (status) {
      case 1:
        return <Tag color='green'>{t('已启用')}</Tag>;
      case 2:
        return <Tag color='red'>{t('已禁用')}</Tag>;
      case 3:
        return <Tag color='orange'>{t('已过期')}</Tag>;
      case 4:
        return <Tag color='grey'>{t('已耗尽')}</Tag>;
      default:
        return <Tag color='grey'>{t('未知')}</Tag>;
    }
  };

  const renderTokenKey = (text, record) => {
    const fullKey = 'sk-' + record.key;
    const maskedKey =
      'sk-' + record.key.slice(0, 4) + '**********' + record.key.slice(-4);
    const revealed = !!showKeys[record.id];

    return (
      <div className='w-[200px]'>
        <Input
          readOnly
          value={revealed ? fullKey : maskedKey}
          size='small'
          suffix={
            <div className='flex items-center'>
              <Button
                theme='borderless'
                size='small'
                type='tertiary'
                icon={revealed ? <IconEyeClosed /> : <IconEyeOpened />}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowKeys((prev) => ({ ...prev, [record.id]: !revealed }));
                }}
              />
              <Button
                theme='borderless'
                size='small'
                type='tertiary'
                icon={<IconCopy />}
                onClick={async (e) => {
                  e.stopPropagation();
                  await copyText(fullKey);
                }}
              />
            </div>
          }
        />
      </div>
    );
  };

  const getProgressColor = (pct) => {
    if (pct === 100) return 'var(--semi-color-success)';
    if (pct <= 10) return 'var(--semi-color-danger)';
    if (pct <= 30) return 'var(--semi-color-warning)';
    return undefined;
  };

  const renderQuotaUsage = (text, record) => {
    const used = parseInt(record.used_quota) || 0;
    const remain = parseInt(record.remain_quota) || 0;
    const total = used + remain;

    if (record.unlimited_quota) {
      const popoverContent = (
        <div className='text-xs p-2'>
          <Paragraph copyable={{ content: renderQuota(used) }}>
            {t('已用额度')}: {renderQuota(used)}
          </Paragraph>
        </div>
      );
      return (
        <Popover content={popoverContent} position='top'>
          <Tag color='white' shape='circle'>
            {t('无限额度')}
          </Tag>
        </Popover>
      );
    }

    const percent = total > 0 ? (remain / total) * 100 : 0;
    const popoverContent = (
      <div className='text-xs p-2'>
        <Paragraph copyable={{ content: renderQuota(used) }}>
          {t('已用额度')}: {renderQuota(used)}
        </Paragraph>
        <Paragraph copyable={{ content: renderQuota(remain) }}>
          {t('剩余额度')}: {renderQuota(remain)} ({percent.toFixed(0)}%)
        </Paragraph>
        <Paragraph copyable={{ content: renderQuota(total) }}>
          {t('总额度')}: {renderQuota(total)}
        </Paragraph>
      </div>
    );

    return (
      <Popover content={popoverContent} position='top'>
        <Tag color='white' shape='circle'>
          <div className='flex flex-col items-end'>
            <span className='text-xs leading-none'>{`${renderQuota(remain)} / ${renderQuota(total)}`}</span>
            <Progress
              percent={percent}
              stroke={getProgressColor(percent)}
              format={() => `${percent.toFixed(0)}%`}
              style={{ width: '100%', marginTop: '1px', marginBottom: 0 }}
            />
          </div>
        </Tag>
      </Popover>
    );
  };

  const renderGroupColumn = (text, record) => {
    if (text === 'auto') {
      return (
        <Tooltip
          content={t(
            '当前分组为 auto，会自动选择最优分组，当一个组不可用时自动降级到下一个组（熔断机制）',
          )}
          position='top'
        >
          <Tag color='white' shape='circle'>
            {t('智能熔断')}
            {record && record.cross_group_retry ? `(${t('跨分组')})` : ''}
          </Tag>
        </Tooltip>
      );
    }
    return renderGroup(text);
  };

  const renderModelLimits = (text, record) => {
    if (record.model_limits_enabled && text) {
      const models = text.split(',').filter(Boolean);
      const categories = getModelCategories(t);

      const vendorAvatars = [];
      const matchedModels = new Set();
      Object.entries(categories).forEach(([key, category]) => {
        if (key === 'all') return;
        if (!category.icon || !category.filter) return;
        const vendorModels = models.filter((m) =>
          category.filter({ model_name: m }),
        );
        if (vendorModels.length > 0) {
          vendorAvatars.push(
            <Tooltip
              key={key}
              content={vendorModels.join(', ')}
              position='top'
              showArrow
            >
              <Avatar
                size='extra-extra-small'
                alt={category.label}
                color='transparent'
              >
                {category.icon}
              </Avatar>
            </Tooltip>,
          );
          vendorModels.forEach((m) => matchedModels.add(m));
        }
      });

      const unmatchedModels = models.filter((m) => !matchedModels.has(m));
      if (unmatchedModels.length > 0) {
        vendorAvatars.push(
          <Tooltip
            key='unknown'
            content={unmatchedModels.join(', ')}
            position='top'
            showArrow
          >
            <Avatar size='extra-extra-small' alt='unknown'>
              {t('其他')}
            </Avatar>
          </Tooltip>,
        );
      }

      return <AvatarGroup size='extra-extra-small'>{vendorAvatars}</AvatarGroup>;
    } else {
      return (
        <Tag color='white' shape='circle'>
          {t('无限制')}
        </Tag>
      );
    }
  };

  const renderAllowIps = (text) => {
    if (!text || text.trim() === '') {
      return (
        <Tag color='white' shape='circle'>
          {t('无限制')}
        </Tag>
      );
    }

    const ips = text
      .split('\n')
      .map((ip) => ip.trim())
      .filter(Boolean);

    const displayIps = ips.slice(0, 1);
    const extraCount = ips.length - displayIps.length;

    const ipTags = displayIps.map((ip, idx) => (
      <Tag key={idx} shape='circle'>
        {ip}
      </Tag>
    ));

    if (extraCount > 0) {
      ipTags.push(
        <Tooltip
          key='extra'
          content={ips.slice(1).join(', ')}
          position='top'
          showArrow
        >
          <Tag shape='circle'>{'+' + extraCount}</Tag>
        </Tooltip>,
      );
    }

    return <Space wrap>{ipTags}</Space>;
  };

  const columns = [
    {
      title: t('名称'),
      dataIndex: 'name',
      width: 120,
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      width: 80,
      render: (status) => renderStatus(status),
    },
    {
      title: t('剩余/总额度'),
      key: 'quota_usage',
      width: 150,
      render: (text, record) => renderQuotaUsage(text, record),
    },
    {
      title: t('分组'),
      dataIndex: 'group',
      width: 100,
      render: (text, record) => renderGroupColumn(text, record),
    },
    {
      title: t('密钥'),
      key: 'token_key',
      width: 220,
      render: (text, record) => renderTokenKey(text, record),
    },
    {
      title: t('可用模型'),
      dataIndex: 'model_limits',
      width: 120,
      render: (text, record) => renderModelLimits(text, record),
    },
    {
      title: t('IP限制'),
      dataIndex: 'allow_ips',
      width: 120,
      render: (text) => renderAllowIps(text),
    },
    {
      title: t('过期时间'),
      dataIndex: 'expired_time',
      width: 150,
      render: (time) => {
        if (time === -1) {
          return <Tag color='green'>{t('永不过期')}</Tag>;
        }
        return <Text>{timestamp2string(time)}</Text>;
      },
    },
    {
      title: t('操作'),
      dataIndex: 'operate',
      width: 200,
      fixed: 'right',
      render: (text, record) => (
        <Space>
          {record.status === 1 ? (
            <Button
              type='danger'
              size='small'
              onClick={() => handleStatusToggle(record)}
            >
              {t('禁用')}
            </Button>
          ) : (
            <Button size='small' onClick={() => handleStatusToggle(record)}>
              {t('启用')}
            </Button>
          )}
          <Button
            type='tertiary'
            size='small'
            onClick={() => {
              setEditingToken(record);
              setShowEdit(true);
            }}
          >
            {t('编辑')}
          </Button>
          <Button
            type='danger'
            size='small'
            onClick={() => handleDelete(record)}
          >
            {t('删除')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <Text strong>{t('管理用户令牌')}</Text>
            {user && <Tag color='blue'>{user.username}</Tag>}
          </Space>
        }
        visible={visible}
        onCancel={onCancel}
        footer={null}
        width={1200}
        bodyStyle={{ padding: '20px' }}
      >
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={tokens}
            scroll={{ x: 'max-content' }}
            pagination={{
              currentPage: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              pageSizeOpts: [10, 20, 50],
              onPageChange: (page) => setCurrentPage(page),
              onPageSizeChange: (size) => {
                setPageSize(size);
                setCurrentPage(1);
              },
            }}
            empty={<Text>{t('该用户暂无令牌')}</Text>}
          />
        </Spin>
      </Modal>

      <EditUserTokenModal
        visible={showEdit}
        onCancel={() => setShowEdit(false)}
        editingToken={editingToken}
        userId={user?.id}
        refresh={loadTokens}
        t={t}
      />
    </>
  );
};

export default ManageTokensModal;
