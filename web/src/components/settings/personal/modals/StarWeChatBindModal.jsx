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
import { Button, Modal, Spin, Typography } from '@douyinfe/semi-ui';
import { SiWechat } from 'react-icons/si';

const { Text } = Typography;

const StarWeChatBindModal = ({
  t,
  showWeChatBindModal,
  setShowWeChatBindModal,
  bindWeChat,
  wechatQRCode,
  wechatQRStatus,
  loading,
}) => {
  return (
    <Modal
      title={
        <div className='flex items-center'>
          <SiWechat className='mr-2 text-green-500' size={20} />
          {t('绑定微信账户')}
        </div>
      }
      visible={showWeChatBindModal}
      onCancel={() => setShowWeChatBindModal(false)}
      footer={null}
      size={'small'}
      centered={true}
      className='modern-modal'
    >
      <div className='space-y-4 py-4 text-center'>
        {wechatQRStatus === 'loading' ? (
          <div className='flex justify-center items-center h-48'>
            <Spin size='large' />
          </div>
        ) : wechatQRStatus === 'expired' ? (
          <div className='flex flex-col justify-center items-center h-48 space-y-4'>
            <div className='text-red-500'>{t('二维码已过期')}</div>
            <Button
              type='primary'
              theme='solid'
              onClick={() => {
                setShowWeChatBindModal(false);
                // 触发重新获取二维码
                setTimeout(() => {
                  window.location.reload();
                }, 100);
              }}
            >
              {t('重新获取')}
            </Button>
          </div>
        ) : wechatQRCode ? (
          <>
            <div className='flex justify-center'>
              <div className="relative inline-block">
                {loading || wechatQRStatus === 'loading' ? (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <Spin size="large" />
                  </div>
                ) : wechatQRStatus === 'expired' ? (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-gray-50 dark:bg-gray-800 border border-dashed border-red-500 rounded-lg">
                    <div className='text-red-500 text-sm text-center px-2'>{t('二维码已过期')}</div>
                  </div>
                ) : wechatQRCode ? (
                  <div className="relative bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <img
                      src={wechatQRCode}
                      alt={t('微信二维码')}
                      className="w-44 h-44 sm:w-52 sm:h-52 block"
                      style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                    />
                    {wechatQRStatus === 'scanned' && (
                      <div className="absolute inset-0 bg-green-500 bg-opacity-10 flex items-center justify-center rounded-lg border-2 border-green-500">
                        <div className="text-center">
                          <Text className="text-green-600 dark:text-green-400 text-sm">{t('已扫描')}</Text>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className='text-red-500 text-sm'>{t('二维码加载失败')}</div>
                  </div>
                )}
              </div>
            </div>
            <div className='text-gray-600 max-w-xs mx-auto px-2 leading-relaxed mb-6'>
              {wechatQRStatus === 'scanned' ? (
                <p className='text-green-600'>{t('已扫描，正在绑定...')}</p>
              ) : (
                <p>{t('使用微信扫描上方二维码完成绑定')}</p>
              )}
            </div>
            {wechatQRStatus === 'scanned' && (
              <Button
                type='primary'
                theme='solid'
                size='large'
                onClick={bindWeChat}
                loading={loading}
                className='!rounded-lg w-full !bg-slate-600 hover:!bg-slate-700'
                icon={<SiWechat size={16} />}
              >
                {t('确认绑定')}
              </Button>
            )}
          </>
        ) : (
          <div className='flex justify-center items-center h-48'>
            <Spin size='large' />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StarWeChatBindModal;

