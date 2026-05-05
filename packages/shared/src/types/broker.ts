export type BrokerType = 'alpaca' | 'binance';

export interface BrokerCredentials {
  apiKey: string;
  apiSecret: string;
  isPaperTrading: boolean;
}

export interface BrokerConnection {
  id: string;
  brokerType: BrokerType;
  isPaperTrading: boolean;
  isActive: boolean;
  maskedApiKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountInfo {
  id: string;
  currency: string;
  buyingPower: string;
  cash: string;
  portfolioValue: string;
  equity: string;
  status: string;
  patternDayTrader: boolean;
  tradingBlocked: boolean;
  accountBlocked: boolean;
}
