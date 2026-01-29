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

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Button, Tag, Space, Popconfirm, Modal, Form, Input, InputNumber, Select, Switch, Row, Col, Typography, Popover, Progress } from '@douyinfe/semi-ui';
import { API, showError, showSuccess, renderQuota, renderQuotaWithPrompt } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { createCardProPagination } from '../../helpers/utils';
import CardPro from '../../components/common/ui/CardPro';
import CardTable from '../../components/common/ui/CardTable';
import { useTranslation } from 'react-i18next';
import { Empty } from '@douyinfe/semi-ui';
import { IllustrationNoResult, IllustrationNoResultDark } from '@douyinfe/semi-illustrations';
import { IconPlus } from '@douyinfe/semi-icons';

const { Text, Paragraph } = Typography;

const Organization = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [compactMode, setCompactMode] = useState(false);
  const [addQuotaModalOpen, setAddQuotaModalOpen] = useState(false);
  const [addQuotaLocal, setAddQuotaLocal] = useState('');
  const [editingField, setEditingField] = useState('quota'); // 'quota', 'used_quota', 'overdraft_limit'
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    status: 'enabled',
    remark: '',
    billing_type: 'prepaid',
    billing_cycle: 'monthly',
    quota: 0,
    used_quota: 0,
    overdraft_limit: 0,
    max_sub_accounts: 10,
    max_keys_per_sub_account: 5,
    max_keys_per_org: 50,
  });
  const formApiRef = useRef(null);

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 80,
      },
      {
        title: t('组织代码'),
        dataIndex: 'code',
        width: 150,
      },
      {
        title: t('组织名称'),
        dataIndex: 'name',
        width: 200,
      },
      {
        title: t('额度使用'),
        dataIndex: 'quota',
        width: 150,
        render: (value, record) => {
          const used = parseInt(record.used_quota) || 0;
          const remain = parseInt(value) || 0;
          const isPrepaid = record.billing_type === 'prepaid';

          let percent, popoverContent, displayText;

          if (isPrepaid) {
            // 预付费：显示 剩余/总额
            const total = used + remain;
            percent = total > 0 ? (remain / total) * 100 : 0;

            popoverContent = (
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

            displayText = `${renderQuota(remain)} / ${renderQuota(total)}`;
          } else {
            // 后付费：显示 已用/(基础额度+透支上限)
            const overdraftLimit = parseInt(record.overdraft_limit) || 0;
            const totalAvailable = remain + overdraftLimit; // quota + overdraft_limit
            const available = totalAvailable - used;
            percent = totalAvailable > 0 ? (used / totalAvailable) * 100 : 0;

            popoverContent = (
              <div className='text-xs p-2'>
                <Paragraph copyable={{ content: renderQuota(used) }}>
                  {t('已用额度')}: {renderQuota(used)} ({percent.toFixed(0)}%)
                </Paragraph>
                <Paragraph copyable={{ content: renderQuota(available) }}>
                  {t('可用额度')}: {renderQuota(available)}
                </Paragraph>
                <Paragraph copyable={{ content: renderQuota(remain) }}>
                  {t('基础额度')}: {renderQuota(remain)}
                </Paragraph>
                <Paragraph copyable={{ content: renderQuota(overdraftLimit) }}>
                  {t('透支上限')}: {renderQuota(overdraftLimit)}
                </Paragraph>
                <Paragraph copyable={{ content: renderQuota(totalAvailable) }}>
                  {t('总额度')}: {renderQuota(totalAvailable)}
                </Paragraph>
              </div>
            );

            displayText = `${renderQuota(used)} / ${renderQuota(totalAvailable)}`;
          }

          return (
            <Popover content={popoverContent} position='top'>
              <Tag color='white' shape='circle'>
                <div className='flex flex-col items-end'>
                  <span className='text-xs leading-none'>{displayText}</span>
                  <Progress
                    percent={percent}
                    aria-label='quota usage'
                    format={() => `${percent.toFixed(0)}%`}
                    style={{ width: '100%', marginTop: '1px', marginBottom: 0 }}
                  />
                </div>
              </Tag>
            </Popover>
          );
        },
      },
      {
        title: t('状态'),
        dataIndex: 'status',
        width: 100,
        render: (status) => {
          return status === 'enabled' ? (
            <Tag color="green">{t('启用')}</Tag>
          ) : (
            <Tag color="red">{t('禁用')}</Tag>
          );
        },
      },
      {
        title: t('计费方式'),
        dataIndex: 'billing_type',
        width: 100,
        render: (type) => {
          return type === 'prepaid' ? (
            <Tag color="blue">{t('预付费')}</Tag>
          ) : (
            <Tag color="orange">{t('后付费')}</Tag>
          );
        },
      },
      {
        title: t('计费周期'),
        dataIndex: 'billing_cycle',
        width: 100,
        render: (cycle) => {
          const cycleMap = {
            monthly: t('月付'),
            quarterly: t('季付'),
            yearly: t('年付'),
          };
          return <Tag color="cyan">{cycleMap[cycle] || cycle}</Tag>;
        },
      },
      {
        title: t('子账号上限'),
        dataIndex: 'max_sub_accounts',
        width: 120,
        render: (value) => {
          return value === -1 ? (
            <Tag color="green">{t('无限制')}</Tag>
          ) : (
            <Tag color="white">{value}</Tag>
          );
        },
      },
      {
        title: t('单用户密钥上限'),
        dataIndex: 'max_keys_per_sub_account',
        width: 140,
        render: (value) => {
          return value === -1 ? (
            <Tag color="green">{t('无限制')}</Tag>
          ) : (
            <Tag color="white">{value}</Tag>
          );
        },
      },
      {
        title: t('组织密钥上限'),
        dataIndex: 'max_keys_per_org',
        width: 130,
        render: (value) => {
          return value === -1 ? (
            <Tag color="green">{t('无限制')}</Tag>
          ) : (
            <Tag color="white">{value}</Tag>
          );
        },
      },
      {
        title: t('创建时间'),
        dataIndex: 'created_at',
        width: 180,
        render: (text) => {
          return new Date(text).toLocaleString();
        },
      },
      {
        title: t('描述'),
        dataIndex: 'description',
        width: 200,
      },
      {
        title: t('备注'),
        dataIndex: 'remark',
        width: 200,
      },
      {
        title: t('操作'),
        dataIndex: 'operate',
        fixed: 'right',
        width: 280,
        render: (text, record) => (
          <Space>
            <Button
              theme="light"
              type="primary"
              size="small"
              onClick={() => handleEdit(record)}
            >
              {t('编辑')}
            </Button>
            <Popconfirm
              title={record.status === 'enabled' ? t('确定禁用该组织吗?') : t('确定启用该组织吗?')}
              content={record.status === 'enabled' ? t('禁用后该组织下的用户将无法访问') : t('启用后该组织下的用户将恢复访问')}
              onConfirm={() => handleStatusChange(record.id, record.status)}
            >
              <Button
                theme="light"
                type={record.status === 'enabled' ? 'warning' : 'secondary'}
                size="small"
              >
                {record.status === 'enabled' ? t('禁用') : t('启用')}
              </Button>
            </Popconfirm>
            <Popconfirm
              title={t('确定删除该组织吗?')}
              content={t('删除后无法恢复,且该组织下的用户也将无法访问')}
              onConfirm={() => handleDelete(record.id)}
              okType="danger"
            >
              <Button theme="light" type="danger" size="small">
                {t('删除')}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];

    // Handle compact mode by removing fixed positioning
    return compactMode
      ? baseColumns.map((col) => {
          if (col.dataIndex === 'operate') {
            const { fixed, ...rest } = col;
            return rest;
          }
          return col;
        })
      : baseColumns;
  }, [compactMode, t]);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        p: page,
        page_size: pageSize,
      });
      if (keyword) params.append('keyword', keyword);
      if (status) params.append('status', status);

      const res = await API.get(`/api/organization?${params.toString()}`);
      const { success, message, data, total } = res.data;
      if (success) {
        setOrganizations(data || []);
        setTotal(total || 0);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('加载组织列表失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    loadOrganizations();
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setFormData({
      code: org.code,
      name: org.name,
      description: org.description,
      status: org.status,
      remark: org.remark || '',
      billing_type: org.billing_type || 'prepaid',
      billing_cycle: org.billing_cycle || 'monthly',
      quota: org.quota !== undefined ? org.quota : 0,
      used_quota: org.used_quota !== undefined ? org.used_quota : 0,
      overdraft_limit: org.overdraft_limit !== undefined ? org.overdraft_limit : 0,
      max_sub_accounts: org.max_sub_accounts !== undefined ? org.max_sub_accounts : 10,
      max_keys_per_sub_account: org.max_keys_per_sub_account !== undefined ? org.max_keys_per_sub_account : 5,
      max_keys_per_org: org.max_keys_per_org !== undefined ? org.max_keys_per_org : 50,
    });
    setModalVisible(true);
  };

  const handleAdd = () => {
    setEditingOrg(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      status: 'enabled',
      remark: '',
      billing_type: 'prepaid',
      billing_cycle: 'monthly',
      quota: 0,
      used_quota: 0,
      overdraft_limit: 0,
      max_sub_accounts: 10,
      max_keys_per_sub_account: 5,
      max_keys_per_org: 50,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await API.delete(`/api/organization/${id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('删除成功'));
        loadOrganizations();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('删除失败'));
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
      const res = await API.put(`/api/organization/${id}`, { status: newStatus });
      const { success, message } = res.data;
      if (success) {
        showSuccess(newStatus === 'enabled' ? t('启用成功') : t('禁用成功'));
        loadOrganizations();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('操作失败'));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await formApiRef.current.validate();
      let res;
      if (editingOrg) {
        res = await API.put(`/api/organization/${editingOrg.id}`, values);
      } else {
        res = await API.post('/api/organization', values);
      }
      const { success, message } = res.data;
      if (success) {
        showSuccess(editingOrg ? t('更新成功') : t('创建成功'));
        setModalVisible(false);
        loadOrganizations();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('操作失败'));
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const addLocalQuota = () => {
    const current = parseInt(formApiRef.current?.getValue(editingField) || 0);
    const delta = parseInt(addQuotaLocal) || 0;
    formApiRef.current?.setValue(editingField, current + delta);
  };

  const openQuotaModal = (field) => {
    setEditingField(field);
    setAddQuotaLocal('');
    setAddQuotaModalOpen(true);
  };

  const getFieldLabel = (field) => {
    const labels = {
      quota: t('剩余额度'),
      used_quota: t('已用额度'),
      overdraft_limit: t('透支额度上限'),
    };
    return labels[field] || '';
  };

  return (
    <div className='mt-[60px] px-2'>
      <CardPro
        type='type1'
        descriptionArea={
          <div className='flex justify-between items-center'>
            <div>
              <h3 className='text-lg font-semibold'>{t('组织管理')}</h3>
              <p className='text-sm text-gray-500'>{t('管理组织信息、计费方式和限制项')}</p>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-gray-600'>{t('紧凑模式')}</span>
              <Switch checked={compactMode} onChange={setCompactMode} />
            </div>
          </div>
        }
        actionsArea={
          <div className='flex flex-col md:flex-row justify-between items-center gap-2 w-full'>
            <Button type="primary" onClick={handleAdd}>
              {t('新建组织')}
            </Button>
            <div className='flex flex-col md:flex-row gap-2 w-full md:w-auto'>
              <Input
                placeholder={t('搜索组织代码或名称')}
                value={keyword}
                onChange={(value) => setKeyword(value)}
                onEnterPress={handleSearch}
                style={{ width: isMobile ? '100%' : 250 }}
              />
              <Select
                placeholder={t('状态')}
                value={status}
                onChange={(value) => setStatus(value)}
                style={{ width: isMobile ? '100%' : 120 }}
                allowClear
              >
                <Select.Option value="enabled">{t('启用')}</Select.Option>
                <Select.Option value="disabled">{t('禁用')}</Select.Option>
              </Select>
              <Button onClick={handleSearch}>{t('搜索')}</Button>
            </div>
          </div>
        }
        paginationArea={createCardProPagination({
          currentPage: page,
          pageSize: pageSize,
          total: total,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
          isMobile: isMobile,
          t: t,
        })}
        t={t}
      >
        <CardTable
          columns={columns}
          dataSource={organizations}
          loading={loading}
          scroll={compactMode ? undefined : { x: 'max-content' }}
          pagination={false}
          rowKey="id"
          hidePagination={true}
          empty={
            <Empty
              image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
              darkModeImage={<IllustrationNoResultDark style={{ width: 150, height: 150 }} />}
              description={t('暂无数据')}
              style={{ padding: 30 }}
            />
          }
        />
      </CardPro>

      <Modal
        title={editingOrg ? t('编辑组织') : t('新建组织')}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={isMobile ? '100%' : 700}
        style={isMobile ? { top: 0 } : {}}
      >
        <Form
          initValues={formData}
          key={editingOrg ? editingOrg.id : 'new'}
          getFormApi={(api) => (formApiRef.current = api)}
          labelPosition={isMobile ? 'top' : 'left'}
          labelWidth={isMobile ? undefined : 120}
        >
          {({ values }) => (
            <>
              <Form.Input
                field="code"
                label={t('组织代码')}
                rules={[{ required: true, message: t('请输入组织代码') }]}
                placeholder={t('请输入组织代码(唯一标识)')}
              />
              <Form.Input
                field="name"
                label={t('组织名称')}
                rules={[{ required: true, message: t('请输入组织名称') }]}
                placeholder={t('请输入组织名称')}
              />
              <Form.TextArea
                field="description"
                label={t('描述')}
                placeholder={t('请输入组织描述')}
                maxLength={1000}
              />
              <Form.Select
                field="status"
                label={t('状态')}
                rules={[{ required: true, message: t('请选择状态') }]}
              >
                <Select.Option value="enabled">{t('启用')}</Select.Option>
                <Select.Option value="disabled">{t('禁用')}</Select.Option>
              </Form.Select>

              <Form.Select
                field="billing_type"
                label={t('计费方式')}
                rules={[{ required: true, message: t('请选择计费方式') }]}
              >
                <Select.Option value="prepaid">{t('预付费')}</Select.Option>
                <Select.Option value="postpaid">{t('后付费')}</Select.Option>
              </Form.Select>

              <Form.Select
                field="billing_cycle"
                label={t('计费周期')}
                rules={[{ required: true, message: t('请选择计费周期') }]}
              >
                <Select.Option value="monthly">{t('月付')}</Select.Option>
                <Select.Option value="quarterly">{t('季付')}</Select.Option>
                <Select.Option value="yearly">{t('年付')}</Select.Option>
              </Form.Select>

              <Form.TextArea
                field="remark"
                label={t('备注')}
                placeholder={t('请输入备注信息')}
                maxLength={1000}
                rows={2}
              />

              <Row gutter={12}>
                <Col span={10}>
                  <Form.InputNumber
                    field="quota"
                    label={t('剩余额度')}
                    placeholder={t('请输入剩余额度')}
                    step={500000}
                    extraText={renderQuotaWithPrompt(values.quota || 0)}
                    rules={[{ required: true, message: t('请输入剩余额度') }]}
                    style={{ width: '100%' }}
                  />
                </Col>

                <Col span={14}>
                  <Form.Slot label={t('添加额度')}>
                    <Button
                      icon={<IconPlus />}
                      onClick={() => openQuotaModal('quota')}
                    />
                  </Form.Slot>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={10}>
                  <Form.InputNumber
                    field="used_quota"
                    label={t('已用额度')}
                    placeholder={t('请输入已用额度')}
                    min={0}
                    step={500000}
                    extraText={renderQuotaWithPrompt(values.used_quota || 0)}
                    rules={[{ required: true, message: t('请输入已用额度') }]}
                    style={{ width: '100%' }}
                  />
                </Col>

                <Col span={14}>
                  <Form.Slot label={t('添加额度')}>
                    <Button
                      icon={<IconPlus />}
                      onClick={() => openQuotaModal('used_quota')}
                    />
                  </Form.Slot>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={10}>
                  <Form.InputNumber
                    field="overdraft_limit"
                    label={t('透支额度上限')}
                    placeholder={t('请输入透支额度上限')}
                    min={0}
                    step={500000}
                    extraText={renderQuotaWithPrompt(values.overdraft_limit || 0)}
                    rules={[{ required: true, message: t('请输入透支额度上限') }]}
                    style={{ width: '100%' }}
                  />
                </Col>

                <Col span={14}>
                  <Form.Slot label={t('添加额度')}>
                    <Button
                      icon={<IconPlus />}
                      onClick={() => openQuotaModal('overdraft_limit')}
                    />
                  </Form.Slot>
                </Col>
              </Row>

              <Form.InputNumber
                field="max_sub_accounts"
                label={t('子账号上限')}
                rules={[{ required: true, message: t('请输入子账号上限') }]}
                placeholder={t('输入 -1 表示无限制')}
                min={-1}
                style={{ width: '100%' }}
                extraText={t('子账号总数上限（-1 表示无限制）')}
              />

              <Form.InputNumber
                field="max_keys_per_sub_account"
                label={t('单用户密钥上限')}
                rules={[{ required: true, message: t('请输入单用户密钥上限') }]}
                placeholder={t('输入 -1 表示无限制')}
                min={-1}
                style={{ width: '100%' }}
                extraText={t('每个子账号可拥有的密钥数上限（-1 表示无限制）')}
              />

              <Form.InputNumber
                field="max_keys_per_org"
                label={t('组织密钥总数上限')}
                rules={[{ required: true, message: t('请输入组织密钥总数上限') }]}
                placeholder={t('输入 -1 表示无限制')}
                min={-1}
                style={{ width: '100%' }}
                extraText={t('组织内密钥总数上限（-1 表示无限制）')}
              />
            </>
          )}
        </Form>
      </Modal>

      {/* 添加额度模态框 */}
      <Modal
        centered
        visible={addQuotaModalOpen}
        onOk={() => {
          addLocalQuota();
          setAddQuotaModalOpen(false);
        }}
        onCancel={() => setAddQuotaModalOpen(false)}
        closable={null}
        title={
          <div className='flex items-center'>
            <IconPlus className='mr-2' />
            {t('添加')} {getFieldLabel(editingField)}
          </div>
        }
      >
        <div className='mb-4'>
          {(() => {
            const current = formApiRef.current?.getValue(editingField) || 0;
            return (
              <Text type='secondary' className='block mb-2'>
                {`${t('新额度：')}${renderQuota(current)} + ${renderQuota(addQuotaLocal)} = ${renderQuota(current + parseInt(addQuotaLocal || 0))}`}
              </Text>
            );
          })()}
        </div>
        <InputNumber
          placeholder={t('需要添加的额度（支持负数）')}
          value={addQuotaLocal}
          onChange={setAddQuotaLocal}
          style={{ width: '100%' }}
          showClear
          step={500000}
        />
      </Modal>
    </div>
  );
};

export default Organization;
