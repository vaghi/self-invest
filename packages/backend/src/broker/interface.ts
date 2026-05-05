import type {
  AccountInfo, Balance, Position, Order,
  OrderRequest, Quote, Bar, Timeframe,
} from '@self-invest/shared';

export interface IBrokerAdapter {
  connect(apiKey: string, apiSecret: string, paper: boolean): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  getAccount(): Promise<AccountInfo>;
  getBalance(): Promise<Balance>;

  getPositions(): Promise<Position[]>;
  getPosition(symbol: string): Promise<Position | null>;

  submitOrder(order: OrderRequest): Promise<Order>;
  cancelOrder(orderId: string): Promise<void>;
  getOrders(status?: string): Promise<Order[]>;
  getOrder(orderId: string): Promise<Order>;

  getQuote(symbol: string): Promise<Quote>;
  getBars(symbol: string, timeframe: Timeframe, start: Date, end: Date): Promise<Bar[]>;

  isPaperTrading(): boolean;
}
