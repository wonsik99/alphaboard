export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

export interface StockTimeSeriesPoint {
  date: string;
  // OHLC values may be null for padded bars that represent future trading
  // slots (e.g. after the current time on the 1D chart). Recharts skips null
  // values, leaving visible whitespace for the not-yet-traded portion of the
  // day.
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number;
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  tickers: string[];
}

export interface WatchlistItem {
  symbol: string;
  name: string;
}

export interface PortfolioHolding {
  id: string;
  symbol: string;
  name: string;
  purchasePrice: number;
  quantity: number;
  purchasedAt: string;
  notes?: string | null;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y';
