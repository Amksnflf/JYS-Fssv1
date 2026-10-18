import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1A1A1A',
          colorInfo: '#1A1A1A',
          colorSuccess: '#10A37F',
          colorError: '#E94B5C',
          colorWarning: '#B7791F',
          colorBgBase: '#F5F6F8',
          colorBgContainer: '#FFFFFF',
          colorBgLayout: '#F5F6F8',
          colorBorder: '#E6E8EC',
          colorText: '#171717',
          colorTextSecondary: '#667085',
          borderRadius: 10,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
          boxShadowSecondary: '0 6px 18px rgba(15, 23, 42, 0.06)',
          controlHeight: 36,
          fontFamily: '"PingFang SC","Source Han Sans SC",Inter,system-ui,sans-serif',
        },
        components: {
          Button: {
            borderRadius: 10,
            controlHeight: 36,
            primaryShadow: 'none',
          },
          Card: {
            borderRadiusLG: 16,
            boxShadowTertiary: '0 10px 28px rgba(15, 23, 42, 0.06)',
            headerFontSize: 16,
          },
          Input: {
            borderRadius: 10,
          },
          InputNumber: {
            borderRadius: 10,
          },
          Select: {
            borderRadius: 10,
          },
          Modal: {
            borderRadiusLG: 18,
            titleFontSize: 17,
          },
          Table: {
            borderColor: '#EEF0F3',
            cellPaddingBlock: 13,
            cellPaddingInline: 16,
            headerBg: '#F8FAFC',
            headerColor: '#475467',
            rowHoverBg: '#FAFBFC',
          },
          Menu: {
            itemBorderRadius: 10,
            itemHeight: 42,
            itemMarginBlock: 4,
            itemSelectedBg: '#F0F2F5',
            itemSelectedColor: '#111827',
          },
          Tabs: {
            itemSelectedColor: '#111827',
            inkBarColor: '#111827',
          },
          Layout: {
            headerHeight: 64,
            headerPadding: '0 24px',
          },
        },
      }}
    >
      <AntdApp>
        <BrowserRouter basename={import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
);
