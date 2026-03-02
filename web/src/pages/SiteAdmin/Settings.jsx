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
import { Button, Form, Spin, Typography } from '@douyinfe/semi-ui';
import { API } from '../../helpers/api.js';
import { showError, showSuccess } from '../../helpers/utils.jsx';

const { Title } = Typography;

const SiteAdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [formApi, setFormApi] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get('/api/site_admin/settings');
        if (res.data.success) {
          formApi?.setValues(res.data.data);
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

  return (
    <div className='mt-[60px] px-2'>
      <Title heading={5} style={{ marginBottom: 24 }}>站点设置</Title>
      <Spin spinning={loading}>
        <Form
          getFormApi={setFormApi}
          onSubmit={handleSubmit}
          style={{ maxWidth: 520 }}
          labelPosition='left'
          labelWidth={80}
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
          <div style={{ marginLeft: 80 }}>
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
