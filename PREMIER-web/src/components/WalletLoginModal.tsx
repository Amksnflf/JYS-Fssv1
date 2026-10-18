import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { BottomSheet } from './AsterUI';
import { useResponsive } from '@/hooks/useResponsive';
import { getAuthWalletCopy, useAuthPageTranslation, type AuthWalletCopy } from '@/pages/auth/authI18n';
import { walletNonce, walletLogin } from '@/api/auth';
import { useUserStore } from '@/store/userStore';
import { useWalletModalStore } from '@/store/walletModalStore';
import { toast } from '@/components/Toast';
import coinbaseIcon from '@/assets/wallets/Coinbase.png';
import trustWalletIcon from '@/assets/wallets/TrustWallet.png';
import metaMaskIcon from '@/assets/wallets/MetaMask.png';
import onchainIcon from '@/assets/wallets/onchain.svg';
import imTokenIcon from '@/assets/wallets/imToken.png';
import tronLinkWalletIcon from '@/assets/wallets/TronLinkWallet.png';
import krakenIcon from '@/assets/wallets/Kraken.svg';
import tokenPocketIcon from '@/assets/wallets/TokenPocket.png';
import mewIcon from '@/assets/wallets/MEW.svg';
import phantomIcon from '@/assets/wallets/Phantom.png';

type WalletChain = 'ETH' | 'TRON' | 'SOL';
type WalletKind = 'evm' | 'tron' | 'sol';

type WalletOption = {
  key: string;
  name: string;
  chain: WalletChain;
  kind: WalletKind;
  icon: string;
  matchers: string[];
  downloadUrl: string;
};

type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<T>;
  providers?: EthereumProvider[];
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isTokenPocket?: boolean;
  isTokenPocketExtension?: boolean;
  isImToken?: boolean;
  isMEWwallet?: boolean;
  isKraken?: boolean;
  isKrakenWallet?: boolean;
  [key: `is${string}`]: unknown;
};

type TronWebLike = {
  defaultAddress?: {
    base58?: string;
  };
  trx?: {
    signMessageV2(message: string): Promise<string>;
  };
};

type TronProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<T>;
  tronWeb?: TronWebLike;
};

type SolanaPublicKeyLike = {
  toString(): string;
  toBase58?: () => string;
};

type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: SolanaPublicKeyLike | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey?: SolanaPublicKeyLike } | void>;
  signMessage(
    message: Uint8Array,
    display?: 'utf8' | 'hex'
  ): Promise<Uint8Array | { signature: Uint8Array }>;
};

type Eip6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

type Eip6963ProviderDetail = {
  info: Eip6963ProviderInfo;
  provider: EthereumProvider;
};

type EvmProviderEntry = {
  provider: EthereumProvider;
  info?: Eip6963ProviderInfo;
};

type WalletSession = {
  walletType: string;
  chain: WalletChain;
  address: string;
  signMessage(message: string): Promise<string>;
};

const WALLETS: WalletOption[] = [
  {
    key: 'coinbase',
    name: 'Coinbase Wallet',
    chain: 'ETH',
    kind: 'evm',
    icon: coinbaseIcon,
    matchers: ['coinbase'],
    downloadUrl: 'https://www.coinbase.com/wallet',
  },
  {
    key: 'trustwallet',
    name: 'Trust Wallet',
    chain: 'ETH',
    kind: 'evm',
    icon: trustWalletIcon,
    matchers: ['trust wallet', 'trustwallet'],
    downloadUrl: 'https://trustwallet.com/download',
  },
  {
    key: 'metamask',
    name: 'MetaMask',
    chain: 'ETH',
    kind: 'evm',
    icon: metaMaskIcon,
    matchers: ['metamask'],
    downloadUrl: 'https://metamask.io/download',
  },
  {
    key: 'onchain',
    name: 'Onchain',
    chain: 'ETH',
    kind: 'evm',
    icon: onchainIcon,
    matchers: ['onchain'],
    downloadUrl: 'https://crypto.com/onchain',
  },
  {
    key: 'imtoken',
    name: 'imToken',
    chain: 'ETH',
    kind: 'evm',
    icon: imTokenIcon,
    matchers: ['imtoken'],
    downloadUrl: 'https://token.im/download',
  },
  {
    key: 'tronlink',
    name: 'TronLink Wallet',
    chain: 'TRON',
    kind: 'tron',
    icon: tronLinkWalletIcon,
    matchers: ['tronlink'],
    downloadUrl: 'https://www.tronlink.org/',
  },
  {
    key: 'kraken',
    name: 'Kraken Wallet',
    chain: 'ETH',
    kind: 'evm',
    icon: krakenIcon,
    matchers: ['kraken'],
    downloadUrl: 'https://www.kraken.com/wallet',
  },
  {
    key: 'tokenpocket',
    name: 'TokenPocket',
    chain: 'ETH',
    kind: 'evm',
    icon: tokenPocketIcon,
    matchers: ['tokenpocket', 'token pocket'],
    downloadUrl: 'https://www.tokenpocket.pro/en/download/app',
  },
  {
    key: 'mew',
    name: 'MEW Wallet',
    chain: 'ETH',
    kind: 'evm',
    icon: mewIcon,
    matchers: ['mew', 'myetherwallet'],
    downloadUrl: 'https://www.myetherwallet.com/',
  },
  {
    key: 'phantom',
    name: 'Phantom',
    chain: 'SOL',
    kind: 'sol',
    icon: phantomIcon,
    matchers: ['phantom'],
    downloadUrl: 'https://phantom.com/download',
  },
];

