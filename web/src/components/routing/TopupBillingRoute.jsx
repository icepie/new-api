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

import React, { useContext } from 'react';
import { UserContext } from '../../context/User';
import TopUp from '../../pages/TopUp';
import Billing from '../../pages/Billing';
import Loading from '../common/ui/Loading';

/**
 * 智能路由组件：根据用户的组织状态动态渲染钱包管理或计费管理页面
 * - 组织用户（org_id > 0）：显示计费管理（Billing）
 * - 非组织用户（org_id = 0）：显示钱包管理（TopUp）
 */
const TopupBillingRoute = () => {
  const [userState] = useContext(UserContext);

  // 如果用户数据还在加载中，显示加载状态
  if (!userState.user) {
    return <Loading />;
  }

  // 判断是否属于组织
  const isOrgUser = userState.user.org_id > 0;

  // 根据组织状态渲染对应组件
  return isOrgUser ? <Billing /> : <TopUp />;
};

export default TopupBillingRoute;
