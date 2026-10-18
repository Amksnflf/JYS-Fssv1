import http from './http';
import type { PageData } from './asset';

export interface OptionPeriod {
  seconds: number;
  payoutRate: string;
}

export interface OptionOrder {
  id: number;
  orderNo: string;
  symbol: string;
  settlementCoin?: string;
  direction: number; // 1 up 2 down
  periodSeconds: number;
  payoutRate: string;
  amount: string;
  openAt?: string;
  openPrice?: string;
  settlePrice?: string;
  settleAt?: string;
  result?: number; // 1 win 2 lose 3 draw
  profit?: string;
  status: number; // 0 running 1 settled 2 scheduled 3 cancelled
  createdAt: string;
}

export interface PlaceOptionDTO {
  symbol: string;
  direction: 1 | 2;
  periodSeconds: number;
  amount: number | string;
  scheduledAt?: string;
}

export const fetchOptionPeriods = () =>
  http.get<OptionPeriod[], OptionPeriod[]>('/option/public/periods');

export const placeOption = (dto: PlaceOptionDTO) =>
  http.post<OptionOrder, OptionOrder>('/option/order', dto);

export const fetchRunningOptions = () =>
  http.get<OptionOrder[], OptionOrder[]>('/option/order/running');

export const fetchOptionHistory = (pageNo = 1, pageSize = 20) =>
  http.get<PageData<OptionOrder>, PageData<OptionOrder>>('/option/order/history', {
    params: { pageNo, pageSize },
  });
