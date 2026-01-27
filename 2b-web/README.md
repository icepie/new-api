# API Gateway 简化前端

这是一个简化版的 API Gateway 前端项目,专注于核心功能。

## 功能特性

### 1. 用户认证
- ✅ 普通登录(用户名/邮箱 + 密码)
- ✅ Star登录(兼容现有后端)
- ✅ 用户注册
- ✅ 忘记密码/重置密码

### 2. 三个核心页面
- **首页**: 简洁的欢迎页面
- **价格页面**: 展示模型价格对比(官方价格 vs 平台价格)
- **Key管理**:
  - 自助创建API Key
  - 查看Key列表
  - 查看使用明细(按模型类型、具体模型、时间范围统计)
  - 删除Key

## 技术栈

- **框架**: React 18 + Vite
- **UI组件**: Ant Design 5.x
- **路由**: React Router v6
- **HTTP客户端**: Axios
- **日期处理**: dayjs
- **包管理器**: pnpm

## 快速开始

### 1. 安装依赖

```bash
cd frontend
pnpm install
```

### 2. 配置后端地址

编辑 `vite.config.js` 中的代理配置:

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // 修改为你的后端地址
        changeOrigin: true,
      },
    },
  },
})
```

### 3. 启动开发服务器

```bash
pnpm run dev
```

访问 http://localhost:5173

### 4. 构建生产版本

```bash
pnpm run build
```

构建产物在 `dist/` 目录下。

## API 接口说明

### 认证相关

- `POST /api/user/login` - 普通登录
- `POST /api/star/login` - Star登录
- `POST /api/user/register` - 用户注册
- `POST /api/user/reset` - 发送重置密码邮件
- `POST /api/user/reset/confirm` - 确认重置密码

### Token管理

- `GET /api/token` - 获取Token列表
- `POST /api/token` - 创建Token
- `DELETE /api/token/:id` - 删除Token
- `GET /api/log/self/token/:key` - 获取Token使用明细
- `GET /api/log/self/token/:key/stat` - 获取Token统计信息

### 模型价格

- `GET /api/models` - 获取模型列表及价格

## 功能说明

### 价格页面

价格页面从后端API获取模型数据,展示:
- 模型名称
- 提供商
- 类型(chat/embedding/image/audio)
- 官方价格(输入/输出)
- 平台价格(输入/输出)

支持:
- 按类型筛选
- 搜索模型名称或提供商

### Key管理页面

**创建Key**:
- 点击"创建Key"按钮
- 输入Key名称
- 系统自动生成Key(免费,无限额度)

**查看使用明细**:
- 点击"查看明细"按钮
- 选择时间范围
- 按模型类型筛选
- 查看详细的使用记录和统计信息

**统计信息包括**:
- 总请求数
- 总Token数
- 总费用
- 平均费用

## 注意事项

1. **后端兼容性**: 本项目设计为与现有的 new-api 后端完全兼容
2. **认证方式**: 使用 Bearer Token 认证,Token存储在 localStorage
3. **Star登录**: 完全兼容现有的 Star 登录逻辑
4. **价格数据**: 价格页面需要后端提供 `/api/models` 接口,返回包含价格信息的模型列表

## License

AGPL-3.0
