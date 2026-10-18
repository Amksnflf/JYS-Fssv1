import http from './http';
import type { PageData } from './asset';

export interface SpotOrder {
  id: number;
  orderNo: string;
  symbol: string;
  side: number;
  orderType: number;
  price: string;
  amount: string;
  total: string;
  dealAmount: string;
  dealTotal: string;
  dealPrice?: string;
  fee: string;
  feeCoin?: string;
  status: number;
  createdAt: string;
}

export interface SpotTrade {
  id: number;
  tradeNo: string;
  orderId: number;
  symbol: string;
  side: number;
  price: string;
  amount: string;
  total: string;
  fee: string;
  createdAt: string;
}

export interface PlaceOrderDTO {
  symbol: string;
  side: 1 | 2;
  orderType: 1 | 2;
  price?: number | string;
  amount?: number | string;
  totalQuote?: number | string;
}

export const placeSpotOrder = (dto: PlaceOrderDTO) =>
  http.post<SpotOrder, SpotOrder>('/spot/order', dto);

export const cancelSpotOrder = (id: number) =>
  http.post<void, void>(`/spot/order/${id}/cancel`);

export const fetchOpenOrders = (symbol?: string, pageNo = 1, pageSize = 20) =>
  http.get<PageData<SpotOrder>, PageData<SpotOrder>>('/spot/order/open', {
    params: { pageNo, pageSize, symbol },
  });

export const fetchHistoryOrders = (symbol?: string, pageNo = 1, pageSize = 20) =>
  http.get<PageData<SpotOrder>, PageData<SpotOrder>>('/spot/order/history', {
    params: { pageNo, pageSize, symbol },
  });

export const fetchMyTrades = (symbol?: string, pageNo = 1, pageSize = 20) =>
  http.get<PageData<SpotTrade>, PageData<SpotTrade>>('/spot/trade/my', {
    params: { pageNo, pageSize, symbol },
  });
