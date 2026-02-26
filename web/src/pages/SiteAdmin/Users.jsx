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
import { Table, Tag, Typography } from '@douyinfe/semi-ui';
import { API } from '../../helpers/api.js';
import { showError } from '../../helpers/utils.jsx';

const { Title } = Typography;

const SiteAdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadUsers = async (p = 1) => {
    setLoading(true);
    try {
      const res = await API.get(`/api/site_admin/users?p=${p}&page_size=20`);
      if (res.data.success) {
        setUsers(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (e) {
      showError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '用户名', dataIndex: 'username' },
    { title: '邮箱', dataIndex: 'email' },
    { title: '额度', dataIndex: 'quota' },
    { title: '已用额度', dataIndex: 'used_quota' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v) => (
        <Tag color={v === 1 ? 'green' : 'red'}>{v === 1 ? '正常' : '封禁'}</Tag>
      ),
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Title heading={4} style={{ marginBottom: 16 }}>
        站点用户管理
      </Title>
      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        rowKey='id'
        pagination={{
          total,
          pageSize: 20,
          currentPage: page,
          onPageChange: (p) => {
            setPage(p);
            loadUsers(p);
          },
        }}
      />
    </div>
  );
};

export default SiteAdminUsers;
