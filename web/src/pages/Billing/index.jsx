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
import { Card, Table, Tag, Descriptions, Progress, Button, Popover, Skeleton } from '@douyinfe/semi-ui';
import { API, showError, renderQuota, copy, showSuccess } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { useMinimumLoadingTime } from '../../hooks/common/useMinimumLoadingTime';
import { useTranslation } from 'react-i18next';
import { Empty } from '@douyinfe/semi-ui';
import { IllustrationNoResult, IllustrationNoResultDark } from '@douyinfe/semi-illustrations';
import { useNavigate } from 'react-router-dom';
import { IconUserGroup, IconCopy } from '@douyinfe/semi-icons';

const Billing = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const showSkeleton = useMinimumLoadingTime(loading);
  const [organization, setOrganization] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 获取当前用户信息
  const loadCurrentUser = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        // 判断是否是管理员（组织管理员role=10 或 超级管理员role=100）
        setIsAdmin(user.role === 10 || user.role === 100);
        return user;
      }
    } catch (error) {
      console.error('Failed to parse user data:', error);
    }
    return null;
  };

  // 加载个人额度信息（普通用户）
  const loadPersonalData = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/user/self');
      const { success, message, data } = res.data;
      if (success) {
        setCurrentUser(data);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('加载个人信息失败'));
    } finally {
      setLoading(false);
    }
  };

  // 加载组织计费信息（管理员）
  const loadBillingData = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/organization/billing');
      const { success, message, data } = res.data;
      if (success) {
        setOrganization(data.organization);
        setUsers(data.users || []);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('加载计费信息失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const user = await loadCurrentUser();
      if (user) {
        // 如果是管理员，加载完整的组织计费信息
        if (user.role === 10 || user.role === 100) {
          await loadBillingData();
        } else {
          // 如果是普通用户，只加载个人信息
          await loadPersonalData();
        }
      }
    };
    init();
  }, []);

  // 渲染额度使用情况（带进度条）
  const renderQuotaUsage = (text, record) => {
    const used = parseInt(record.used_quota) || 0;
    const remain = parseInt(record.quota) || 0;
    const total = used + remain;
    const percent = total > 0 ? (remain / total) * 100 : 0;

    const popoverContent = (
      <div className='space-y-2 p-2'>
        <div className='flex justify-between gap-4'>
          <span className='text-gray-600'>{t('已用额度')}:</span>
          <span className='font-medium'>{renderQuota(used)}</span>
        </div>
        <div className='flex justify-between gap-4'>
          <span className='text-gray-600'>{t('剩余额度')}:</span>
          <span className='font-medium'>{renderQuota(remain)}</span>
        </div>
        <div className='flex justify-between gap-4'>
          <span className='text-gray-600'>{t('总额度')}:</span>
          <span className='font-medium'>{renderQuota(total)}</span>
        </div>
        <div className='flex justify-between gap-4'>
          <span className='text-gray-600'>{t('使用率')}:</span>
          <span className='font-medium'>{(100 - percent).toFixed(1)}%</span>
        </div>
      </div>
    );

    return (
      <Popover content={popoverContent} position='top'>
        <Tag color='white' shape='circle'>
          <div className='flex flex-col items-end'>
            <span className='text-xs leading-none'>{`${renderQuota(remain)} / ${renderQuota(total)}`}</span>
            <Progress
              percent={percent}
              aria-label='quota usage'
              format={() => `${percent.toFixed(0)}%`}
              style={{ width: '100%', marginTop: '1px', marginBottom: 0 }}
            />
          </div>
        </Tag>
      </Popover>
    );
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: t('用户名'),
      dataIndex: 'username',
      width: 150,
    },
    {
      title: t('显示名称'),
      dataIndex: 'display_name',
      width: 150,
    },
    {
      title: t('角色'),
      dataIndex: 'role',
      width: 100,
      render: (role) => {
        const roleMap = {
          1: { text: t('普通用户'), color: 'blue' },
          10: { text: t('管理员'), color: 'orange' },
          100: { text: t('超级管理员'), color: 'red' },
        };
        const roleInfo = roleMap[role] || { text: t('未知'), color: 'grey' };
        return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
      },
    },
    {
      title: t('额度使用'),
      dataIndex: 'quota',
      width: 200,
      render: (text, record) => renderQuotaUsage(text, record),
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      width: 100,
      render: (status) => {
        return status === 1 ? (
          <Tag color='green'>{t('启用')}</Tag>
        ) : (
          <Tag color='red'>{t('禁用')}</Tag>
        );
      },
    },
  ];

  const getQuotaPercent = () => {
    if (!organization) return 0;

    if (organization.billing_type === 'prepaid') {
      // 预付费：剩余额度占总额度的百分比
      const total = organization.quota + organization.used_quota;
      if (total === 0) return 0;
      return Math.round((organization.quota / total) * 100);
    } else {
      // 后付费：已用额度占总可用额度的百分比
      // 总可用额度 = quota(基础额度) + overdraft_limit(透支上限)
      const totalAvailable = organization.quota + organization.overdraft_limit;
      if (totalAvailable === 0) return 0;
      return Math.round((organization.used_quota / totalAvailable) * 100);
    }
  };

  const getQuotaStatus = () => {
    const percent = getQuotaPercent();

    if (organization.billing_type === 'prepaid') {
      // 预付费：剩余额度越多越好（绿色）
      if (percent > 30) return 'success';
      if (percent > 10) return 'warning';
      return 'danger';
    } else {
      // 后付费：已用额度越少越好（绿色）
      if (percent < 70) return 'success';
      if (percent < 90) return 'warning';
      return 'danger';
    }
  };

  const renderSkeleton = () => (
    <>
      <div className='mb-4 sm:mb-6'>
        <Skeleton.Title active style={{ width: 160, height: 28, marginBottom: 8 }} />
        <Skeleton.Paragraph active rows={1} style={{ width: '80%', maxWidth: 320 }} />
      </div>
      <div className='mb-4 sm:mb-6'>
        <Card bordered headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}>
          <Skeleton loading active placeholder={
            <div className='space-y-4 p-1'>
              <div className='flex gap-4'>
                <Skeleton.Title active style={{ width: 100, height: 20 }} />
                <Skeleton.Title active style={{ width: 140, height: 20 }} />
              </div>
              <div className='flex gap-4'>
                <Skeleton.Title active style={{ width: 100, height: 20 }} />
                <Skeleton.Title active style={{ width: 120, height: 20 }} />
              </div>
              <div className='flex gap-2'>
                <Skeleton.Title active style={{ width: 60, height: 24 }} />
                <Skeleton.Title active style={{ width: 60, height: 24 }} />
                <Skeleton.Title active style={{ width: 60, height: 24 }} />
              </div>
            </div>
          } />
        </Card>
      </div>
      <div className='mb-4 sm:mb-6'>
        <Card bordered headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}>
          <Skeleton loading active placeholder={
            <div className='space-y-4 p-1'>
              <div className='flex justify-between items-center'>
                <Skeleton.Title active style={{ width: 80, height: 16 }} />
                <Skeleton.Title active style={{ width: 120, height: 18 }} />
              </div>
              <Skeleton.Paragraph active rows={0} style={{ height: 12 }} />
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton.Title key={i} active style={{ width: '100%', height: 48 }} />
                ))}
              </div>
            </div>
          } />
        </Card>
      </div>
    </>
  );

  return (
    <div className='mt-[60px]'>
      <div className='flex justify-center'>
        <div className='w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6'>
          {showSkeleton ? (
            renderSkeleton()
          ) : (
          <>
            {/* 页面标题 */}
            <div className='mb-3 sm:mb-4 md:mb-6'>
              <h3 className='text-lg sm:text-xl font-semibold text-[var(--semi-color-text-0)] mb-1 sm:mb-2'>{t('计费管理')}</h3>
              <p className='text-sm text-[var(--semi-color-text-2)]'>
                {isAdmin
                  ? t('查看组织计费信息和用户使用详情')
                  : t('查看您的个人额度使用情况')
                }
              </p>
            </div>

            {/* 管理员视图：显示完整的组织计费信息 */}
            {isAdmin && organization && (
              <>
                {/* 组织信息卡片 */}
                <div className='mb-3 sm:mb-4 md:mb-6'>
                  <Card
                    title={<span className='text-sm font-medium text-[var(--semi-color-text-0)]'>{t('组织信息')}</span>}
                    bordered
                    headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
                    bodyStyle={{ padding: isMobile ? '12px 16px' : '16px 20px' }}
                  >
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5'>
                      <div className='flex flex-col gap-1'>
                        <span className='text-sm text-[var(--semi-color-text-2)]'>{t('组织名称')}</span>
                        <span className='text-base sm:text-lg font-medium text-[var(--semi-color-text-0)] truncate' title={organization.name}>{organization.name}</span>
                      </div>
                      <div className='flex flex-col gap-1'>
                        <span className='text-sm text-[var(--semi-color-text-2)]'>{t('组织代码')}</span>
                        <div className='flex items-center gap-1'>
                          <span className='text-base sm:text-lg font-mono font-medium text-[var(--semi-color-text-0)]'>{organization.code}</span>
                          <Button
                            theme='borderless'
                            size='small'
                            type='tertiary'
                            icon={<IconCopy />}
                            onClick={async () => {
                              if (await copy(organization.code)) {
                                showSuccess(t('已复制到剪贴板！'));
                              }
                            }}
                            aria-label={t('复制')}
                          />
                        </div>
                      </div>
                      <div className='flex flex-col gap-1'>
                        <span className='text-sm text-[var(--semi-color-text-2)]'>{t('计费')}</span>
                        <div className='flex flex-wrap gap-2'>
                          {organization.billing_type === 'prepaid' ? (
                            <Tag color='blue' size='small'>{t('预付费')}</Tag>
                          ) : (
                            <Tag color='orange' size='small'>{t('后付费')}</Tag>
                          )}
                          <Tag color='cyan' size='small'>
                            {({ monthly: t('月付'), quarterly: t('季付'), yearly: t('年付') })[organization.billing_cycle] || organization.billing_cycle}
                          </Tag>
                        </div>
                      </div>
                      <div className='flex flex-col gap-1'>
                        <span className='text-sm text-[var(--semi-color-text-2)]'>{t('状态')}</span>
                        <div className='flex flex-wrap gap-2'>
                          {organization.status === 'enabled' ? (
                            <Tag color='green' size='small'>{t('启用')}</Tag>
                          ) : (
                            <Tag color='red' size='small'>{t('禁用')}</Tag>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* 额度信息卡片 */}
                <div className='mb-3 sm:mb-4 md:mb-6'>
                  <Card
                    title={<span className='text-sm font-medium text-[var(--semi-color-text-0)]'>{t('额度信息')}</span>}
                    bordered
                    headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
                    bodyStyle={{ padding: isMobile ? '12px 16px' : '16px 20px' }}
                  >
                    <div className='space-y-4'>
                      <div className='rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-4 sm:px-5 sm:py-4'>
                        <div className='flex justify-between items-center gap-2 mb-3'>
                          <span className='text-sm text-[var(--semi-color-text-2)]'>
                            {organization.billing_type === 'prepaid' ? t('剩余额度') : t('已用额度')}
                          </span>
                          <span className='text-sm sm:text-base font-semibold tabular-nums text-[var(--semi-color-text-0)]'>
                            {organization.billing_type === 'prepaid' ? (
                              <>{renderQuota(organization.quota)} / {renderQuota(organization.quota + organization.used_quota)}</>
                            ) : (
                              <>{renderQuota(organization.used_quota)} / {renderQuota(organization.quota + organization.overdraft_limit)}</>
                            )}
                          </span>
                        </div>
                        <Progress percent={getQuotaPercent()} stroke={getQuotaStatus()} showInfo />
                      </div>
                      <div className='grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3'>
                        {(organization.billing_type === 'prepaid'
                          ? [
                              { label: t('已用额度'), value: renderQuota(organization.used_quota) },
                              { label: t('剩余额度'), value: renderQuota(organization.quota) },
                              { label: t('总额度'), value: renderQuota(organization.quota + organization.used_quota) },
                              {
                                label: t('子账号上限'),
                                value: organization.max_sub_accounts === -1 ? <Tag color='green' size='small'>{t('无限制')}</Tag> : organization.max_sub_accounts,
                              },
                              {
                                label: t('单用户密钥上限'),
                                value: organization.max_keys_per_sub_account === -1 ? <Tag color='green' size='small'>{t('无限制')}</Tag> : organization.max_keys_per_sub_account,
                              },
                              {
                                label: t('组织密钥上限'),
                                value: organization.max_keys_per_org === -1 ? <Tag color='green' size='small'>{t('无限制')}</Tag> : organization.max_keys_per_org,
                              },
                            ]
                          : [
                              { label: t('已用额度'), value: renderQuota(organization.used_quota) },
                              {
                                label: t('可用额度'),
                                value: renderQuota(Math.max(0, organization.quota + organization.overdraft_limit - organization.used_quota)),
                              },
                              { label: t('基础额度'), value: renderQuota(organization.quota) },
                              { label: t('透支上限'), value: renderQuota(organization.overdraft_limit) },
                              { label: t('总额度'), value: renderQuota(organization.quota + organization.overdraft_limit) },
                              {
                                label: t('子账号上限'),
                                value: organization.max_sub_accounts === -1 ? <Tag color='green' size='small'>{t('无限制')}</Tag> : organization.max_sub_accounts,
                              },
                              {
                                label: t('单用户密钥上限'),
                                value: organization.max_keys_per_sub_account === -1 ? <Tag color='green' size='small'>{t('无限制')}</Tag> : organization.max_keys_per_sub_account,
                              },
                              {
                                label: t('组织密钥上限'),
                                value: organization.max_keys_per_org === -1 ? <Tag color='green' size='small'>{t('无限制')}</Tag> : organization.max_keys_per_org,
                              },
                            ]
                        ).map(({ label, value }, idx) => (
                          <div key={idx} className='flex flex-col gap-0.5 rounded-md px-2.5 py-2 bg-[var(--semi-color-fill-0)]'>
                            <span className='text-xs text-[var(--semi-color-text-2)] truncate'>{label}</span>
                            <span className='text-sm font-medium text-[var(--semi-color-text-0)] truncate'>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* 用户使用详情 */}
                <div className='mb-3 sm:mb-4 md:mb-6'>
                  {/* 标题栏 */}
                  <div className='flex items-center justify-between gap-2 mb-3 sm:mb-4'>
                    <h4 className='text-sm sm:text-base font-semibold text-[var(--semi-color-text-0)]'>{t('用户使用详情')}</h4>
                    <Button
                      icon={<IconUserGroup />}
                      onClick={() => navigate('/console/user')}
                      size='small'
                      className='text-xs sm:text-sm'
                    >
                      <span className='hidden sm:inline'>{t('用户管理')}</span>
                      <span className='sm:hidden'>{t('管理')}</span>
                    </Button>
                  </div>

                  {isMobile ? (
                    // 移动端：与用户管理 CardTable 一致的卡片样式
                    <div className='flex flex-col gap-2'>
                      {users.length === 0 ? (
                        <Card bordered className='!rounded-2xl shadow-sm'>
                          <Empty
                            image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
                            darkModeImage={
                              <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
                            }
                            description={t('暂无用户数据')}
                            style={{ padding: 30 }}
                          />
                        </Card>
                      ) : (
                        users.map((user) => {
                          const roleMap = {
                            1: { text: t('普通用户'), color: 'blue' },
                            10: { text: t('管理员'), color: 'orange' },
                            100: { text: t('超级管理员'), color: 'red' },
                          };
                          const roleInfo = roleMap[user.role] || { text: t('未知'), color: 'grey' };

                          return (
                            <Card
                              key={user.id}
                              className='!rounded-2xl shadow-sm'
                            >
                              {/* 与 CardTable 一致：key-value 行，border-dashed */}
                              <div
                                className='flex justify-between items-start py-1 border-b last:border-b-0 border-dashed'
                                style={{ borderColor: 'var(--semi-color-border)' }}
                              >
                                <span className='text-sm font-medium text-[var(--semi-color-text-2)] mr-2 whitespace-nowrap select-none'>
                                  {t('用户名')}
                                </span>
                                <div className='flex-1 break-all flex justify-end items-center gap-1'>
                                  {user.display_name ? `${user.username} (${user.display_name})` : user.username}
                                </div>
                              </div>
                              <div
                                className='flex justify-between items-start py-1 border-b last:border-b-0 border-dashed'
                                style={{ borderColor: 'var(--semi-color-border)' }}
                              >
                                <span className='text-sm font-medium text-[var(--semi-color-text-2)] mr-2 whitespace-nowrap select-none'>
                                  {t('角色')}
                                </span>
                                <div className='flex-1 break-all flex justify-end items-center gap-1'>
                                  <Tag color={roleInfo.color} size='small'>{roleInfo.text}</Tag>
                                </div>
                              </div>
                              <div
                                className='flex justify-between items-start py-1 border-b last:border-b-0 border-dashed'
                                style={{ borderColor: 'var(--semi-color-border)' }}
                              >
                                <span className='text-sm font-medium text-[var(--semi-color-text-2)] mr-2 whitespace-nowrap select-none'>
                                  {t('已用额度')}
                                </span>
                                <div className='flex-1 break-all flex justify-end items-center gap-1'>
                                  {renderQuota(user.used_quota)}
                                </div>
                              </div>
                              <div
                                className='flex justify-between items-start py-1 border-b last:border-b-0 border-dashed'
                                style={{ borderColor: 'var(--semi-color-border)' }}
                              >
                                <span className='text-sm font-medium text-[var(--semi-color-text-2)] mr-2 whitespace-nowrap select-none'>
                                  {t('剩余额度')}
                                </span>
                                <div className='flex-1 break-all flex justify-end items-center gap-1'>
                                  {renderQuota(user.quota)}
                                </div>
                              </div>
                              <div
                                className='flex justify-between items-start py-1 border-b last:border-b-0 border-dashed'
                                style={{ borderColor: 'var(--semi-color-border)' }}
                              >
                                <span className='text-sm font-medium text-[var(--semi-color-text-2)] mr-2 whitespace-nowrap select-none'>
                                  {t('状态')}
                                </span>
                                <div className='flex-1 break-all flex justify-end items-center gap-1'>
                                  {user.status === 1 ? (
                                    <Tag color='green' size='small'>{t('启用')}</Tag>
                                  ) : (
                                    <Tag color='red' size='small'>{t('禁用')}</Tag>
                                  )}
                                </div>
                              </div>
                              <div
                                className='flex justify-between items-start py-1 border-b last:border-b-0 border-dashed'
                                style={{ borderColor: 'var(--semi-color-border)' }}
                              >
                                <span className='text-sm font-medium text-[var(--semi-color-text-2)] mr-2 whitespace-nowrap select-none'>
                                  ID
                                </span>
                                <div className='flex-1 break-all flex justify-end items-center gap-1'>
                                  {user.id}
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    // 桌面端：使用表格布局
                    <Card
                      bordered
                      headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
                    >
                      <Table
                        columns={columns}
                        dataSource={users}
                        pagination={false}
                        rowKey='id'
                        empty={
                          <Empty
                            image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
                            darkModeImage={
                              <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
                            }
                            description={t('暂无用户数据')}
                            style={{ padding: 30 }}
                          />
                        }
                      />
                    </Card>
                  )}
                </div>
            </>
          )}

          {/* 普通用户视图：只显示个人额度信息 */}
          {!isAdmin && currentUser && (
            <div className='mb-3 sm:mb-4 md:mb-6'>
              <Card
                title={<span className='text-sm font-medium text-[var(--semi-color-text-0)]'>{t('个人额度信息')}</span>}
                bordered
                headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
              >
              <div className='space-y-4'>
                {/* 额度进度条 */}
                <div>
                  <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 mb-2'>
                    <span className='text-sm text-[var(--semi-color-text-2)]'>{t('剩余额度')}</span>
                    <span className='text-sm font-medium text-[var(--semi-color-text-0)]'>
                      {renderQuota(currentUser.quota)} /{' '}
                      {renderQuota(currentUser.quota + currentUser.used_quota)}
                    </span>
                  </div>
                  <Progress
                    percent={(() => {
                      const total = currentUser.quota + currentUser.used_quota;
                      if (total === 0) return 0;
                      return Math.round((currentUser.quota / total) * 100);
                    })()}
                    stroke={(() => {
                      const total = currentUser.quota + currentUser.used_quota;
                      if (total === 0) return 'success';
                      const percent = (currentUser.quota / total) * 100;
                      if (percent > 30) return 'success';
                      if (percent > 10) return 'warning';
                      return 'danger';
                    })()}
                    showInfo
                  />
                </div>

                {/* 详细信息 */}
                <Descriptions
                  row
                  size={isMobile ? 'small' : 'medium'}
                  className='[&_.semi-descriptions-key]:text-sm [&_.semi-descriptions-key]:text-[var(--semi-color-text-2)] [&_.semi-descriptions-value]:text-sm [&_.semi-descriptions-value]:text-[var(--semi-color-text-0)]'
                  data={[
                    {
                      key: t('用户名'),
                      value: currentUser.username,
                    },
                    {
                      key: t('显示名称'),
                      value: currentUser.display_name || '-',
                    },
                    {
                      key: t('已用额度'),
                      value: renderQuota(currentUser.used_quota),
                    },
                    {
                      key: t('剩余额度'),
                      value: renderQuota(currentUser.quota),
                    },
                    {
                      key: t('总额度'),
                      value: renderQuota(currentUser.quota + currentUser.used_quota),
                    },
                    {
                      key: t('账户状态'),
                      value:
                        currentUser.status === 1 ? (
                          <Tag color='green' size={isMobile ? 'small' : 'default'}>{t('启用')}</Tag>
                        ) : (
                          <Tag color='red' size={isMobile ? 'small' : 'default'}>{t('禁用')}</Tag>
                        ),
                    },
                  ]}
                />
              </div>
            </Card>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;
