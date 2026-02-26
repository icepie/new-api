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

const STATUS_MAP = {
  pending: { color: 'orange', text: '待完成' },
  success: { color: 'green', text: '成功' },
  failed: { color: 'red', text: '失败' },
};

const SiteAdminTopUps = () => {
  const [topups, setTopups] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadTopUps = async (p = 1) => {
    setLoading(true);
    try {
      const res = await API.get(`/api/site_admin/topups?p=${p}&page_size=20`);
      if (res.data.success) {
        setTopups(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (e) {
      showError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopUps(1);
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '用户ID', dataIndex: 'user_id', width: 100 },
    {
      title: '金额',
      dataIndex: 'money',
      render: (v) => (v != null ? `¥${v.toFixed(2)}` : '-'),
    },
    { title: '额度', dataIndex: 'amount' },
    { title: '支付方式', dataIndex: 'payment_method' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v) => {
        const s = STATUS_MAP[v] || { color: 'grey', text: v };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      render: (v) => (v ? new Date(v * 1000).toLocaleString() : '-'),
    },
    {
      title: '完成时间',
      dataIndex: 'complete_time',
      render: (v) => (v ? new Date(v * 1000).toLocaleString() : '-'),
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Title heading={4} style={{ marginBottom: 16 }}>
        站点充值记录
      </Title>
      <Table
        columns={columns}
        dataSource={topups}
        loading={loading}
        rowKey='id'
        pagination={{
          total,
          pageSize: 20,
          currentPage: page,
          onPageChange: (p) => {
            setPage(p);
            loadTopUps(p);
          },
        }}
      />
    </div>
  );
};

export default SiteAdminTopUps;
