import { useTranslation } from 'react-i18next';

export type AuthPageLanguage = 'zh-CN' | 'zh-TW' | 'en';

export interface AuthWalletCopy {
  walletInstallTip: string;
  walletPluginMissing: (walletName: string) => string;
  walletAddressMissing: (walletName: string) => string;
  tronPluginMissing: string;
  tronAddressMissing: string;
  phantomPluginMissing: string;
  phantomAddressMissing: string;
}

export function getAuthPageLanguage(language?: string): AuthPageLanguage {
  const normalized = (language ?? '').toLowerCase();
  if (normalized.startsWith('zh-cn')) return 'zh-CN';
  if (normalized.startsWith('zh')) return 'zh-TW';
  return 'en';
}

export function useAuthPageTranslation() {
  const { t, i18n } = useTranslation();
  const authLanguage = getAuthPageLanguage(i18n.resolvedLanguage ?? i18n.language);
  return { t, authLanguage };
}

export function getAuthWalletCopy(language: AuthPageLanguage): AuthWalletCopy {
  if (language === 'zh-CN') {
    return {
      walletInstallTip: '已安装的钱包会显示为可直接连接，未安装的钱包点击后会跳转到官方下载安装页面。',
      walletPluginMissing: (walletName) => `未检测到 ${walletName} 钱包插件`,
      walletAddressMissing: (walletName) => `未获取到 ${walletName} 钱包地址`,
      tronPluginMissing: '未检测到 TronLink 钱包插件',
      tronAddressMissing: '未获取到 TronLink 钱包地址',
      phantomPluginMissing: '未检测到 Phantom 钱包插件',
      phantomAddressMissing: '未获取到 Phantom 钱包地址',
    };
  }

  if (language === 'zh-TW') {
    return {
      walletInstallTip: '已安裝的錢包會顯示為可直接連接，未安裝的錢包點擊後會跳轉到官方下載安裝頁面。',
      walletPluginMissing: (walletName) => `未檢測到 ${walletName} 錢包外掛`,
      walletAddressMissing: (walletName) => `未取得 ${walletName} 錢包地址`,
      tronPluginMissing: '未檢測到 TronLink 錢包外掛',
      tronAddressMissing: '未取得 TronLink 錢包地址',
      phantomPluginMissing: '未檢測到 Phantom 錢包外掛',
      phantomAddressMissing: '未取得 Phantom 錢包地址',
    };
  }

  return {
    walletInstallTip:
      'Installed wallets can connect directly. If a wallet is not installed, clicking it will open the official download page.',
    walletPluginMissing: (walletName) => `${walletName} wallet extension was not detected`,
    walletAddressMissing: (walletName) => `${walletName} wallet address was not found`,
    tronPluginMissing: 'TronLink wallet extension was not detected',
    tronAddressMissing: 'TronLink wallet address was not found',
    phantomPluginMissing: 'Phantom wallet extension was not detected',
    phantomAddressMissing: 'Phantom wallet address was not found',
  };
}
