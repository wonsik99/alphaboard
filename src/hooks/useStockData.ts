import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarketIndex, StockQuote, StockTimeSeriesPoint, NewsArticle, TimeRange, SearchResult } from '@/lib/types';

const FUNCTION_NAME = 'finnhub-data';

async function invokeEdgeFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) throw new Error(error.message);
  // Edge Function may return a structured error payload with HTTP 2xx-ish
  // via supabase-js (e.g. 502 is surfaced through `error` above, but some
  // paths resolve with a JSON body). Guard against that by checking for an
  // explicit `error` field on the body itself.
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    const payload = data as { error: string; message?: string };
    throw new Error(payload.message || payload.error);
  }
  return data as T;
}

export function useMarketIndices() {
  return useQuery<MarketIndex[]>({
    queryKey: ['market-indices'],
    queryFn: () => invokeEdgeFunction(FUNCTION_NAME, { action: 'indices' }),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useStockQuote(symbol: string) {
  return useQuery<StockQuote>({
    queryKey: ['stock-quote', symbol],
    queryFn: () => invokeEdgeFunction(FUNCTION_NAME, { action: 'quote', symbol }),
    enabled: !!symbol,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useStockTimeSeries(symbol: string, range: TimeRange) {
  return useQuery<StockTimeSeriesPoint[]>({
    queryKey: ['stock-timeseries', symbol, range],
    queryFn: () => invokeEdgeFunction<StockTimeSeriesPoint[]>(FUNCTION_NAME, {
      action: 'timeseries',
      symbol,
      range,
    }),
    enabled: !!symbol,
    // Yahoo is fast and has no strict per-minute quota for us, so we can
    // refresh more aggressively than the old Alpha Vantage-backed flow.
    staleTime: 60_000,
    refetchInterval: range === '1D' ? 60_000 : 300_000,
    retry: 2,
    retryDelay: 2_000,
  });
}

export function useMarketNews() {
  return useQuery<NewsArticle[]>({
    queryKey: ['market-news'],
    queryFn: () => invokeEdgeFunction(FUNCTION_NAME, { action: 'news' }),
    refetchInterval: 300000,
    staleTime: 120000,
  });
}

export function useWatchlistNews(symbols: string[]) {
  return useQuery<NewsArticle[]>({
    queryKey: ['watchlist-news', symbols.join(',')],
    queryFn: () => invokeEdgeFunction(FUNCTION_NAME, { action: 'watchlist-news', symbols }),
    enabled: symbols.length > 0,
    refetchInterval: 300000,
    staleTime: 120000,
  });
}

export function useCompanyNews(symbol: string) {
  return useQuery<NewsArticle[]>({
    queryKey: ['company-news', symbol],
    queryFn: () => invokeEdgeFunction(FUNCTION_NAME, { action: 'news', symbol }),
    enabled: !!symbol,
    refetchInterval: 300000,
    staleTime: 120000,
  });
}

export function useBatchQuotes(symbols: string[]) {
  return useQuery<StockQuote[]>({
    queryKey: ['batch-quotes', symbols.join(',')],
    queryFn: () => invokeEdgeFunction(FUNCTION_NAME, { action: 'batch', symbols }),
    enabled: symbols.length > 0,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useStockSearch(keywords: string) {
  return useQuery<SearchResult[]>({
    queryKey: ['stock-search', keywords],
    queryFn: () => invokeEdgeFunction(FUNCTION_NAME, { action: 'search', keywords }),
    enabled: keywords.length >= 1,
    staleTime: 60000,
  });
}
