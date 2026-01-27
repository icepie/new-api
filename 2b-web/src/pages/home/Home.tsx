import { Empty } from 'antd';

const Home = () => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
    }}>
      <Empty description="欢迎使用 API Gateway" />
    </div>
  );
};

export default Home;
