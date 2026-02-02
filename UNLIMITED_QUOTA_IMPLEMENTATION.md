# 无限用户额度功能实施总结

## 功能概述

为用户添加无限额度功能,参考 Token 的 `unlimited_quota` 字段实现。

### 核心特性

1. **用户级别无限额度**: 用户可以设置为无限额度,不扣除用户的 `Quota` 字段
2. **组织额度仍然消耗**: 即使用户无限,组织额度仍然正常扣除(用于组织级别的计费追踪)
3. **Token 继承**: 无限用户创建的 Token 默认也是无限(可手动修改为有限)
4. **组织用户默认无限**: 创建组织用户(`OrgId > 0`)时,默认设置为无限额度
5. **UsedQuota 仍然累加**: 无限用户的 `UsedQuota` 字段仍然累加,用于统计

## 修改文件清单

### 后端 (Go)

#### 1. `model/user.go`
- **第 41 行**: 添加 `UnlimitedQuota bool` 字段到 User 结构体
- **第 56-68 行**: 更新 `ToBaseUser()` 方法,包含 `UnlimitedQuota` 字段
- **第 536-563 行**: 修改 `createDefaultTokenForUser()` 函数,接受 `userUnlimitedQuota` 参数
- **第 579-598 行**: 修改 `Insert()` 函数,组织用户默认设置为无限额度
- **第 634 行**: 调用 `createDefaultTokenForUser()` 时传递用户的无限状态
- **第 696-706 行**: 更新 `Edit()` 方法的 updates map,包含 `unlimited_quota` 字段

#### 2. `model/user_cache.go`
- **第 17-27 行**: 添加 `UnlimitedQuota bool` 字段到 UserBase 结构体
- **第 104-113 行**: 更新 `GetUserCache()` 函数,包含 `UnlimitedQuota` 字段

#### 3. `service/quota.go`
- **第 480-515 行**: 修改 `PreConsumeTokenQuota()` 函数
  - 获取用户信息
  - 如果用户是无限额度,直接通过检查
- **第 517-558 行**: 修改 `PostConsumeQuota()` 函数
  - 获取用户信息
  - 只有非无限用户才扣除用户和 Token 额度
  - 组织额度仍然扣除(即使用户无限)

#### 4. `controller/user.go`
- **第 2960-2968 行**: 修改 `CreateUser()` 函数,添加 `UnlimitedQuota` 字段到 cleanUser

### 前端 (React/JSX)

#### 5. `web/src/components/table/users/modals/EditUserModal.jsx`
- **第 69-84 行**: 添加 `unlimited_quota: false` 到初始值
- **第 357-391 行**: 添加额度类型下拉选择和条件显示的额度输入框
  - 下拉选择:"有限额度" / "无限额度"
  - 只有选择"有限额度"时才显示额度输入框和添加额度按钮

#### 6. `web/src/components/table/users/UsersColumnDefs.jsx`
- **第 138-172 行**: 修改 `renderQuotaUsage()` 函数
  - 检查 `record.unlimited_quota`
  - 如果是无限额度,显示绿色"无限额度"标签
  - 如果是有限额度,显示原有的额度进度条

### 数据库迁移

#### 7. `bin/add_unlimited_quota_to_users.sql`
```sql
-- 添加字段
ALTER TABLE users ADD COLUMN unlimited_quota BOOLEAN DEFAULT FALSE;

-- 将现有的组织用户设置为无限额度
UPDATE users SET unlimited_quota = TRUE WHERE org_id > 0;
```

## 使用说明

### 1. 应用数据库迁移

```bash
# 方法 1: 直接执行 SQL 文件
mysql -u your_user -p your_database < bin/add_unlimited_quota_to_users.sql

# 方法 2: 手动执行 SQL
# 登录数据库后执行:
ALTER TABLE users ADD COLUMN unlimited_quota BOOLEAN DEFAULT FALSE;
UPDATE users SET unlimited_quota = TRUE WHERE org_id > 0;
```

### 2. 重新编译后端

```bash
go build -o new-api
```

### 3. 重新构建前端

```bash
cd web
pnpm install
pnpm run build
cd ..
```

### 4. 重启服务

```bash
./new-api
```

## 测试检查清单

- [ ] 无限用户调用 API,用户额度不减少
- [ ] 无限用户调用 API,`UsedQuota` 正常累加
- [ ] 无限用户调用 API,组织额度正常扣除
- [ ] 无限用户创建 token,默认勾选无限
- [ ] 无限用户的有限 token,额度正常扣除
- [ ] 组织用户创建时,默认勾选无限
- [ ] 非组织用户创建时,默认不勾选无限
- [ ] 用户从有限切换到无限,计费逻辑正确
- [ ] 用户从无限切换到有限,计费逻辑正确
- [ ] 用户列表正确显示"无限额度"标签

## 技术细节

### 计费逻辑流程

1. **PreConsumeTokenQuota** (预扣除)
   - 检查用户是否无限 → 是 → 直接通过
   - 检查 Token 是否无限 → 是 → 直接通过
   - 检查 Token 额度是否足够 → 扣除 Token 额度

2. **PostConsumeQuota** (最终扣除)
   - 检查用户是否无限
     - 否 → 扣除用户额度和 Token 额度
     - 是 → 跳过用户和 Token 额度扣除
   - 累加用户 `UsedQuota` (无论是否无限)
   - 如果用户属于组织 → 扣除组织额度 (无论用户是否无限)

### 数据库字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `unlimited_quota` | BOOLEAN | FALSE | 用户是否拥有无限额度 |

### 前端交互

- **额度类型下拉**: 选择"有限额度"或"无限额度"
- **条件显示**: 只有选择"有限额度"时才显示额度输入框
- **列表显示**: 无限用户显示绿色"无限额度"标签,有限用户显示额度进度条

## 注意事项

1. **组织计费**: 即使用户设置为无限额度,组织的额度仍然会被消耗,这是为了保留组织级别的计费追踪
2. **UsedQuota 统计**: 无限用户的 `UsedQuota` 字段仍然会累加,用于统计使用情况
3. **Token 继承**: 无限用户创建的 Token 默认也是无限,但可以手动修改为有限额度
4. **迁移脚本**: 执行迁移脚本后,所有现有的组织用户会自动设置为无限额度

## 版本信息

- 实施日期: 2026-02-02
- 分支: feature/unlimited-user-quota
- 基于版本: 2b-beta
