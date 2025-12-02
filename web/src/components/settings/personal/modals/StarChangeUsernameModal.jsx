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

import React from 'react';
import { Input, Modal, Typography } from '@douyinfe/semi-ui';
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
  const handleOk = async () => {
    // 基本验证
    if (!inputs.username || inputs.username.trim() === '') {
      return;
    }
    if (inputs.username.length > 20) {
      return;
    }
    await changeUsername({ username: inputs.username });
  };

  return (
    <Modal
      title={
        <div className='flex items-center'>
          <IconUser className='mr-2 text-orange-500' />
          {t('修改用户名')}
        </div>
      }
      visible={showChangeUsernameModal}
      onCancel={() => setShowChangeUsernameModal(false)}
      onOk={handleOk}
      size={'small'}
      centered={true}
      className='modern-modal'
      okButtonProps={{ loading }}
    >
      <div className='space-y-4 py-4'>
        <div>
          <Typography.Text strong className='block mb-2'>
            {t('用户名')}
          </Typography.Text>
          <Input
            name='username'
            placeholder={t('请输入新用户名')}
            value={inputs.username || userState?.user?.username || ''}
            onChange={(value) => handleInputChange('username', value)}
            size='large'
            className='!rounded-lg'
            prefix={<IconUser />}
            maxLength={20}
          />
        </div>
      </div>
    </Modal>
  );
};

export default StarChangeUsernameModal;

