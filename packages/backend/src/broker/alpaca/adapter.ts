import type {
  AccountInfo, Balance, Position, Order,
  OrderRequest, Quote, Bar, Timeframe,
} from '@self-invest/shared';
import type { IBrokerAdapter } from '../interface.js';
import { logger } from '../../config/logger.js';
import { trackError } from '../../services/error-tracker.js';

const TIMEFRAME_MAP: Record<Timeframe, string> = {
  '1min': '1Min', '5min': '5Min', '15min': '15Min',
  '1hour': '1Hour', '4hour': '4Hour', '1day': '1Day', '1week': '1Week',
};

export class AlpacaAdapter implements IBrokerAdapter {
  private apiKey = '';
  private apiSecret = '';
  private paper = true;
  private connected = false;

  private get baseUrl(): string {
    return this.paper
      ? 'https://paper-api.alpaca.markets'
      : 'https://api.alpaca.markets';
  }

  private get dataUrl(): string {
    return 'https://data.alpaca.markets';
  }

  private get headers(): Record<string, string> {
    return {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.apiSecret,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.headers, ...options?.headers },
      });
      if (!response.ok) {
        const body = await response.text();
        const err = new Error(`Alpaca API error ${response.status}: ${body}`);
        trackError('broker_request', err, { url, status: response.status });
        throw err;
      }
      return response.json() as Promise<T>;
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        trackError('broker_connection', err, { url });
      }
      throw err;
    }
  }

  async connect(apiKey: string, apiSecret: string, paper: boolean): Promise<void> {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.paper = paper;
    const account = await this.request(`${this.baseUrl}/v2/account`);
    this.connected = true;
    logger.info({ paper }, 'Connected to Alpaca');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.apiKey = '';
    this.apiSecret = '';
  }

  isConnected(): boolean {
    return this.connected;
  }

  isPaperTrading(): boolean {
    return this.paper;
  }

  async getAccount(): Promise<AccountInfo> {
    const acc = await this.request<any>(`${this.baseUrl}/v2/account`);
    return {
      id: acc.id,
      currency: acc.currency,
      buyingPower: acc.buying_power,
      cash: acc.cash,
      portfolioValue: acc.portfolio_value,
      equity: acc.equity,
      status: acc.status,
      patternDayTrader: acc.pattern_day_trader,
      tradingBlocked: acc.trading_blocked,
      accountBlocked: acc.account_blocked,
    };
  }

  async getBalance(): Promise<Balance> {
    const acc = await this.request<any>(`${this.baseUrl}/v2/account`);
    const equity = parseFloat(acc.equity);
    const lastEquity = parseFloat(acc.last_equity);
    const dayPnL = equity - lastEquity;
    const dayPnLPercent = lastEquity > 0 ? (dayPnL / lastEquity) * 100 : 0;
    const cash = parseFloat(acc.cash);
    const invested = equity - cash;

    return {
      totalValue: acc.equity,
      cashBalance: acc.cash,
      investedValue: invested.toFixed(2),
      buyingPower: acc.buying_power,
      dayPnL: dayPnL.toFixed(2),
      dayPnLPercent: dayPnLPercent.toFixed(2),
      totalPnL: (equity - parseFloat(acc.last_equity)).toFixed(2),
      totalPnLPercent: dayPnLPercent.toFixed(2),
    };
  }

  async getPositions(): Promise<Position[]> {
    const positions = await this.request<any[]>(`${this.baseUrl}/v2/positions`);
    return positions.map((p) => ({
      id: p.asset_id,
      symbol: p.symbol,
      quantity: p.qty,
      avgEntryPrice: p.avg_entry_price,
      currentPrice: p.current_price,
      marketValue: p.market_value,
      unrealizedPnL: p.unrealized_pl,
      unrealizedPnLPercent: p.unrealized_plpc,
      realizedPnL: '0',
      side: parseFloat(p.qty) >= 0 ? 'long' as const : 'short' as const,
      openedAt: new Date().toISOString(),
    }));
  }

  async getPosition(symbol: string): Promise<Position | null> {
    try {
      const p = await this.request<any>(`${this.baseUrl}/v2/positions/${symbol}`);
      return {
        id: p.asset_id,
        symbol: p.symbol,
        quantity: p.qty,
        avgEntryPrice: p.avg_entry_price,
        currentPrice: p.current_price,
        marketValue: p.market_value,
        unrealizedPnL: p.unrealized_pl,
        unrealizedPnLPercent: p.unrealized_plpc,
        realizedPnL: '0',
        side: parseFloat(p.qty) >= 0 ? 'long' : 'short',
        openedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async submitOrder(order: OrderRequest): Promise<Order> {
    const body: any = {
      symbol: order.symbol,
      qty: order.quantity,
      side: order.side,
      type: order.type,
      time_in_force: order.timeInForce,
    };
    if (order.limitPrice) body.limit_price = order.limitPrice;
    if (order.stopPrice) body.stop_price = order.stopPrice;

    const result = await this.request<any>(`${this.baseUrl}/v2/orders`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (order.stopLossPrice) {
      await this.request(`${this.baseUrl}/v2/orders`, {
        method: 'POST',
        body: JSON.stringify({
          symbol: order.symbol,
          qty: order.quantity,
          side: order.side === 'buy' ? 'sell' : 'buy',
          type: 'stop',
          stop_price: order.stopLossPrice,
          time_in_force: 'gtc',
        }),
      }).catch((err) => logger.warn({ err }, 'Failed to place stop loss order'));
    }

    return this.mapOrder(result);
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request(`${this.baseUrl}/v2/orders/${orderId}`, { method: 'DELETE' });
  }

  async getOrders(status?: string): Promise<Order[]> {
    const params = status ? `?status=${status}` : '';
    const orders = await this.request<any[]>(`${this.baseUrl}/v2/orders${params}`);
    return orders.map(this.mapOrder);
  }

  async getOrder(orderId: string): Promise<Order> {
    const order = await this.request<any>(`${this.baseUrl}/v2/orders/${orderId}`);
    return this.mapOrder(order);
  }

  async getQuote(symbol: string): Promise<Quote> {
    const q = await this.request<any>(`${this.dataUrl}/v2/stocks/${symbol}/quotes/latest?feed=iex`);
    const quote = q.quote;
    return {
      symbol,
      bidPrice: String(quote.bp),
      askPrice: String(quote.ap),
      lastPrice: String((quote.bp + quote.ap) / 2),
      volume: quote.bs + quote.as,
      timestamp: quote.t,
    };
  }

  async getBars(symbol: string, timeframe: Timeframe, start: Date, end: Date): Promise<Bar[]> {
    const tf = TIMEFRAME_MAP[timeframe];
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      timeframe: tf,
      limit: '1000',
      feed: 'iex',
    });
    const result = await this.request<any>(`${this.dataUrl}/v2/stocks/${symbol}/bars?${params}`);
    return (result.bars || []).map((b: any) => ({
      timestamp: b.t,
      open: String(b.o),
      high: String(b.h),
      low: String(b.l),
      close: String(b.c),
      volume: b.v,
    }));
  }

  private mapOrder(o: any): Order {
    return {
      id: o.id,
      brokerOrderId: o.id,
      symbol: o.symbol,
      side: o.side as 'buy' | 'sell',
      type: o.type as any,
      quantity: o.qty,
      filledQuantity: o.filled_qty,
      price: o.limit_price || o.stop_price || '0',
      filledPrice: o.filled_avg_price,
      status: this.mapOrderStatus(o.status),
      timeInForce: o.time_in_force,
      createdAt: o.created_at,
      filledAt: o.filled_at,
      cancelledAt: o.canceled_at,
    };
  }

  private mapOrderStatus(status: string): Order['status'] {
    const map: Record<string, Order['status']> = {
      new: 'pending', accepted: 'pending', pending_new: 'pending',
      partially_filled: 'partially_filled', filled: 'filled',
      canceled: 'cancelled', expired: 'expired', rejected: 'rejected',
      done_for_day: 'filled',
    };
    return map[status] || 'pending';
  }
}
