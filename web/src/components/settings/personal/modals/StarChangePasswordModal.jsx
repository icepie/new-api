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
import { Input, Modal, Typography, Button } from '@douyinfe/semi-ui';
import { IconLock, IconKey } from '@douyinfe/semi-icons';

const StarChangePasswordModal = ({
  t,
  showChangePasswordModal,
  setShowChangePasswordModal,
  inputs,
  handleInputChange,
  changePassword,
  sendVerificationCode,
  disableButton,
  loading,
  countdown,
  userEmail,
}) => {
  return (
    <Modal
      title={
        <div className='flex items-center'>
          <IconLock className='mr-2 text-orange-500' />
          {t('修改密码')}
        </div>
      }
      visible={showChangePasswordModal}
      onCancel={() => setShowChangePasswordModal(false)}
      onOk={changePassword}
      size={'small'}
      centered={true}
      className='modern-modal'
      okButtonProps={{ loading }}
    >
      <div className='space-y-4 py-4'>
        <div>
          <Typography.Text strong className='block mb-2'>
            {t('邮箱')}
          </Typography.Text>
          <Input
            readonly
            value={userEmail || inputs.email}
            size='large'
            className='!rounded-lg'
            prefix={<IconKey />}
          />
        </div>

        <div>
          <Typography.Text strong className='block mb-2'>
            {t('邮箱验证码')}
          </Typography.Text>
          <div className='flex gap-2'>
            <Input
              name='email_code'
              placeholder={t('请输入验证码')}
              value={inputs.email_code}
              onChange={(value) => handleInputChange('email_code', value)}
              size='large'
              className='!rounded-lg flex-1'
              prefix={<IconKey />}
            />
            <div className='flex items-end'>
              <Button
                onClick={sendVerificationCode}
                disabled={disableButton || loading}
                className='!rounded-lg'
                type='primary'
                theme='outline'
                size='large'
              >
                {disableButton
                  ? `${t('重新发送')} (${countdown})`
                  : t('获取验证码')}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <Typography.Text strong className='block mb-2'>
            {t('新密码')}
          </Typography.Text>
          <Input
            name='set_new_password'
            placeholder={t('请输入新密码')}
            type='password'
            value={inputs.set_new_password}
            onChange={(value) => handleInputChange('set_new_password', value)}
            size='large'
            className='!rounded-lg'
            prefix={<IconLock />}
          />
        </div>

        <div>
          <Typography.Text strong className='block mb-2'>
            {t('确认新密码')}
          </Typography.Text>
          <Input
            name='set_new_password_confirmation'
            placeholder={t('请再次输入新密码')}
            type='password'
            value={inputs.set_new_password_confirmation}
            onChange={(value) =>
              handleInputChange('set_new_password_confirmation', value)
            }
            size='large'
            className='!rounded-lg'
            prefix={<IconLock />}
          />
        </div>
      </div>
    </Modal>
  );
};

export default StarChangePasswordModal;