const EIP6963_ANNOUNCE = 'eip6963:announceProvider';
const EIP6963_REQUEST = 'eip6963:requestProvider';
const TRON_TIP6963_REQUEST = 'TIP6963:requestProvider';

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    phantom?: {
      ethereum?: EthereumProvider;
      solana?: SolanaProvider;
    };
    solana?: SolanaProvider;
    tron?: TronProvider;
    tronWeb?: TronWebLike;
    tronLink?: {
      ready?: boolean;
      tronWeb?: TronWebLike;
      request?<T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<T>;
    };
  }
}

function isCustomEventWithProviderDetail(event: Event): event is CustomEvent<Eip6963ProviderDetail> {
  const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
  return !!detail?.provider;
}

function pushProviderEntry(list: EvmProviderEntry[], provider?: EthereumProvider, info?: Eip6963ProviderInfo) {
  if (!provider) return;
  if (list.some((entry) => entry.provider === provider)) return;
  list.push({ provider, info });
}

function lowerText(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function matchesWallet(entry: EvmProviderEntry, wallet: WalletOption) {
  const meta = lowerText([entry.info?.name, entry.info?.rdns]);
  const provider = entry.provider;
  if (wallet.key === 'metamask') return Boolean(provider.isMetaMask) || meta.includes('metamask');
  if (wallet.key === 'coinbase') return Boolean(provider.isCoinbaseWallet) || meta.includes('coinbase');
  if (wallet.key === 'trustwallet') {
    return Boolean(provider.isTrustWallet || provider.isTrust) || meta.includes('trust wallet') || meta.includes('trustwallet');
  }
  if (wallet.key === 'imtoken') return Boolean(provider.isImToken) || meta.includes('imtoken');
  if (wallet.key === 'tokenpocket') {
    return Boolean(provider.isTokenPocket || provider.isTokenPocketExtension) || meta.includes('tokenpocket') || meta.includes('token pocket');
  }
  if (wallet.key === 'mew') return Boolean(provider.isMEWwallet) || meta.includes('mew') || meta.includes('myetherwallet');
  if (wallet.key === 'kraken') return Boolean(provider.isKraken || provider.isKrakenWallet) || meta.includes('kraken');
  return wallet.matchers.some((matcher) => meta.includes(matcher));
}

function getEvmProviderEntries(discoveredProviders: Eip6963ProviderDetail[]) {
  const entries: EvmProviderEntry[] = [];
  discoveredProviders.forEach((detail) => pushProviderEntry(entries, detail.provider, detail.info));

  const legacyProviders = window.ethereum?.providers?.length
    ? window.ethereum.providers
    : window.ethereum
      ? [window.ethereum]
      : [];
  legacyProviders.forEach((provider) => pushProviderEntry(entries, provider));

  if (window.phantom?.ethereum) pushProviderEntry(entries, window.phantom.ethereum);
  return entries;
}

function findMatchedEvmProvider(wallet: WalletOption, discoveredProviders: Eip6963ProviderDetail[]) {
  return getEvmProviderEntries(discoveredProviders).find((entry) => matchesWallet(entry, wallet)) ?? null;
}

function bytesToHex(bytes: Uint8Array) {
  return `0x${Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

function getSolanaAddress(publicKey?: SolanaPublicKeyLike | null) {
  if (!publicKey) return '';
  return typeof publicKey.toBase58 === 'function' ? publicKey.toBase58() : publicKey.toString();
}

async function connectEvmWallet(
  wallet: WalletOption,
  discoveredProviders: Eip6963ProviderDetail[],
  copy: AuthWalletCopy,
): Promise<WalletSession> {
  const matched = findMatchedEvmProvider(wallet, discoveredProviders);
  const provider = matched?.provider;
  if (!provider) throw new Error(copy.walletPluginMissing(wallet.name));

  const accounts = await provider.request<string[]>({ method: 'eth_requestAccounts' });
  const address = accounts?.[0];
  if (!address) throw new Error(copy.walletAddressMissing(wallet.name));

  const walletType = matched?.info?.name?.trim() || wallet.name;
  // 提交给后端的地址统一小写，避免真机返回 EIP-55 checksum 地址时后端严格比对失败。
  // 传给钱包 personal_sign 的地址仍用原始返回值（部分钱包会校验地址与当前账户一致）。
  const submitAddress = address.toLowerCase();

  return {
    walletType,
    chain: wallet.chain,
    address: submitAddress,
    signMessage: (message: string) =>
      provider.request<string>({
        // Onchain（Crypto.com）App 内置浏览器要求 message 为 0x 十六进制，
        // 明文字符串会签名失败；hex 编码对 MetaMask / 插件端无副作用（签名字节一致）。
        method: 'personal_sign',
        params: [bytesToHex(new TextEncoder().encode(message)), address],
      }),
  };
}

function hasTronProvider() {
  const tronWeb = window.tron?.tronWeb ?? window.tronLink?.tronWeb ?? window.tronWeb;
  const request =
    window.tron?.request?.bind(window.tron) ??
    window.tronLink?.request?.bind(window.tronLink);
  return Boolean(tronWeb?.trx?.signMessageV2 && request);
}

async function connectTronWallet(copy: AuthWalletCopy): Promise<WalletSession> {
  const tronWeb = window.tron?.tronWeb ?? window.tronLink?.tronWeb ?? window.tronWeb;
  const request =
    window.tron?.request?.bind(window.tron) ??
    window.tronLink?.request?.bind(window.tronLink);
  const provider = tronWeb && request ? { tronWeb, request } : null;
  if (!provider?.tronWeb?.trx?.signMessageV2 || !provider.request) {
    throw new Error(copy.tronPluginMissing);
  }

  await provider.request({ method: 'tron_requestAccounts' });
  const address = provider.tronWeb.defaultAddress?.base58;
  if (!address) throw new Error(copy.tronAddressMissing);

  return {
    walletType: 'TronLink Wallet',
    chain: 'TRON',
    address,
    signMessage: async (message: string) => provider.tronWeb!.trx!.signMessageV2(message),
  };
}

function hasPhantomProvider() {
  const provider = window.phantom?.solana ?? window.solana;
  return Boolean(provider?.isPhantom);
}

async function connectPhantomWallet(copy: AuthWalletCopy): Promise<WalletSession> {
  const provider = window.phantom?.solana ?? window.solana;
  if (!provider?.isPhantom || !provider.signMessage || !provider.connect) {
    throw new Error(copy.phantomPluginMissing);
  }

  await provider.connect();
  const address = getSolanaAddress(provider.publicKey);
  if (!address) throw new Error(copy.phantomAddressMissing);

  return {
    walletType: 'Phantom',
    chain: 'SOL',
    address,
    signMessage: async (message: string) => {
      const signed = await provider.signMessage(new TextEncoder().encode(message), 'utf8');
      const signature = signed instanceof Uint8Array ? signed : signed.signature;
      return bytesToHex(signature);
    },
  };
}

function canConnectWallet(wallet: WalletOption, discoveredProviders: Eip6963ProviderDetail[]) {
  if (wallet.kind === 'tron') return hasTronProvider();
  if (wallet.kind === 'sol') return hasPhantomProvider();
  return Boolean(findMatchedEvmProvider(wallet, discoveredProviders));
}

export default function WalletLoginModal() {
  const { t, authLanguage } = useAuthPageTranslation();
  const walletCopy = getAuthWalletCopy(authLanguage);
  const nav = useNavigate();
  const loginSuccess = useUserStore((s) => s.loginSuccess);
  const { isOpen, close } = useWalletModalStore();
  const { isPc } = useResponsive();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [discoveredProviders, setDiscoveredProviders] = useState<Eip6963ProviderDetail[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const handleAnnounce = (event: Event) => {
      if (!isCustomEventWithProviderDetail(event)) return;
      const detail = event.detail;
      setDiscoveredProviders((current) => {
        if (current.some((item) => item.provider === detail.provider)) return current;
        return [...current, detail];
      });
    };
    const refreshProviders = () => {
      setDiscoveredProviders((current) => current.slice());
    };

    window.addEventListener(EIP6963_ANNOUNCE, handleAnnounce as EventListener);
    window.addEventListener('focus', refreshProviders);
    window.dispatchEvent(new Event(EIP6963_REQUEST));
    window.dispatchEvent(new Event(TRON_TIP6963_REQUEST));

    const timerA = window.setTimeout(refreshProviders, 250);
    const timerB = window.setTimeout(refreshProviders, 1200);

    return () => {
      window.removeEventListener(EIP6963_ANNOUNCE, handleAnnounce as EventListener);
      window.removeEventListener('focus', refreshProviders);
      window.clearTimeout(timerA);
      window.clearTimeout(timerB);
    };
  }, [isOpen]);

  const connectWallet = async (wallet: WalletOption) => {
    if (wallet.kind === 'tron') return connectTronWallet(walletCopy);
    if (wallet.kind === 'sol') return connectPhantomWallet(walletCopy);
    return connectEvmWallet(wallet, discoveredProviders, walletCopy);
  };

  const openWalletDownload = (wallet: WalletOption) => {
    window.open(wallet.downloadUrl, '_blank', 'noopener,noreferrer');
  };

  const onWalletAction = async (wallet: WalletOption) => {
    if (loadingKey) return;

    const available = canConnectWallet(wallet, discoveredProviders);
    if (!available) {
      openWalletDownload(wallet);
      return;
    }

    setLoadingKey(wallet.key);
    try {
      const session = await connectWallet(wallet);
      const { nonce } = await walletNonce(session.address, session.chain);
      const signature = await session.signMessage(nonce);
      const vo = await walletLogin({
        walletType: session.walletType,
        chain: session.chain,
        address: session.address,
        signature,
      });
      await loginSuccess(vo.token);
      toast.success(t('auth.loginSuccess'));
      close();
      nav('/', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth.loginFailed'));
    } finally {
      setLoadingKey(null);
    }
  };

  // 钱包列表渲染（PC/Mobile 共用）
  const walletList = (
    <div className="space-y-2">
      {WALLETS.map((wallet) => {
        const available = canConnectWallet(wallet, discoveredProviders);
        const loading = loadingKey === wallet.key;
        const actionText = loading ? t('auth.connecting') : available ? t('auth.connectNow') : t('auth.downloadNow');
        return (
          <button
            key={wallet.key}
            onClick={() => void onWalletAction(wallet)}
            type="button"
            disabled={Boolean(loadingKey)}
            className={`flex min-h-[54px] w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition ${
              available
                ? 'border-[#2850e7] bg-[#f6fff8] hover:border-[#57b776] hover:bg-[#effcf3]'
                : 'border-line bg-white hover:bg-bgSoft/70'
            } ${loading ? 'ring-2 ring-[#57b776]/15' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img src={wallet.icon} alt={wallet.name} className="h-6.5 w-6.5 object-contain" />
              </div>
              <span className="text-[15px] font-semibold text-text">{wallet.name}</span>
            </div>
            <span
              className={`inline-flex min-w-[82px] items-center justify-center rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ${
                loading
                  ? 'bg-[#def5e7] text-[#24995b]'
                  : available
                    ? 'bg-[#2850e7] text-[#ffffff]'
                    : 'bg-[#eef2f6] text-[#97a2b1]'
              }`}
            >
              {actionText}
            </span>
          </button>
        );
      })}
    </div>
  );

  // PC 居中弹窗
  if (isPc) {
    if (!isOpen) return null;
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
        <div className="aster-modal-pop relative flex w-full max-w-[500px] max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-pop">
          {/* 标题栏 */}
          <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-lg font-bold text-text">{t('auth.walletLogin')}</h2>
            <button
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-textSub hover:bg-bgSoft hover:text-text"
              aria-label="close"
            >
              <X size={20} />
            </button>
          </div>
          {/* 可滚动内容 */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {walletList}
            <div className="mt-5 border-t border-line pt-4 text-center text-sm text-textSub">
              <span>{t('auth.noWallet')}</span>{' '}
              <button
                type="button"
                onClick={() => {
                  close();
                  nav('/auth/login');
                }}
                className="font-semibold text-primary hover:underline"
              >
                {t('auth.useAccount')}
              </button>
              <span className="mx-2 text-line">|</span>
              <button
                type="button"
                onClick={() => {
                  close();
                  nav('/auth/register');
                }}
                className="font-semibold text-primary hover:underline"
              >
                {t('auth.register')}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // 移动端 BottomSheet
  return (
    <BottomSheet open={isOpen} onClose={close}>
      <div className="flex max-h-[calc(82vh-20px)] flex-col overflow-hidden">
        <div className="shrink-0 px-5 pb-3 pt-4">
          <h2 className="text-center text-lg font-bold text-text">{t('auth.walletLogin')}</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {walletList}
          <div className="mt-5 border-t border-line pt-4 text-center text-sm text-textSub">
            <span>{t('auth.noWallet')}</span>{' '}
            <button
              type="button"
              onClick={() => {
                close();
                nav('/auth/login');
              }}
              className="font-semibold text-primary hover:underline"
            >
              {t('auth.useAccount')}
            </button>
            <span className="mx-2 text-line">|</span>
            <button
              type="button"
              onClick={() => {
                close();
                nav('/auth/register');
              }}
              className="font-semibold text-primary hover:underline"
            >
              {t('auth.register')}
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
