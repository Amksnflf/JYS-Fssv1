import http from './http';
import type { PageData } from './asset';

export interface PositionVO {
  id: number;
  symbol: string;
  settlementCoin?: string;
  side: number;
  marginMode: number;
  leverage: number;
  amount: string;
  openPrice: string;
  markPrice: string;
  liqPrice: string;
  margin: string;
  unrealizedPnl: string;
  pnlRate: string;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  createdAt: string;
}

export interface PerpOrder {
  id: number;
  orderNo: string;
  symbol: string;
  side: number;
  orderType: number;
  marginMode: number;
  leverage: number;
  price: string;
  amount: string;
  dealPrice?: string;
  margin: string;
  fee: string;
  status: number;
  positionId?: number;
  createdAt: string;
}

export interface PerpHistoryPosition {
  id: number;
  symbol: string;
  side: number;
  leverage: number;
  amount: string;
  openPrice: string;
  realizedPnl: string;
  status: number;
  closedAt: string;
}

export interface OpenPerpDTO {
  symbol: string;
  side: 1 | 2;
  orderType: 1 | 2;
  marginMode?: 1 | 2;
  leverage?: number;
  price?: number | string;
  amount?: number | string;
  takeProfitPrice?: number | string;
  stopLossPrice?: number | string;
}

export const openPerp = (dto: OpenPerpDTO) =>
  http.post<PerpOrder, PerpOrder>('/perp/order', dto);

export const closePerp = (positionId: number) =>
  http.post<void, void>(`/perp/position/${positionId}/close`);

export const fetchMyPositions = () =>
  http.get<PositionVO[], PositionVO[]>('/perp/position/my');

export const fetchMyPerpOrders = (symbol?: string, pageNo = 1, pageSize = 20) =>
  http.get<PageData<PerpOrder>, PageData<PerpOrder>>('/perp/order/my', {
    params: { pageNo, pageSize, symbol },
  });

export const fetchHistoryPositions = (pageNo = 1, pageSize = 20) =>
  http.get<PageData<PerpHistoryPosition>, PageData<PerpHistoryPosition>>(
    '/perp/position/history',
    { params: { pageNo, pageSize } }
  );
