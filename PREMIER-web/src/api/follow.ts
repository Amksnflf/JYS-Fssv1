import http from './http';
import type { PageData } from './asset';

export interface FollowTrader {
  id: number;
  name: string;
  avatar?: string;
  style?: string;
  winRate: string;
  pnlRate: string;
  followers: number;
}

export interface FollowOrder {
  id: number;
  orderNo: string;
  traderId: number;
  amount: string;
  maxLeverage: number;
  status: number;
  createdAt: string;
}

export const fetchFollowTraders = () =>
  http.get<FollowTrader[], FollowTrader[]>('/follow/public/traders');

export const startFollow = (traderId: number, amount: string | number, maxLeverage: number) =>
  http.post<FollowOrder, FollowOrder>('/follow/start', { traderId, amount, maxLeverage });

export const cancelFollow = (orderId: number) =>
  http.post<FollowOrder, FollowOrder>(`/follow/cancel/${orderId}`);

export const fetchMyFollowOrders = (status?: number, pageNo = 1, pageSize = 20) =>
  http.get<PageData<FollowOrder>, PageData<FollowOrder>>('/follow/my', {
    params: { status, pageNo, pageSize },
  });
