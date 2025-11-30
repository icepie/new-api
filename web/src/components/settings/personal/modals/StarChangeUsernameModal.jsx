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

import React, { useRef } from 'react';
import { Input, Modal, Form, Button } from '@douyinfe/semi-ui';
import { IconUser } from '@douyinfe/semi-icons';

const StarChangeUsernameModal = ({
  t,
  showChangeUsernameModal,
  setShowChangeUsernameModal,
  inputs,
  handleInputChange,
  changeUsername,
  loading,
  userState,
}) => {
  const formApiRef = useRef(null);

  const handleOk = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!formApiRef.current) {
      console.error('表单 API 未初始化');
      return;
    }
    try {
      console.log('开始验证表单...');
      const values = await formApiRef.current.validate();
      console.log('表单验证通过，值:', values);
      console.log('调用 changeUsername 函数...');
      await changeUsername(values);
    } catch (errors) {
      // Validation failed, Semi Design will automatically display error messages
      console.error('表单验证失败:', errors);
    }
  };

  return (
    <Modal
      title={
        <div className='flex items-center'>
          <IconUser className='mr-2 text-blue-500' />
          {t('修改用户名')}
        </div>
      }
      visible={showChangeUsernameModal}
      onCancel={() => setShowChangeUsernameModal(false)}
      footer={null}
      size={'small'}
      centered={true}
      maskClosable={false}
      className='modern-modal'
    >
      <Form
        getFormApi={(api) => (formApiRef.current = api)}
        initValues={{ username: inputs.username || userState?.user?.username || '' }}
        onSubmit={handleOk}
      >
        {({ formState }) => (
          <>
        <div className='space-y-4 py-4'>
            <Form.Input
              field='username'
              label={t('用户名')}
              placeholder={t('请输入新用户名')}
              rules={[
                { required: true, message: t('请输入用户名') },
                { max: 20, message: t('用户名不能超过20个字符') },
              ]}
              prefix={<IconUser />}
            />
          </div>
          <div className='flex justify-end gap-2 mt-4'>
            <Button 
              onClick={() => {
                console.log('取消按钮被点击');
                setShowChangeUsernameModal(false);
              }}
            >
              {t('取消')}
            </Button>
            <Button
              type='primary'
              onClick={(e) => {
                console.log('确定按钮被点击');
                handleOk(e);
              }}
              loading={loading}
            >
              {t('确定')}
            </Button>
          </div>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default StarChangeUsernameModal;

