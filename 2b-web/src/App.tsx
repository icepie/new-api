import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import StarLogin from './pages/auth/StarLogin';
import StarRegister from './pages/auth/StarRegister';
import StarResetPassword from './pages/auth/StarResetPassword';
import TopNavLayout from './components/layout/TopNavLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Home from './pages/home/Home';
import PricingNew from './pages/pricing/PricingNew';
import Keys from './pages/keys/Keys';
import Profile from './pages/profile/Profile';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          {/* 所有路由都使用顶部导航 */}
          <Route path="/" element={<TopNavLayout />}>
            {/* 公开页面 */}
            <Route index element={<Home />} />
            <Route path="pricing" element={<PricingNew />} />

            {/* 登录相关页面 */}
            <Route path="login" element={<StarLogin />} />
            <Route path="register" element={<StarRegister />} />
            <Route path="reset-password" element={<StarResetPassword />} />

            {/* 受保护的页面 */}
            <Route
              path="keys"
              element={
                <ProtectedRoute>
                  <Keys />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404重定向 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
