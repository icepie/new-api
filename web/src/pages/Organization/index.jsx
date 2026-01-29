import React, { useEffect, useState, useRef } from 'react';
import { Button, Table, Avatar, Tag, Space, Popconfirm, Modal, Form, Input, Select, Toast } from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../helpers';

const Organization = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    status: 'enabled',
  });
  const formApiRef = useRef(null);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '组织代码',
      dataIndex: 'code',
      width: 150,
    },
    {
      title: '组织名称',
      dataIndex: 'name',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 300,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => {
        return status === 'enabled' ? (
          <Tag color="green">启用</Tag>
        ) : (
          <Tag color="red">禁用</Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (text) => {
        return new Date(text).toLocaleString();
      },
    },
    {
      title: '操作',
      dataIndex: 'operate',
      width: 200,
      render: (text, record) => (
        <Space>
          <Button
            theme="light"
            type="primary"
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该组织吗?"
            content="删除后无法恢复,且该组织下的用户也将无法访问"
            onConfirm={() => handleDelete(record.id)}
            okType="danger"
          >
            <Button theme="light" type="danger" size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
      showError('加载组织列表失败');
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
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await API.delete(`/api/organization/${id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess('删除成功');
        loadOrganizations();
      } else {
        showError(message);
      }
    } catch (error) {
      showError('删除失败');
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
        showSuccess(editingOrg ? '更新成功' : '创建成功');
        setModalVisible(false);
        loadOrganizations();
      } else {
        showError(message);
      }
    } catch (error) {
      showError('操作失败');
    }
  };

  return (
    <div className='mt-[60px] px-2'>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
        <Space>
          <Input
            placeholder="搜索组织代码或名称"
            value={keyword}
            onChange={(value) => setKeyword(value)}
            onEnterPress={handleSearch}
            style={{ width: 250 }}
          />
          <Select
            placeholder="状态"
            value={status}
            onChange={(value) => setStatus(value)}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="enabled">启用</Select.Option>
            <Select.Option value="disabled">禁用</Select.Option>
          </Select>
          <Button onClick={handleSearch}>搜索</Button>
          <Button type="primary" onClick={handleAdd}>
            新建组织
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={organizations}
        loading={loading}
        pagination={{
          currentPage: page,
          pageSize: pageSize,
          total: total,
          onPageChange: (page) => setPage(page),
        }}
        rowKey="id"
      />

      <Modal
        title={editingOrg ? '编辑组织' : '新建组织'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form
          initValues={formData}
          key={editingOrg ? editingOrg.id : 'new'}
          getFormApi={(api) => (formApiRef.current = api)}
          labelPosition="left"
          labelWidth={100}
        >
          <Form.Input
            field="code"
            label="组织代码"
            rules={[{ required: true, message: '请输入组织代码' }]}
            placeholder="请输入组织代码(唯一标识)"
          />
          <Form.Input
            field="name"
            label="组织名称"
            rules={[{ required: true, message: '请输入组织名称' }]}
            placeholder="请输入组织名称"
          />
          <Form.TextArea
            field="description"
            label="描述"
            placeholder="请输入组织描述"
            maxLength={1000}
          />
          <Form.Select
            field="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select.Option value="enabled">启用</Select.Option>
            <Select.Option value="disabled">禁用</Select.Option>
          </Form.Select>
        </Form>
      </Modal>
    </div>
    </div>
  );
};

export default Organization;
