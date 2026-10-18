import { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import http from '@/api/http';

interface SymbolItem {
  symbol?: string;
  baseCoin?: string;
  quoteCoin?: string;
  tradeType?: string;
  enabled?: number;
}

interface Props extends Omit<SelectProps<string>, 'options'> {
  tradeType?: string;
}

export default function SymbolSelect({ tradeType, ...props }: Props) {
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    http
      .get<SymbolItem[], SymbolItem[]>('/admin/content/symbol/list', { params: { tradeType } })
      .then((list) => setSymbols(list ?? []))
      .finally(() => setLoading(false));
  }, [tradeType]);

  const options = useMemo(() => {
    const map = new Map<string, SymbolItem>();
    symbols.forEach((item) => {
      if (item.symbol && !map.has(item.symbol)) map.set(item.symbol, item);
    });
    return Array.from(map.entries()).map(([symbol, item]) => ({
      value: symbol,
      label: `${symbol}${item.enabled === 0 ? '（停用）' : ''}`,
    }));
  }, [symbols]);

  return (
    <Select<string>
      allowClear
      showSearch
      placeholder="选择交易对"
      style={{ width: 160 }}
      optionFilterProp="label"
      {...props}
      loading={loading}
      options={options}
    />
  );
}
