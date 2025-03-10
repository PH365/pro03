import React from 'react';
import { Layout, Menu, theme } from 'antd';
import { StockOutlined } from '@ant-design/icons';
import './App.css';
import StockTracker from './components/StockTracker';

const { Header, Content } = Layout;

const App: React.FC = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <Layout className="layout">
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div className="logo" />
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['1']}
          items={[{ key: '1', icon: <StockOutlined />, label: '股票追踪' }]}
        />
      </Header>
      <Content style={{ padding: '0 50px', marginTop: 20 }}>
        <div
          style={{
            background: colorBgContainer,
            minHeight: 'calc(100vh - 134px)',
            padding: 24,
            borderRadius: 8,
          }}
        >
          <StockTracker />
        </div>
      </Content>
    </Layout>
  );
};

export default App;
