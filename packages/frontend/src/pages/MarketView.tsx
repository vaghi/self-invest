import { useEffect, useState, useRef, useMemo } from 'react';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import { Search, Trash2, X } from 'lucide-react';
import api from '../services/api';

const DEFAULT_WATCHLIST = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'SPY', 'QQQ'];
const WATCHLIST_STORAGE_KEY = 'self-invest:watchlist';

const COMMON_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JPM',
  'V', 'UNH', 'XOM', 'JNJ', 'WMT', 'MA', 'PG', 'HD', 'CVX', 'MRK',
  'ABBV', 'LLY', 'PEP', 'KO', 'AVGO', 'COST', 'TMO', 'MCD', 'CSCO', 'ACN',
  'ABT', 'DHR', 'NEE', 'WFC', 'LIN', 'BMY', 'TXN', 'PM', 'UPS', 'MS',
  'COP', 'RTX', 'ORCL', 'HON', 'QCOM', 'INTC', 'AMD', 'LOW', 'AMGN', 'UNP',
  'IBM', 'GS', 'BA', 'CAT', 'GE', 'SBUX', 'AMAT', 'DE', 'ISRG', 'MDT',
  'ADP', 'PLD', 'BKNG', 'GILD', 'ADI', 'REGN', 'SYK', 'VRTX', 'MDLZ', 'TJX',
  'LRCX', 'CB', 'CI', 'MMC', 'CME', 'PANW', 'SNPS', 'CDNS', 'ETN', 'ZTS',
  'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'ARKK', 'XLF', 'XLE', 'XLK',
  'SOFI', 'PLTR', 'RIVN', 'LCID', 'NIO', 'COIN', 'MARA', 'SQ', 'SHOP', 'SNOW',
  'CRWD', 'DDOG', 'NET', 'ZS', 'ABNB', 'UBER', 'LYFT', 'DASH', 'RBLX', 'U',
];

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_WATCHLIST;
}

function saveWatchlist(list: string[]) {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list));
}

export default function MarketView() {
  const [watchlist, setWatchlist] = useState<string[]>(loadWatchlist);
  const [selectedSymbol, setSelectedSymbol] = useState(() => {
    const list = loadWatchlist();
    return list.includes('SPY') ? 'SPY' : list[0] ?? 'SPY';
  });
  const [quotes, setQuotes] = useState<Record<string, { lastPrice: string; symbol: string }>>({});
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toUpperCase().trim();
    return COMMON_STOCKS
      .filter((s) => s.startsWith(q) && !watchlist.includes(s))
      .slice(0, 8);
  }, [searchQuery, watchlist]);

  function addToWatchlist(symbol: string) {
    const updated = [...watchlist, symbol];
    setWatchlist(updated);
    saveWatchlist(updated);
    setSearchQuery('');
    setShowSearch(false);
    setSelectedSymbol(symbol);
  }

  function removeFromWatchlist(symbol: string) {
    if (watchlist.length <= 1) return; // keep at least one
    const updated = watchlist.filter((s) => s !== symbol);
    setWatchlist(updated);
    saveWatchlist(updated);
    if (selectedSymbol === symbol) {
      setSelectedSymbol(updated[0]);
    }
  }

  useEffect(() => {
    watchlist.forEach(async (symbol) => {
      try {
        const { data } = await api.get(`/market/quote/${symbol}`);
        setQuotes((prev) => ({ ...prev, [symbol]: data }));
      } catch {}
    });
  }, [watchlist]);

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
    <div id="market-page" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          {/* Watchlist header with search */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Watchlist</h3>
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                if (!showSearch) {
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                } else {
                  setSearchQuery('');
                }
              }}
              className="text-gray-400 hover:text-brand-400 transition"
              aria-label={showSearch ? 'Close search' : 'Search stocks'}
              title="Add stock to watchlist"
            >
              {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
          </div>

          {/* Search input */}
          {showSearch && (
            <div className="relative mb-3">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                placeholder="Search symbol..."
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200
                           placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition"
              />
              {/* Suggestions dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
                  {suggestions.map((symbol) => (
                    <button
                      key={symbol}
                      onClick={() => addToWatchlist(symbol)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition"
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              )}
              {searchQuery.trim() && suggestions.length === 0 && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
                  <button
                    onClick={() => addToWatchlist(searchQuery.trim())}
                    className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition"
                  >
                    Add "{searchQuery.trim()}"
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            {watchlist.map((symbol) => (
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
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Daily Chart (90 days)</span>
              <button
                onClick={() => removeFromWatchlist(selectedSymbol)}
                disabled={watchlist.length <= 1}
                className="text-gray-500 hover:text-red-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Remove from watchlist"
                title="Remove from watchlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div ref={chartContainerRef} />
        </div>
      </div>
    </div>
  );
}
