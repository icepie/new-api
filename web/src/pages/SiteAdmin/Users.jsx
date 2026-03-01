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
  Empty,
  Popover,
  Progress,
  Space,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import CardPro from '../../components/common/ui/CardPro';
import CardTable from '../../components/common/ui/CardTable';
import { API } from '../../helpers/api.js';
import { createCardProPagination, showError } from '../../helpers/utils.jsx';
import { renderGroup, renderNumber, renderQuota } from '../../helpers/render.jsx';
import { useIsMobile } from '../../hooks/common/useIsMobile';

const { Title, Paragraph } = Typography;

const renderRole = (role) => {
  switch (role) {
    case 1:   return <Tag color='blue'   shape='circle'>普通用户</Tag>;
    case 10:  return <Tag color='yellow' shape='circle'>管理员</Tag>;
    case 100: return <Tag color='orange' shape='circle'>超级管理员</Tag>;
    default:  return <Tag color='red'    shape='circle'>未知身份</Tag>;
  }
};

const renderUsername = (text, record) => {
  const remark = record.remark;
  if (!remark) return <span>{text}</span>;
  const maxLen = 10;
  const displayRemark = remark.length > maxLen ? remark.slice(0, maxLen) + '…' : remark;
  return (
    <Space spacing={2}>
      <span>{text}</span>
      <Tooltip content={remark} position='top' showArrow>
        <Tag color='white' shape='circle' className='!text-xs'>
          <div className='flex items-center gap-1'>
            <div className='w-2 h-2 flex-shrink-0 rounded-full' style={{ backgroundColor: '#10b981' }} />
            {displayRemark}
          </div>
        </Tag>
      </Tooltip>
    </Space>
  );
};

const renderStatus = (record) => {
  const isDeleted = record.DeletedAt !== null;
  let tagColor = 'grey', tagText = '未知状态';
  if (isDeleted)          { tagColor = 'red';   tagText = '已注销'; }
  else if (record.status === 1) { tagColor = 'green'; tagText = '已启用'; }
  else if (record.status === 2) { tagColor = 'red';   tagText = '已禁用'; }
  return (
    <Tooltip content={<div className='text-xs'>调用次数: {renderNumber(record.request_count)}</div>} position='top'>
      <Tag color={tagColor} shape='circle' size='small'>{tagText}</Tag>
    </Tooltip>
  );
};

const renderQuotaUsage = (record) => {
  const used    = parseInt(record.used_quota) || 0;
  const remain  = parseInt(record.quota) || 0;
  const total   = used + remain;
  const percent = total > 0 ? (remain / total) * 100 : 0;
  return (
    <Popover
      content={
        <div className='text-xs p-2'>
          <Paragraph copyable={{ content: renderQuota(used) }}>已用额度: {renderQuota(used)}</Paragraph>
          <Paragraph copyable={{ content: renderQuota(remain) }}>剩余额度: {renderQuota(remain)} ({percent.toFixed(0)}%)</Paragraph>
          <Paragraph copyable={{ content: renderQuota(total) }}>总额度: {renderQuota(total)}</Paragraph>
        </div>
      }
      position='top'
    >
      <Tag color='white' shape='circle'>
        <div className='flex flex-col items-end'>
          <span className='text-xs leading-none'>{`${renderQuota(remain)} / ${renderQuota(total)}`}</span>
          <Progress percent={percent} aria-label='quota usage' format={() => `${percent.toFixed(0)}%`}
            style={{ width: '100%', marginTop: '1px', marginBottom: 0 }} />
        </div>
      </Tag>
    </Popover>
  );
};

const renderInviteInfo = (record) => (
  <Space spacing={1}>
    <Tag color='white' shape='circle' className='!text-xs'>邀请: {renderNumber(record.aff_count)}</Tag>
    <Tag color='white' shape='circle' className='!text-xs'>收益: {renderQuota(record.aff_history_quota)}</Tag>
    <Tag color='white' shape='circle' className='!text-xs'>
      {record.inviter_id === 0 ? '无邀请人' : `邀请人: ${record.inviter_id}`}
    </Tag>
  </Space>
);

const columns = [
  { title: 'ID', dataIndex: 'id' },
  { title: '用户名', dataIndex: 'username', render: (text, record) => renderUsername(text, record) },
  { title: '状态', dataIndex: 'info', render: (_, record) => renderStatus(record) },
  { title: '剩余额度/总额度', key: 'quota_usage', render: (_, record) => renderQuotaUsage(record) },
  { title: '分组', dataIndex: 'group', render: (text) => <div>{renderGroup(text)}</div> },
  { title: '角色', dataIndex: 'role', render: (text) => renderRole(text) },
  { title: '邀请信息', dataIndex: 'invite', render: (_, record) => renderInviteInfo(record) },
];

const SiteAdminUsers = () => {
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading]   = useState(false);
  const isMobile                = useIsMobile();

  const loadUsers = async (p = 1, ps = pageSize) => {
    setLoading(true);
    try {
      const res = await API.get(`/api/site_admin/users?p=${p}&page_size=${ps}`);
      if (res.data.success) {
        setUsers(res.data.data || []);
        setTotal(res.data.total || 0);
      } else {
        showError(res.data.message || '加载失败');
      }
    } catch {
      showError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(1, pageSize); }, []);

  const handlePageChange     = (p)  => { setPage(p);       loadUsers(p, pageSize); };
  const handlePageSizeChange = (ps) => { setPageSize(ps); setPage(1); loadUsers(1, ps); };

  return (
    <div className='mt-[60px] px-2'>
      <CardPro
        type='type1'
        descriptionArea={<Title heading={5} style={{ margin: 0 }}>站点用户管理</Title>}
        paginationArea={createCardProPagination({
          currentPage: page,
          pageSize,
          total,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
          isMobile,
        })}
      >
        <CardTable
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey='id'
          scroll={{ x: 'max-content' }}
          hidePagination
          size='middle'
          empty={
            <Empty
              image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
              darkModeImage={<IllustrationNoResultDark style={{ width: 150, height: 150 }} />}
              description='暂无用户'
              style={{ padding: 30 }}
            />
          }
        />
      </CardPro>
    </div>
  );
};

export default SiteAdminUsers;
