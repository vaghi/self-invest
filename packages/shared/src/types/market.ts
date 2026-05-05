export interface Bar {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
}

export interface Quote {
  symbol: string;
  bidPrice: string;
  askPrice: string;
  lastPrice: string;
  volume: number;
  timestamp: string;
}

export interface TechnicalIndicators {
  rsi14: number | null;
  macd: { value: number; signal: number; histogram: number } | null;
  bollingerBands: { upper: number; middle: number; lower: number } | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  vwap: number | null;
}

export interface MarketDataPackage {
  symbol: string;
  bars: Bar[];
  quote: Quote;
  indicators: TechnicalIndicators;
  fetchedAt: string;
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  symbols: string[];
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface MarketSentiment {
  fearGreedIndex: number;
  fearGreedLabel: string;
  marketTrend: 'bullish' | 'bearish' | 'neutral';
  timestamp: string;
}

export type Timeframe = '1min' | '5min' | '15min' | '1hour' | '4hour' | '1day' | '1week';
