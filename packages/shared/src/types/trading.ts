export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderStatus = 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'expired';
export type OrderTimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  limitPrice?: string;
  stopPrice?: string;
  timeInForce: OrderTimeInForce;
  stopLossPrice?: string;
  takeProfitPrice?: string;
}

export interface Order {
  id: string;
  brokerOrderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  filledQuantity: string;
  price: string;
  filledPrice?: string;
  status: OrderStatus;
  timeInForce: OrderTimeInForce;
  createdAt: string;
  filledAt?: string;
  cancelledAt?: string;
}

export interface Trade {
  id: string;
  brokerTradeId: string;
  symbol: string;
  side: OrderSide;
  quantity: string;
  price: string;
  totalCost: string;
  commission: string;
  status: OrderStatus;
  orderType: OrderType;
  filledAt: string;
  createdAt: string;
  aiAnalysisId?: string;
  isPaper: boolean;
}

export interface Position {
  id: string;
  symbol: string;
  quantity: string;
  avgEntryPrice: string;
  currentPrice: string;
  marketValue: string;
  unrealizedPnL: string;
  unrealizedPnLPercent: string;
  realizedPnL: string;
  side: 'long' | 'short';
  stopLossPrice?: string;
  takeProfitPrice?: string;
  openedAt: string;
}

export interface Balance {
  totalValue: string;
  cashBalance: string;
  investedValue: string;
  buyingPower: string;
  dayPnL: string;
  dayPnLPercent: string;
  totalPnL: string;
  totalPnLPercent: string;
}

export interface PortfolioSnapshot {
  id: string;
  totalValue: string;
  cashBalance: string;
  investedValue: string;
  dayPnL: string;
  totalPnL: string;
  snapshotAt: string;
}

export interface TradeProposal {
  symbol: string;
  side: OrderSide;
  quantity: string;
  orderType: OrderType;
  limitPrice?: string;
  stopLossPrice: string;
  takeProfitPrice?: string;
  confidence: number;
  reasoning: string;
}
