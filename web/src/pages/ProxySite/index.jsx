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

import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  TextArea,
  Toast,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import { Edit, Maximize2, Plus, Trash2 } from 'lucide-react';
import { API } from '../../helpers/api.js';
import { showError, showSuccess, timestamp2string } from '../../helpers/utils.jsx';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { Empty } from '@douyinfe/semi-ui';

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

const typeOptions = [
  { value: 'default', label: '默认' },
  { value: 'ongoing', label: '进行中' },
  { value: 'success', label: '成功' },
  { value: 'warning', label: '警告' },
  { value: 'error', label: '错误' },
];

const getTypeColor = (type) => {
  const colorMap = {
    default: 'grey',
    ongoing: 'blue',
    success: 'green',
    warning: 'orange',
    error: 'red',
  };
  return colorMap[type] || 'grey';
};

const ProxySitePage = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState({ ...defaultForm });
  const [submitting, setSubmitting] = useState(false);
  const [userOptions, setUserOptions] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // Announcement modal state
  const [annModalVisible, setAnnModalVisible] = useState(false);
  const [annModalSite, setAnnModalSite] = useState(null);
  const [annList, setAnnList] = useState([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [annSaving, setAnnSaving] = useState(false);
  const [annHasChanges, setAnnHasChanges] = useState(false);
  const [showAnnEditModal, setShowAnnEditModal] = useState(false);
  const [showAnnDeleteModal, setShowAnnDeleteModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState(null);
  const [deletingAnn, setDeletingAnn] = useState(null);
  const [annForm, setAnnForm] = useState({
    content: '',
    publishDate: new Date(),
    type: 'default',
    extra: '',
  });
  const [annEditLoading, setAnnEditLoading] = useState(false);
  const annFormApiRef = useRef(null);

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

  const searchUsers = async (keyword) => {
    if (!keyword) return;
    setUserSearchLoading(true);
    try {
      const res = await API.get(`/api/user/search?keyword=${encodeURIComponent(keyword)}&p=1&page_size=20`);
      if (res.data.success) {
        const items = res.data.data?.items || [];
        setUserOptions(
          items.map((u) => ({
            value: u.id,
            label: `#${u.id} ${u.username}${u.display_name ? ` (${u.display_name})` : ''}`,
          })),
        );
      }
    } catch (_) {
      // ignore search errors
    } finally {
      setUserSearchLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormValues({ ...defaultForm });
    setUserOptions([]);
    setModalVisible(true);
  };

  const openEdit = async (record) => {
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
    // Pre-load admin user info so the selector shows a label
    if (record.admin_user_id) {
      try {
        const res = await API.get(`/api/user/search?keyword=${record.admin_user_id}&p=1&page_size=10`);
        if (res.data.success) {
          const items = res.data.data?.items || [];
          const user = items.find((u) => u.id === record.admin_user_id);
          if (user) {
            setUserOptions([{
              value: user.id,
              label: `#${user.id} ${user.username}${user.display_name ? ` (${user.display_name})` : ''}`,
            }]);
          }
        }
      } catch (_) {
        setUserOptions([]);
      }
    } else {
      setUserOptions([]);
    }
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

  // ---- Announcement modal handlers ----

  const openAnnModal = async (record) => {
    setAnnModalSite(record);
    setAnnHasChanges(false);
    setAnnLoading(true);
    setAnnModalVisible(true);
    try {
      const res = await API.get(`/api/proxy_site/${record.id}/announcements`);
      if (res.data.success) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        const listWithIds = list.map((item, index) => ({
          ...item,
          id: item.id || index + 1,
        }));
        setAnnList(listWithIds);
      } else {
        showError(res.data.message || '加载公告失败');
        setAnnList([]);
      }
    } catch (err) {
      showError(err);
      setAnnList([]);
    } finally {
      setAnnLoading(false);
    }
  };

  const saveAnnouncements = async (listToSave) => {
    if (!annModalSite) return;
    const list = listToSave !== undefined ? listToSave : annList;
    setAnnSaving(true);
    try {
      const res = await API.put(`/api/proxy_site/${annModalSite.id}/announcements`, {
        announcements: JSON.stringify(list),
      });
      if (res.data.success) {
        showSuccess('公告已保存');
        setAnnHasChanges(false);
      } else {
        showError(res.data.message || '保存失败');
      }
    } catch (err) {
      showError(err);
    } finally {
      setAnnSaving(false);
    }
  };

  const handleAddAnn = () => {
    setEditingAnn(null);
    setAnnForm({ content: '', publishDate: new Date(), type: 'default', extra: '' });
    setShowAnnEditModal(true);
  };

  const handleEditAnn = (record) => {
    setEditingAnn(record);
    setAnnForm({
      content: record.content || '',
      publishDate: record.publishDate ? new Date(record.publishDate) : new Date(),
      type: record.type || 'default',
      extra: record.extra || '',
    });
    setShowAnnEditModal(true);
  };

  const handleDeleteAnn = (record) => {
    setDeletingAnn(record);
    setShowAnnDeleteModal(true);
  };

  const confirmDeleteAnn = async () => {
    if (deletingAnn) {
      const newList = annList.filter((item) => item.id !== deletingAnn.id);
      setAnnList(newList);
      setShowAnnDeleteModal(false);
      setDeletingAnn(null);
      await saveAnnouncements(newList);
    } else {
      setShowAnnDeleteModal(false);
      setDeletingAnn(null);
    }
  };

  const handleSaveAnn = async () => {
    if (!annForm.content || !annForm.publishDate) {
      showError('请填写完整的公告信息');
      return;
    }
    setAnnEditLoading(true);
    try {
      const formData = {
        ...annForm,
        publishDate: annForm.publishDate instanceof Date
          ? annForm.publishDate.toISOString()
          : annForm.publishDate,
      };
      let newList;
      if (editingAnn) {
        newList = annList.map((item) =>
          item.id === editingAnn.id ? { ...item, ...formData } : item,
        );
      } else {
        const newId = Math.max(...annList.map((item) => item.id || 0), 0) + 1;
        newList = [...annList, { id: newId, ...formData }];
      }
      setAnnList(newList);
      setShowAnnEditModal(false);
      await saveAnnouncements(newList);
    } finally {
      setAnnEditLoading(false);
    }
  };

  const annColumns = [
    {
      title: '内容',
      dataIndex: 'content',
      render: (text) => (
        <Tooltip content={text} position='topLeft' showArrow>
          <div style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {text}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishDate',
      width: 160,
      render: (val) => val ? new Date(val).toLocaleString() : '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (type) => (
        <Tag color={getTypeColor(type)} shape='circle' size='small'>
          {typeOptions.find((o) => o.value === type)?.label || type}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 130,
      render: (_, record) => (
        <Space>
          <Button icon={<Edit size={13} />} theme='light' type='tertiary' size='small' onClick={() => handleEditAnn(record)}>
            编辑
          </Button>
          <Button icon={<Trash2 size={13} />} type='danger' theme='light' size='small' onClick={() => handleDeleteAnn(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

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
      width: 180,
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
          <Button
            size='small'
            theme='light'
            type='secondary'
            onClick={() => openAnnModal(record)}
          >
            公告
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

      {/* Site edit modal */}
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
          <Form.Slot label='管理员用户'>
            <Select
              value={formValues.admin_user_id || undefined}
              placeholder='搜索用户名或 ID'
              filter
              remote
              onSearch={searchUsers}
              loading={userSearchLoading}
              optionList={userOptions}
              onChange={(val) => handleFieldChange('admin_user_id', val ?? 0)}
              showClear
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

      {/* Announcement management modal */}
      <Modal
        title={`管理公告${annModalSite ? ` - ${annModalSite.domain}` : ''}`}
        visible={annModalVisible}
        onCancel={() => { setAnnModalVisible(false); setAnnModalSite(null); setAnnList([]); }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              icon={<Plus size={14} />}
              theme='light'
              type='primary'
              onClick={handleAddAnn}
              disabled={annSaving}
            >
              添加公告
            </Button>
            <Button onClick={() => { setAnnModalVisible(false); setAnnModalSite(null); setAnnList([]); }}>
              关闭
            </Button>
          </div>
        }
        width={720}
      >
        <Table
          columns={annColumns}
          dataSource={annList}
          rowKey='id'
          loading={annLoading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size='middle'
          empty={
            <Empty
              image={<IllustrationNoResult style={{ width: 100, height: 100 }} />}
              darkModeImage={<IllustrationNoResultDark style={{ width: 100, height: 100 }} />}
              description='暂无公告'
              style={{ padding: 20 }}
            />
          }
        />
      </Modal>

      {/* Add/Edit announcement modal */}
      <Modal
        title={editingAnn ? '编辑公告' : '添加公告'}
        visible={showAnnEditModal}
        onOk={handleSaveAnn}
        onCancel={() => setShowAnnEditModal(false)}
        okText='保存'
        cancelText='取消'
        confirmLoading={annEditLoading}
      >
        <Form
          layout='vertical'
          initValues={annForm}
          key={editingAnn ? editingAnn.id : 'new-ann'}
          getFormApi={(api) => (annFormApiRef.current = api)}
        >
          <Form.TextArea
            field='content'
            label='公告内容'
            placeholder='请输入公告内容（支持 Markdown/HTML）'
            maxCount={500}
            rows={3}
            rules={[{ required: true, message: '请输入公告内容' }]}
            onChange={(value) => setAnnForm({ ...annForm, content: value })}
          />
          <Button
            theme='light'
            type='tertiary'
            size='small'
            icon={<Maximize2 size={14} />}
            style={{ marginBottom: 16 }}
            onClick={() => setShowContentModal(true)}
          >
            放大编辑
          </Button>
          <Form.DatePicker
            field='publishDate'
            label='发布日期'
            type='dateTime'
            rules={[{ required: true, message: '请选择发布日期' }]}
            onChange={(value) => setAnnForm({ ...annForm, publishDate: value })}
          />
          <Form.Select
            field='type'
            label='公告类型'
            optionList={typeOptions}
            onChange={(value) => setAnnForm({ ...annForm, type: value })}
          />
          <Form.Input
            field='extra'
            label='说明信息'
            placeholder='可选，公告的补充说明'
            onChange={(value) => setAnnForm({ ...annForm, extra: value })}
          />
        </Form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        title='确认删除'
        visible={showAnnDeleteModal}
        onOk={confirmDeleteAnn}
        onCancel={() => { setShowAnnDeleteModal(false); setDeletingAnn(null); }}
        okText='确认删除'
        cancelText='取消'
        type='warning'
        okButtonProps={{ type: 'danger', theme: 'solid' }}
      >
        <Text>确定要删除此公告吗？</Text>
      </Modal>

      {/* Content expand edit modal */}
      <Modal
        title='编辑公告内容'
        visible={showContentModal}
        onOk={() => {
          if (annFormApiRef.current) {
            annFormApiRef.current.setValue('content', annForm.content);
          }
          setShowContentModal(false);
        }}
        onCancel={() => setShowContentModal(false)}
        okText='确定'
        cancelText='取消'
        width={800}
      >
        <TextArea
          value={annForm.content}
          placeholder='请输入公告内容（支持 Markdown/HTML）'
          maxCount={500}
          rows={15}
          style={{ width: '100%' }}
          onChange={(value) => setAnnForm({ ...annForm, content: value })}
        />
      </Modal>
    </div>
  );
};

export default ProxySitePage;
