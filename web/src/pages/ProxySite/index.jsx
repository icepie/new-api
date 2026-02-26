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
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Switch,
  Table,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import { API } from '../../helpers/api.js';
import { showError, showSuccess, timestamp2string } from '../../helpers/utils.jsx';

const { Text } = Typography;

const defaultForm = {
  domain: '',
  name: '',
  logo: '',
  announcement: '',
  rebate_ratio: 0,
  admin_user_id: 0,
  remark: '',
  status: 1,
};

const ProxySitePage = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState({ ...defaultForm });
  const [submitting, setSubmitting] = useState(false);

  const loadSites = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/proxy_site/');
      if (res.data.success) {
        setSites(res.data.data || []);
      } else {
        showError(res.data.message || '加载失败');
      }
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormValues({ ...defaultForm });
    setModalVisible(true);
  };

  const openEdit = (record) => {
    setEditingId(record.id);
    setFormValues({
      domain: record.domain || '',
      name: record.name || '',
      logo: record.logo || '',
      announcement: record.announcement || '',
      rebate_ratio: record.rebate_ratio ?? 0,
      admin_user_id: record.admin_user_id ?? 0,
      remark: record.remark || '',
      status: record.status ?? 1,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formValues.domain) {
      Toast.error('域名不能为空');
      return;
    }
    setSubmitting(true);
    try {
      let res;
      if (editingId) {
        res = await API.put(`/api/proxy_site/${editingId}`, formValues);
      } else {
        res = await API.post('/api/proxy_site/', formValues);
      }
      if (res.data.success) {
        showSuccess(editingId ? '更新成功' : '创建成功');
        setModalVisible(false);
        await loadSites();
      } else {
        showError(res.data.message || '操作失败');
      }
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await API.delete(`/api/proxy_site/${id}`);
      if (res.data.success) {
        showSuccess('删除成功');
        await loadSites();
      } else {
        showError(res.data.message || '删除失败');
      }
    } catch (err) {
      showError(err);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '域名',
      dataIndex: 'domain',
      render: (text) => <Text copyable={{ content: text }}>{text}</Text>,
    },
    {
      title: '名称',
      dataIndex: 'name',
    },
    {
      title: 'Logo',
      dataIndex: 'logo',
      render: (text) =>
        text ? (
          <img src={text} alt='logo' style={{ height: 24, maxWidth: 80, objectFit: 'contain' }} />
        ) : (
          <Text type='tertiary'>—</Text>
        ),
    },
    {
      title: '返利比例',
      dataIndex: 'rebate_ratio',
      render: (val) => (val != null ? val : '—'),
    },
    {
      title: '管理员用户ID',
      dataIndex: 'admin_user_id',
      render: (val) => (val ? val : <Text type='tertiary'>—</Text>),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      render: (text) => text || <Text type='tertiary'>—</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (val) =>
        val === 1 ? (
          <Tag color='green' size='small'>启用</Tag>
        ) : (
          <Tag color='red' size='small'>禁用</Tag>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_time',
      render: (val) => (val ? timestamp2string(val) : '—'),
    },
    {
      title: '操作',
      dataIndex: 'operate',
      fixed: 'right',
      width: 140,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size='small'
            theme='light'
            type='primary'
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title='确认删除该站点？'
            onConfirm={() => handleDelete(record.id)}
            okText='删除'
            cancelText='取消'
          >
            <Button size='small' theme='light' type='danger'>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Typography.Title heading={5} style={{ margin: 0 }}>
          代理站点管理
        </Typography.Title>
        <Button theme='solid' type='primary' onClick={openCreate}>
          新增站点
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={sites}
        loading={loading}
        rowKey='id'
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal
        title={editingId ? '编辑站点' : '新增站点'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingId ? '保存' : '创建'}
        cancelText='取消'
        confirmLoading={submitting}
        width={560}
      >
        <Form labelPosition='left' labelWidth={110}>
          <Form.Slot label={{ text: '域名', required: true }}>
            <Input
              value={formValues.domain}
              onChange={(val) => handleFieldChange('domain', val)}
              placeholder='例如：example.com'
            />
          </Form.Slot>
          <Form.Slot label='名称'>
            <Input
              value={formValues.name}
              onChange={(val) => handleFieldChange('name', val)}
              placeholder='站点显示名称'
            />
          </Form.Slot>
          <Form.Slot label='Logo URL'>
            <Input
              value={formValues.logo}
              onChange={(val) => handleFieldChange('logo', val)}
              placeholder='https://...'
            />
          </Form.Slot>
          <Form.Slot label='公告'>
            <Input
              value={formValues.announcement}
              onChange={(val) => handleFieldChange('announcement', val)}
              placeholder='站点公告内容'
            />
          </Form.Slot>
          <Form.Slot label='返利比例'>
            <InputNumber
              value={formValues.rebate_ratio}
              onChange={(val) => handleFieldChange('rebate_ratio', val ?? 0)}
              min={0}
              max={1}
              step={0.01}
              precision={4}
              style={{ width: '100%' }}
            />
          </Form.Slot>
          <Form.Slot label='管理员用户ID'>
            <InputNumber
              value={formValues.admin_user_id}
              onChange={(val) => handleFieldChange('admin_user_id', val ?? 0)}
              min={0}
              style={{ width: '100%' }}
            />
          </Form.Slot>
          <Form.Slot label='备注'>
            <Input
              value={formValues.remark}
              onChange={(val) => handleFieldChange('remark', val)}
              placeholder='内部备注'
            />
          </Form.Slot>
          <Form.Slot label='状态'>
            <Switch
              checked={formValues.status === 1}
              onChange={(checked) => handleFieldChange('status', checked ? 1 : 2)}
              checkedText='启用'
              uncheckedText='禁用'
            />
          </Form.Slot>
        </Form>
      </Modal>
    </div>
  );
};

export default ProxySitePage;
