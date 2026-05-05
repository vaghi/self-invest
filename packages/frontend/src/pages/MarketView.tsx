import { useEffect, useState, useRef } from 'react';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import api from '../services/api';

const WATCHLIST = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'SPY', 'QQQ'];

export default function MarketView() {
  const [selectedSymbol, setSelectedSymbol] = useState('SPY');
  const [quotes, setQuotes] = useState<Record<string, { lastPrice: string; symbol: string }>>({});
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    WATCHLIST.forEach(async (symbol) => {
      try {
        const { data } = await api.get(`/market/quote/${symbol}`);
        setQuotes((prev) => ({ ...prev, [symbol]: data }));
      } catch {}
    });
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      crosshair: {
        mode: 0,
      },
    });
    chartRef.current = chart;

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    seriesRef.current = series;

    loadBars(selectedSymbol);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [selectedSymbol]);

  async function loadBars(symbol: string) {
    try {
      const { data } = await api.get(`/market/bars/${symbol}?timeframe=1day&days=90`);
      if (seriesRef.current && data.length > 0) {
        const formatted = data.map((b: any) => ({
          time: b.timestamp.split('T')[0],
          open: parseFloat(b.open),
          high: parseFloat(b.high),
          low: parseFloat(b.low),
          close: parseFloat(b.close),
        }));
        seriesRef.current.setData(formatted);
        chartRef.current?.timeScale().fitContent();
      }
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Watchlist</h3>
          <div className="space-y-1">
            {WATCHLIST.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedSymbol === symbol
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                <span className="font-medium">{symbol}</span>
                <span className="text-gray-400">
                  {quotes[symbol] ? `$${parseFloat(quotes[symbol].lastPrice).toFixed(2)}` : '-'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100">{selectedSymbol}</h3>
            <span className="text-sm text-gray-400">Daily Chart (90 days)</span>
          </div>
          <div ref={chartContainerRef} />
        </div>
      </div>
    </div>
  );
}
