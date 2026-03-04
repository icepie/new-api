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
  Descriptions,
  Divider,
  Form,
  Spin,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { API } from '../../helpers/api.js';
import { showError, showSuccess, timestamp2string } from '../../helpers/utils.jsx';

const { Title } = Typography;

const SiteAdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [formApi, setFormApi] = useState(null);
  const [siteInfo, setSiteInfo] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get('/api/site_admin/settings');
        if (res.data.success) {
          const data = res.data.data;
          setSiteInfo(data);
          formApi?.setValues({
            name:         data.name,
            logo:         data.logo,
            remark:       data.remark,
            docs_link:    data.docs_link,
            api_docs_link: data.api_docs_link,
          });
        } else {
          showError(res.data.message || '加载失败');
        }
      } catch {
        showError('加载失败');
      } finally {
        setLoading(false);
      }
    };
    if (formApi) load();
  }, [formApi]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const res = await API.put('/api/site_admin/settings', values);
      if (res.data.success) {
        showSuccess('保存成功');
      } else {
        showError(res.data.message || '保存失败');
      }
    } catch {
      showError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const readonlyData = siteInfo
    ? [
        { key: '域名',     value: siteInfo.domain || '—' },
        { key: '返利比例', value: siteInfo.rebate_ratio != null ? siteInfo.rebate_ratio : '—' },
        {
          key: '状态',
          value: siteInfo.status === 1
            ? <Tag color='green' size='small'>启用</Tag>
            : <Tag color='red' size='small'>禁用</Tag>,
        },
        { key: '创建时间', value: siteInfo.created_time ? timestamp2string(siteInfo.created_time) : '—' },
      ]
    : [];

  return (
    <div className='mt-[60px] px-2' style={{ maxWidth: 600 }}>
      <Title heading={5} style={{ marginBottom: 20 }}>站点设置</Title>
      <Spin spinning={loading}>
        {/* 只读站点信息 */}
        {siteInfo && (
          <>
            <Descriptions
              data={readonlyData}
              row
              size='medium'
              style={{ marginBottom: 8 }}
            />
            <Divider style={{ margin: '16px 0' }} />
          </>
        )}

        {/* 可编辑字段 */}
        <Form
          getFormApi={setFormApi}
          onSubmit={handleSubmit}
          labelPosition='left'
          labelWidth={90}
        >
          <Form.Input
            field='name'
            label='站点名称'
            placeholder='请输入站点名称'
          />
          <Form.Input
            field='logo'
            label='Logo URL'
            placeholder='请输入图片链接'
          />
          <Form.TextArea
            field='remark'
            label='备注'
            placeholder='站点备注（仅超级管理员可见）'
            rows={3}
          />
          <Form.Input
            field='docs_link'
            label='使用教程'
            placeholder='使用教程链接（留空则使用全局设置）'
          />
          <Form.Input
            field='api_docs_link'
            label='接口文档'
            placeholder='接口文档链接（留空则使用全局设置）'
          />
          <div style={{ marginLeft: 90 }}>
            <Button htmlType='submit' type='primary' loading={saving}>
              保存
            </Button>
          </div>
        </Form>
      </Spin>
    </div>
  );
};

export default SiteAdminSettings;
