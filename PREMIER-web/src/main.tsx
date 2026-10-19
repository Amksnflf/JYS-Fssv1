import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ToastContainer from './components/Toast';
import './i18n';
import './styles/index.css';
import './styles/pc.css';
import { initAntiScan } from './utils/antiScan';

if (import.meta.env.PROD) {
  initAntiScan();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer />
    </BrowserRouter>
  </React.StrictMode>
);
