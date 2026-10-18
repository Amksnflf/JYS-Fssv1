import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ToastContainer from './components/Toast';
import './i18n';
import './styles/index.css';
import './styles/pc.css';

// 移动端调试工具：仅开发环境加载，不进生产包
// if (import.meta.env.DEV) {
  // void import('eruda').then(({ default: eruda }) => eruda.init());
// }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer />
    </BrowserRouter>
  </React.StrictMode>
);
