import http from './http';
import type { PageData } from './asset';

export type AccountKind = 'spot' | 'trade' | 'finance';

export interface FlashQuoteVO {
  fromCoin: string;
  toCoin: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  feeRate: string;
  quoteTs: number;
}

export interface FlashOrder {
  id: number;
  orderNo: string;
  fromAccount: number;
  toAccount: number;
  fromCoin: string;
  toCoin: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  feeRate: string;
  createdAt: string;
}

export const fetchFlashQuote = (fromCoin: string, toCoin: string, fromAmount: string | number) =>
  http.post<FlashQuoteVO, FlashQuoteVO>('/flash/quote', { fromCoin, toCoin, fromAmount });

export const submitFlashConvert = (
  fromAccount: AccountKind,
  toAccount: AccountKind,
  fromCoin: string,
  toCoin: string,
  fromAmount: string | number,
  expectedToAmount?: string | number,
  maxSlippage: number = 0.01
) =>
  http.post<FlashOrder, FlashOrder>('/flash/convert', {
    fromAccount,
    toAccount,
    fromCoin,
    toCoin,
    fromAmount,
    expectedToAmount,
    maxSlippage,
  });

export const fetchFlashHistory = (pageNo = 1, pageSize = 20) =>
  http.get<PageData<FlashOrder>, PageData<FlashOrder>>('/flash/my', {
    params: { pageNo, pageSize },
  });
