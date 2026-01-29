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
import { Card, Table, Tag, Spin, Descriptions, Progress } from '@douyinfe/semi-ui';
import { API, showError, renderQuota } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import CardPro from '../../components/common/ui/CardPro';
import { useTranslation } from 'react-i18next';
import { Empty } from '@douyinfe/semi-ui';
import { IllustrationNoResult, IllustrationNoResultDark } from '@douyinfe/semi-illustrations';

const Billing = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
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
      title: t('已用额度'),
      dataIndex: 'used_quota',
      width: 150,
      render: (value) => renderQuota(value),
    },
    {
      title: t('剩余额度'),
      dataIndex: 'quota',
      width: 150,
      render: (value) => renderQuota(value),
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

  return (
    <div className='mt-[60px] px-2'>
      <Spin spinning={loading}>
        <CardPro
          type='type1'
          descriptionArea={
            <div>
              <h3 className='text-lg font-semibold'>{t('计费管理')}</h3>
              <p className='text-sm text-gray-500'>
                {isAdmin
                  ? t('查看组织计费信息和用户使用详情')
                  : t('查看您的个人额度使用情况')
                }
              </p>
            </div>
          }
        >
          {/* 管理员视图：显示完整的组织计费信息 */}
          {isAdmin && organization && (
            <>
              {/* 组织信息卡片 */}
              <Card
                title={t('组织信息')}
                className='mb-4'
                bordered
                headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
              >
                <Descriptions
                  row
                  size='medium'
                  data={[
                    { key: t('组织名称'), value: organization.name },
                    { key: t('组织代码'), value: organization.code },
                    {
                      key: t('计费方式'),
                      value:
                        organization.billing_type === 'prepaid' ? (
                          <Tag color='blue'>{t('预付费')}</Tag>
                        ) : (
                          <Tag color='orange'>{t('后付费')}</Tag>
                        ),
                    },
                    {
                      key: t('计费周期'),
                      value: (() => {
                        const cycleMap = {
                          monthly: t('月付'),
                          quarterly: t('季付'),
                          yearly: t('年付'),
                        };
                        return (
                          <Tag color='cyan'>
                            {cycleMap[organization.billing_cycle] ||
                              organization.billing_cycle}
                          </Tag>
                        );
                      })(),
                    },
                    {
                      key: t('状态'),
                      value:
                        organization.status === 'enabled' ? (
                          <Tag color='green'>{t('启用')}</Tag>
                        ) : (
                          <Tag color='red'>{t('禁用')}</Tag>
                        ),
                    },
                  ]}
                />
              </Card>

              {/* 额度信息卡片 */}
              <Card
                title={t('额度信息')}
                className='mb-4'
                bordered
                headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
              >
                <div className='space-y-4'>
                  <div>
                    {organization.billing_type === 'prepaid' ? (
                      // 预付费：显示剩余额度/总额度
                      <>
                        <div className='flex justify-between mb-2'>
                          <span className='text-sm font-medium'>{t('剩余额度')}</span>
                          <span className='text-sm font-medium'>
                            {renderQuota(organization.quota)} /{' '}
                            {renderQuota(organization.quota + organization.used_quota)}
                          </span>
                        </div>
                        <Progress
                          percent={getQuotaPercent()}
                          stroke={getQuotaStatus()}
                          showInfo
                        />
                      </>
                    ) : (
                      // 后付费：显示已用额度/(基础额度+透支上限)
                      <>
                        <div className='flex justify-between mb-2'>
                          <span className='text-sm font-medium'>{t('已用额度')}</span>
                          <span className='text-sm font-medium'>
                            {renderQuota(organization.used_quota)} /{' '}
                            {renderQuota(organization.quota + organization.overdraft_limit)}
                          </span>
                        </div>
                        <Progress
                          percent={getQuotaPercent()}
                          stroke={getQuotaStatus()}
                          showInfo
                        />
                      </>
                    )}
                  </div>

                  <Descriptions
                    row
                    size='medium'
                    data={
                      organization.billing_type === 'prepaid'
                        ? [
                            // 预付费模式显示的字段
                            {
                              key: t('已用额度'),
                              value: renderQuota(organization.used_quota),
                            },
                            {
                              key: t('剩余额度'),
                              value: renderQuota(organization.quota),
                            },
                            {
                              key: t('总额度'),
                              value: renderQuota(organization.quota + organization.used_quota),
                            },
                            {
                              key: t('子账号上限'),
                              value:
                                organization.max_sub_accounts === -1 ? (
                                  <Tag color='green'>{t('无限制')}</Tag>
                                ) : (
                                  organization.max_sub_accounts
                                ),
                            },
                            {
                              key: t('单用户密钥上限'),
                              value:
                                organization.max_keys_per_sub_account === -1 ? (
                                  <Tag color='green'>{t('无限制')}</Tag>
                                ) : (
                                  organization.max_keys_per_sub_account
                                ),
                            },
                            {
                              key: t('组织密钥上限'),
                              value:
                                organization.max_keys_per_org === -1 ? (
                                  <Tag color='green'>{t('无限制')}</Tag>
                                ) : (
                                  organization.max_keys_per_org
                                ),
                            },
                          ]
                        : [
                            // 后付费模式显示的字段
                            {
                              key: t('已用额度'),
                              value: renderQuota(organization.used_quota),
                            },
                            {
                              key: t('可用额度'),
                              value: renderQuota(
                                Math.max(0, organization.quota + organization.overdraft_limit - organization.used_quota)
                              ),
                            },
                            {
                              key: t('基础额度'),
                              value: renderQuota(organization.quota),
                            },
                            {
                              key: t('透支上限'),
                              value: renderQuota(organization.overdraft_limit),
                            },
                            {
                              key: t('总额度'),
                              value: renderQuota(organization.quota + organization.overdraft_limit),
                            },
                            {
                              key: t('子账号上限'),
                              value:
                                organization.max_sub_accounts === -1 ? (
                                  <Tag color='green'>{t('无限制')}</Tag>
                                ) : (
                                  organization.max_sub_accounts
                                ),
                            },
                            {
                              key: t('单用户密钥上限'),
                              value:
                                organization.max_keys_per_sub_account === -1 ? (
                                  <Tag color='green'>{t('无限制')}</Tag>
                                ) : (
                                  organization.max_keys_per_sub_account
                                ),
                            },
                            {
                              key: t('组织密钥上限'),
                              value:
                                organization.max_keys_per_org === -1 ? (
                                  <Tag color='green'>{t('无限制')}</Tag>
                                ) : (
                                  organization.max_keys_per_org
                                ),
                            },
                          ]
                    }
                  />
                </div>
              </Card>

              {/* 用户使用详情表格 */}
              <Card
                title={t('用户使用详情')}
                bordered
                headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
              >
                {isMobile ? (
                  // 移动端卡片布局
                  <div className='space-y-3'>
                    {users.length === 0 ? (
                      <Empty
                        image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
                        darkModeImage={
                          <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
                        }
                        description={t('暂无用户数据')}
                        style={{ padding: 30 }}
                      />
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
                            bordered
                            bodyStyle={{ padding: '12px' }}
                            className='shadow-sm'
                          >
                            <div className='space-y-2'>
                              {/* 用户名和角色 */}
                              <div className='flex justify-between items-center'>
                                <div>
                                  <div className='font-medium text-base'>{user.username}</div>
                                  {user.display_name && (
                                    <div className='text-sm text-gray-500'>{user.display_name}</div>
                                  )}
                                </div>
                                <Tag color={roleInfo.color}>{roleInfo.text}</Tag>
                              </div>

                              {/* 分隔线 */}
                              <div className='border-t border-gray-200 dark:border-gray-700'></div>

                              {/* 额度信息 */}
                              <div className='space-y-1'>
                                <div className='flex justify-between text-sm'>
                                  <span className='text-gray-600 dark:text-gray-400'>{t('已用额度')}</span>
                                  <span className='font-medium'>{renderQuota(user.used_quota)}</span>
                                </div>
                                <div className='flex justify-between text-sm'>
                                  <span className='text-gray-600 dark:text-gray-400'>{t('剩余额度')}</span>
                                  <span className='font-medium'>{renderQuota(user.quota)}</span>
                                </div>
                                <div className='flex justify-between text-sm'>
                                  <span className='text-gray-600 dark:text-gray-400'>{t('状态')}</span>
                                  <span>
                                    {user.status === 1 ? (
                                      <Tag color='green' size='small'>{t('启用')}</Tag>
                                    ) : (
                                      <Tag color='red' size='small'>{t('禁用')}</Tag>
                                    )}
                                  </span>
                                </div>
                                <div className='flex justify-between text-sm'>
                                  <span className='text-gray-600 dark:text-gray-400'>ID</span>
                                  <span className='text-gray-500'>{user.id}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                ) : (
                  // 桌面端表格布局
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
                )}
              </Card>
            </>
          )}

          {/* 普通用户视图：只显示个人额度信息 */}
          {!isAdmin && currentUser && (
            <Card
              title={t('个人额度信息')}
              bordered
              headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
            >
              <div className='space-y-4'>
                {/* 额度进度条 */}
                <div>
                  <div className='flex justify-between mb-2'>
                    <span className='text-sm font-medium'>{t('剩余额度')}</span>
                    <span className='text-sm font-medium'>
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
                  size='medium'
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
                          <Tag color='green'>{t('启用')}</Tag>
                        ) : (
                          <Tag color='red'>{t('禁用')}</Tag>
                        ),
                    },
                  ]}
                />
              </div>
            </Card>
          )}
        </CardPro>
      </Spin>
    </div>
  );
};

export default Billing;
