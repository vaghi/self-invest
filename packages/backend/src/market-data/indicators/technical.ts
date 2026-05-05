import { RSI, MACD, BollingerBands, SMA, EMA, VWAP } from 'technicalindicators';
import type { Bar, TechnicalIndicators } from '@self-invest/shared';

export function calculateIndicators(bars: Bar[]): TechnicalIndicators {
  if (bars.length < 2) {
    return emptyIndicators();
  }

  const closes = bars.map((b) => parseFloat(b.close));
  const highs = bars.map((b) => parseFloat(b.high));
  const lows = bars.map((b) => parseFloat(b.low));
  const volumes = bars.map((b) => b.volume);

  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const bbValues = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
  const sma20Values = SMA.calculate({ values: closes, period: 20 });
  const sma50Values = SMA.calculate({ values: closes, period: 50 });
  const sma200Values = SMA.calculate({ values: closes, period: 200 });
  const ema12Values = EMA.calculate({ values: closes, period: 12 });
  const ema26Values = EMA.calculate({ values: closes, period: 26 });

  let vwapValue: number | null = null;
  try {
    const vwapValues = VWAP.calculate({ close: closes, high: highs, low: lows, volume: volumes });
    vwapValue = vwapValues.length > 0 ? vwapValues[vwapValues.length - 1] : null;
  } catch {
    vwapValue = null;
  }

  const lastMacd = macdValues.length > 0 ? macdValues[macdValues.length - 1] : null;
  const lastBB = bbValues.length > 0 ? bbValues[bbValues.length - 1] : null;

  return {
    rsi14: rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null,
    macd: lastMacd ? {
      value: lastMacd.MACD ?? 0,
      signal: lastMacd.signal ?? 0,
      histogram: lastMacd.histogram ?? 0,
    } : null,
    bollingerBands: lastBB ? {
      upper: lastBB.upper,
      middle: lastBB.middle,
      lower: lastBB.lower,
    } : null,
    sma20: sma20Values.length > 0 ? sma20Values[sma20Values.length - 1] : null,
    sma50: sma50Values.length > 0 ? sma50Values[sma50Values.length - 1] : null,
    sma200: sma200Values.length > 0 ? sma200Values[sma200Values.length - 1] : null,
    ema12: ema12Values.length > 0 ? ema12Values[ema12Values.length - 1] : null,
    ema26: ema26Values.length > 0 ? ema26Values[ema26Values.length - 1] : null,
    vwap: vwapValue,
  };
}

function emptyIndicators(): TechnicalIndicators {
  return {
    rsi14: null, macd: null, bollingerBands: null,
    sma20: null, sma50: null, sma200: null,
    ema12: null, ema26: null, vwap: null,
  };
}
