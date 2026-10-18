import { useEffect, useMemo, useState } from 'react';
import { Select, Space, Tag } from 'antd';
import type { SelectProps } from 'antd';
import http from '@/api/http';

export interface CoinSelectCoin {
  code?: string;
  name?: string;
  symbol?: string;
  logo?: string;
  assetCategory?: string;
  walletEnabled?: number;
  marketEnabled?: number;
}

interface CoinOption {
  value: string;
  label: React.ReactNode;
  searchText: string;
  coin: CoinSelectCoin;
}

type Props = Omit<SelectProps<string>, 'options'> & {
  assetCategory?: string;
  walletEnabled?: number;
  marketEnabled?: number;
  coins?: CoinSelectCoin[];
};

const CATEGORY_LABELS: Record<string, string> = {
  crypto: '加密货币',
  fiat: '法币',
  forex: '外汇',
  metal: '贵金属',
  commodity: '商品',
  index: '指数',
  stock: '股票',
};

export default function CoinSelect(props: Props) {
  const { assetCategory, walletEnabled, marketEnabled, coins: providedCoins, style, ...selectProps } = props;
  const [remoteCoins, setRemoteCoins] = useState<CoinSelectCoin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (providedCoins) return;
    setLoading(true);
    http
      .get<CoinSelectCoin[], CoinSelectCoin[]>('/admin/content/coin/list')
      .then((list) => setRemoteCoins(list ?? []))
      .finally(() => setLoading(false));
  }, [providedCoins]);

  const coins = providedCoins ?? remoteCoins;

  const options = useMemo(() => {
    const list: CoinOption[] = [];
    for (const coin of coins) {
      if (assetCategory && coin.assetCategory !== assetCategory) continue;
      if (walletEnabled !== undefined && coin.walletEnabled !== walletEnabled) continue;
      if (marketEnabled !== undefined && coin.marketEnabled !== marketEnabled) continue;
      const code = coin.code || coin.symbol;
      if (!code) continue;
      list.push({
        value: code,
        label: <CoinSelectedLabel coin={coin} code={code} />,
        searchText: `${code} ${coin.name ?? ''} ${coin.assetCategory ?? ''}`.trim(),
        coin,
      });
    }
    return list;
  }, [assetCategory, coins, marketEnabled, walletEnabled]);

  return (
    <Select<string>
      allowClear
      showSearch
      placeholder="选择币种"
      style={{ width: 140, ...(style ?? {}) }}
      optionFilterProp="searchText"
      {...selectProps}
      loading={!providedCoins && loading}
      options={options}
      optionRender={(option) => {
        const coin = option.data.coin as CoinSelectCoin;
        const code = coin.code || coin.symbol || '';
        return <CoinDropdownOption coin={coin} code={code} />;
      }}
    />
  );
}

function CoinSelectedLabel(props: { coin: CoinSelectCoin; code: string }) {
  const { coin, code } = props;
  return (
    <Space size={8}>
      <CoinAvatar logo={coin.logo} code={code} />
      <span>{coin.name ? `${code} - ${coin.name}` : code}</span>
    </Space>
  );
}

function CoinDropdownOption(props: { coin: CoinSelectCoin; code: string }) {
  const { coin, code } = props;
  return (
    <Space size={8} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Space size={8}>
        <CoinAvatar logo={coin.logo} code={code} />
        <span>{coin.name ? `${code} - ${coin.name}` : code}</span>
      </Space>
      {coin.assetCategory ? <Tag style={{ marginInlineEnd: 0 }}>{CATEGORY_LABELS[coin.assetCategory] ?? coin.assetCategory}</Tag> : null}
    </Space>
  );
}

function CoinAvatar(props: { logo?: string; code: string }) {
  const { logo, code } = props;
  const imageUrl = resolveImageUrl(logo);
  const fallbackText = code.slice(0, 1).toUpperCase() || '?';
  return imageUrl ? (
    <img
      src={imageUrl}
      alt={code}
      style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#f5f5f5' }}
    />
  ) : (
    <span
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#111827',
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {fallbackText}
    </span>
  );
}

function resolveImageUrl(value?: string) {
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  const normalized = normalizeUploadPath(value);
  if (normalized.startsWith('/uploads/')) return `/api${normalized}`;
  return normalized;
}

function normalizeUploadPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/uploads/')) return trimmed;
  if (trimmed.startsWith('api/uploads/')) return `/${trimmed}`;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;

  const apiUploadsIndex = trimmed.indexOf('/api/uploads/');
  if (apiUploadsIndex >= 0) return trimmed.slice(apiUploadsIndex);

  const uploadsIndex = trimmed.indexOf('/uploads/');
  if (uploadsIndex >= 0) return trimmed.slice(uploadsIndex);

  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
