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
  Divider,
  Empty,
  Form,
  Modal,
  Space,
  Table,
  Tag,
  TextArea,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { Bell, Edit, Maximize2, Plus, Save, Trash2 } from 'lucide-react';
import { API } from '../../helpers/api.js';
import { showError, showSuccess } from '../../helpers/utils.jsx';

const { Text, Title } = Typography;

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

const SiteAdminAnnouncements = () => {
  const [annList, setAnnList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState(null);
  const [deletingAnn, setDeletingAnn] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [annForm, setAnnForm] = useState({
    content: '',
    publishDate: new Date(),
    type: 'default',
    extra: '',
  });
  const formApiRef = useRef(null);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/site_admin/announcements');
      if (res.data.success) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        const listWithIds = list.map((item, index) => ({
          ...item,
          id: item.id || index + 1,
        }));
        setAnnList(listWithIds);
      } else {
        showError(res.data.message || '加载公告失败');
      }
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const saveAnnouncements = async () => {
    setSaving(true);
    try {
      const res = await API.put('/api/site_admin/announcements', {
        announcements: JSON.stringify(annList),
      });
      if (res.data.success) {
        showSuccess('公告已保存');
        setHasChanges(false);
      } else {
        showError(res.data.message || '保存失败');
      }
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnn = () => {
    setEditingAnn(null);
    setAnnForm({ content: '', publishDate: new Date(), type: 'default', extra: '' });
    setShowEditModal(true);
  };

  const handleEditAnn = (record) => {
    setEditingAnn(record);
    setAnnForm({
      content: record.content || '',
      publishDate: record.publishDate ? new Date(record.publishDate) : new Date(),
      type: record.type || 'default',
      extra: record.extra || '',
    });
    setShowEditModal(true);
  };

  const handleDeleteAnn = (record) => {
    setDeletingAnn(record);
    setShowDeleteModal(true);
  };

  const confirmDeleteAnn = () => {
    if (deletingAnn) {
      setAnnList((prev) => prev.filter((item) => item.id !== deletingAnn.id));
      setHasChanges(true);
      showSuccess('公告已删除，请点击"保存"提交');
    }
    setShowDeleteModal(false);
    setDeletingAnn(null);
  };

  const handleSaveAnn = async () => {
    if (!annForm.content || !annForm.publishDate) {
      showError('请填写完整的公告信息');
      return;
    }
    setEditLoading(true);
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
      setHasChanges(true);
      setShowEditModal(false);
      showSuccess(editingAnn ? '公告已更新，请点击"保存"提交' : '公告已添加，请点击"保存"提交');
    } finally {
      setEditLoading(false);
    }
  };

  // Sort by publishDate desc
  const sortedList = [...annList].sort((a, b) => {
    const da = new Date(a.publishDate).getTime();
    const db = new Date(b.publishDate).getTime();
    return db - da;
  });

  const columns = [
    {
      title: '内容',
      dataIndex: 'content',
      render: (text) => (
        <Tooltip content={text} position='topLeft' showArrow>
          <div
            style={{
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {text}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishDate',
      width: 175,
      render: (val) => {
        if (!val) return '-';
        const d = new Date(val);
        return (
          <div>
            <div style={{ fontWeight: 'bold' }}>{d.toLocaleDateString()}</div>
            <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
              {d.toLocaleTimeString()}
            </div>
          </div>
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (type) => (
        <Tag color={getTypeColor(type)} shape='circle'>
          {typeOptions.find((o) => o.value === type)?.label || type}
        </Tag>
      ),
    },
    {
      title: '说明',
      dataIndex: 'extra',
      render: (text) => (
        <Tooltip content={text || '-'} showArrow>
          <div
            style={{
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--semi-color-text-2)',
            }}
          >
            {text || '-'}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            icon={<Edit size={14} />}
            theme='light'
            type='tertiary'
            size='small'
            onClick={() => handleEditAnn(record)}
          >
            编辑
          </Button>
          <Button
            icon={<Trash2 size={14} />}
            type='danger'
            theme='light'
            size='small'
            onClick={() => handleDeleteAnn(record)}
          >
            删除
          </Button>
        </Space>
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
          marginBottom: 8,
        }}
      >
        <Title heading={5} style={{ margin: 0 }}>
          站点公告管理
        </Title>
      </div>

      <div className='flex items-center text-blue-500 mb-2'>
        <Bell size={16} style={{ marginRight: 8 }} />
        <Text>管理本站公告，发布后用户访问站点时将看到这些公告（最多100个）</Text>
      </div>

      <Divider margin='12px' />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button
          theme='light'
          type='primary'
          icon={<Plus size={14} />}
          onClick={handleAddAnn}
        >
          添加公告
        </Button>
        <Button
          icon={<Save size={14} />}
          onClick={saveAnnouncements}
          loading={saving}
          disabled={!hasChanges}
          type='secondary'
        >
          保存设置
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={sortedList}
        rowKey='id'
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20'],
        }}
        size='middle'
        empty={
          <Empty
            image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
            darkModeImage={<IllustrationNoResultDark style={{ width: 150, height: 150 }} />}
            description='暂无公告'
            style={{ padding: 30 }}
          />
        }
      />

      {/* Add/Edit modal */}
      <Modal
        title={editingAnn ? '编辑公告' : '添加公告'}
        visible={showEditModal}
        onOk={handleSaveAnn}
        onCancel={() => setShowEditModal(false)}
        okText='保存'
        cancelText='取消'
        confirmLoading={editLoading}
      >
        <Form
          layout='vertical'
          initValues={annForm}
          key={editingAnn ? editingAnn.id : 'new-site-ann'}
          getFormApi={(api) => (formApiRef.current = api)}
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
        visible={showDeleteModal}
        onOk={confirmDeleteAnn}
        onCancel={() => { setShowDeleteModal(false); setDeletingAnn(null); }}
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
          if (formApiRef.current) {
            formApiRef.current.setValue('content', annForm.content);
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

export default SiteAdminAnnouncements;
