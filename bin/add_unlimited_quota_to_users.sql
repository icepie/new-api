-- 添加 unlimited_quota 字段到 users 表
-- 用于标识用户是否拥有无限额度

-- 添加字段
ALTER TABLE users ADD COLUMN unlimited_quota BOOLEAN DEFAULT FALSE;

-- 将现有的组织用户设置为无限额度
UPDATE users SET unlimited_quota = TRUE WHERE org_id > 0;
