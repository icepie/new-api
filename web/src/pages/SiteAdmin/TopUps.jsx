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
  Badge,
  Empty,
  Input,
  Table,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { IconSearch } from '@douyinfe/semi-icons';
import { Coins } from 'lucide-react';
import { API, timestamp2string } from '../../helpers/index.js';
import { showError } from '../../helpers/utils.jsx';

const { Text, Title } = Typography;

const STATUS_CONFIG = {
  success: { type: 'success', label: '成功' },
  pending: { type: 'warning', label: '待支付' },
  expired: { type: 'danger', label: '已过期' },
};

const PAYMENT_METHOD_MAP = {
  stripe: 'Stripe',
  creem: 'Creem',
  alipay: '支付宝',
  wxpay: '微信',
};

const renderStatusBadge = (status) => {
  const config = STATUS_CONFIG[status] || { type: 'primary', label: status };
  return (
    <span className='flex items-center gap-2'>
      <Badge dot type={config.type} />
      <span>{config.label}</span>
    </span>
  );
};

const renderPaymentMethod = (pm) => {
  const name = PAYMENT_METHOD_MAP[pm];
  return <Text>{name || pm || '-'}</Text>;
};

const isSubscriptionTopup = (record) => {
  const tradeNo = (record?.trade_no || '').toLowerCase();
  return Number(record?.amount || 0) === 0 && tradeNo.startsWith('sub');
};

const columns = [
  {
    title: '订单号',
    dataIndex: 'trade_no',
    render: (text) => <Text copyable>{text}</Text>,
  },
  {
    title: '支付方式',
    dataIndex: 'payment_method',
    render: renderPaymentMethod,
  },
  {
    title: '充值额度',
    dataIndex: 'amount',
    render: (amount, record) => {
      if (isSubscriptionTopup(record)) {
        return (
          <Tag color='purple' shape='circle' size='small'>
            订阅套餐
          </Tag>
        );
      }
      return (
        <span className='flex items-center gap-1'>
          <Coins size={16} />
          <Text>{amount}</Text>
        </span>
      );
    },
  },
  {
    title: '支付金额',
    dataIndex: 'money',
    render: (money) => <Text type='danger'>¥{Number(money).toFixed(2)}</Text>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    render: renderStatusBadge,
  },
  {
    title: '创建时间',
    dataIndex: 'create_time',
    render: (time) => timestamp2string(time),
  },
];

const SiteAdminTopUps = () => {
  const [topups, setTopups] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const loadTopUps = async (p = 1, ps = pageSize, kw = keyword) => {
    setLoading(true);
    try {
      const qs =
        `p=${p}&page_size=${ps}` +
        (kw ? `&keyword=${encodeURIComponent(kw)}` : '');
      const res = await API.get(`/api/site_admin/topups?${qs}`);
      if (res.data.success) {
        setTopups(res.data.data?.items || res.data.data || []);
        setTotal(res.data.data?.total ?? res.data.total ?? 0);
      } else {
        showError(res.data.message || '加载失败');
      }
    } catch (e) {
      showError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopUps(1, pageSize, keyword);
  }, []);

  const handleKeywordChange = (value) => {
    setKeyword(value);
    setPage(1);
    loadTopUps(1, pageSize, value);
  };

  return (
    <div className='mt-[60px] px-2'>
      <Title heading={5} style={{ marginBottom: 16 }}>
        站点充值记录
      </Title>

      <div className='mb-3'>
        <Input
          prefix={<IconSearch />}
          placeholder='订单号'
          value={keyword}
          onChange={handleKeywordChange}
          showClear
          style={{ maxWidth: 320 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={topups}
        loading={loading}
        rowKey='id'
        scroll={{ x: 'max-content' }}
        size='small'
        pagination={{
          total,
          pageSize,
          currentPage: page,
          showSizeChanger: true,
          pageSizeOpts: [10, 20, 50, 100],
          onPageChange: (p) => {
            setPage(p);
            loadTopUps(p, pageSize, keyword);
          },
          onPageSizeChange: (ps) => {
            setPageSize(ps);
            setPage(1);
            loadTopUps(1, ps, keyword);
          },
        }}
        empty={
          <Empty
            image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
            darkModeImage={
              <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
            }
            description='暂无充值记录'
            style={{ padding: 30 }}
          />
        }
      />
    </div>
  );
};

export default SiteAdminTopUps;
