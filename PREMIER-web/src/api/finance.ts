import http from './http';
import type { PageData } from './asset';

export interface LockProduct {
  id: number;
  name: string;
  coin: string;
  lockType: number; // 1 flexible 2 fixed
  lockDays: number;
  aprMin: string;
  aprMax: string;
  minAmount: string;
  maxAmount: string;
  isHot: number;
  sort?: number;
}

export interface LockOrderVO {
  id: number;
  orderNo: string;
  productId: number;
  productName?: string;
  lockType?: number;
  lockDays?: number;
  coin: string;
  amount: string;
  apr: string;
  interest: string;
  liveInterest?: string;
  startAt: string;
  endAt?: string;
  status: number; // 1 holding 2 redeemed 3 matured
  createdAt: string;
  updatedAt?: string;
}

export interface PortfolioProduct {
  id: number;
  name: string;
  coins: string;
  minAmount: string;
  maxAmount: string;
  dailyRate: string;
  durationDays: number;
  isHot: number;
}

export interface PortfolioOrderVO {
  id: number;
  orderNo: string;
  productId: number;
  productName?: string;
  durationDays?: number;
  amount: string;
  dailyRate: string;
  totalProfit: string;
  liveProfit?: string;
  startAt: string;
  endAt?: string;
  status: number;
  createdAt: string;
}

export interface LoanProduct {
  id: number;
  coin: string;
  collateralRatio: string;
  dailyRate: string;
  maxDays: number;
}

export interface LoanOrderVO {
  id: number;
  orderNo: string;
  coin: string;
  borrowAmount: string;
  collateralAmount: string;
  dailyRate: string;
  totalInterest: string;
  liveInterest?: string;
  repayAmount?: string;
  serviceFee: string;
  lockDays: number;
  startAt: string;
  dueAt: string;
  repaidAt?: string;
  status: number;
  createdAt: string;
}

export interface AiStrategy {
  id: number;
  name: string;
  strategyType: string;
  minAmount: string;
  maxApr: string;
  maxDrawdown: string;
  levelRequired: number;
  userCount: number;
}

export interface AiStrategyOrderVO {
  id: number;
  orderNo: string;
  strategyId: number;
  strategyName?: string;
  strategyType?: string;
  amount: string;
  totalProfit: string;
  liveProfit?: string;
  startAt: string;
  endAt?: string;
  status: number;
  createdAt: string;
}

// Lock
export const fetchLockProducts = (lockType?: number, coin?: string) =>
  http.get<LockProduct[], LockProduct[]>('/finance/lock/public/products', {
    params: { lockType, coin },
  });

export const subscribeLock = (productId: number, amount: string | number) =>
  http.post<LockOrderVO, LockOrderVO>('/finance/lock/subscribe', { productId, amount });

export const redeemLock = (orderId: number) =>
  http.post<LockOrderVO, LockOrderVO>(`/finance/lock/redeem/${orderId}`);

export const fetchMyLockOrders = (status?: number, pageNo = 1, pageSize = 20) =>
  http.get<PageData<LockOrderVO>, PageData<LockOrderVO>>('/finance/lock/order/my', {
    params: { status, pageNo, pageSize },
  });

// Portfolio
export const fetchPortfolioProducts = () =>
  http.get<PortfolioProduct[], PortfolioProduct[]>('/finance/portfolio/public/products');

export const subscribePortfolio = (productId: number, amount: string | number) =>
  http.post<PortfolioOrderVO, PortfolioOrderVO>('/finance/portfolio/subscribe', { productId, amount });

export const redeemPortfolio = (orderId: number) =>
  http.post<PortfolioOrderVO, PortfolioOrderVO>(`/finance/portfolio/redeem/${orderId}`);

export const fetchMyPortfolioOrders = (status?: number, pageNo = 1, pageSize = 20) =>
  http.get<PageData<PortfolioOrderVO>, PageData<PortfolioOrderVO>>('/finance/portfolio/order/my', {
    params: { status, pageNo, pageSize },
  });

// Loan
export const fetchLoanProducts = () =>
  http.get<LoanProduct[], LoanProduct[]>('/finance/loan/public/products');

export const estimateLoanCollateral = (productId: number, borrowAmount: string | number, lockDays: number) =>
  http.post<string, string>('/finance/loan/estimate', { productId, borrowAmount, lockDays });

export const borrowLoan = (productId: number, borrowAmount: string | number, lockDays: number) =>
  http.post<LoanOrderVO, LoanOrderVO>('/finance/loan/borrow', { productId, borrowAmount, lockDays });

export const repayLoan = (orderId: number) =>
  http.post<LoanOrderVO, LoanOrderVO>(`/finance/loan/repay/${orderId}`);

export const fetchMyLoanOrders = (status?: number, pageNo = 1, pageSize = 20) =>
  http.get<PageData<LoanOrderVO>, PageData<LoanOrderVO>>('/finance/loan/order/my', {
    params: { status, pageNo, pageSize },
  });

// AI strategy
export const fetchAiStrategies = () =>
  http.get<AiStrategy[], AiStrategy[]>('/finance/ai/public/strategies');

export const startAiStrategy = (strategyId: number, amount: string | number) =>
  http.post<AiStrategyOrderVO, AiStrategyOrderVO>('/finance/ai/start', { strategyId, amount });

export const stopAiStrategy = (orderId: number) =>
  http.post<AiStrategyOrderVO, AiStrategyOrderVO>(`/finance/ai/stop/${orderId}`);

export const fetchMyAiOrders = (status?: number, pageNo = 1, pageSize = 20) =>
  http.get<PageData<AiStrategyOrderVO>, PageData<AiStrategyOrderVO>>('/finance/ai/order/my', {
    params: { status, pageNo, pageSize },
  });
