import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarketIndex, StockQuote, StockTimeSeriesPoint, NewsArticle, TimeRange, SearchResult } from '@/lib/types';

// Use Finnhub as primary, Alpha Vantage kept in stock-data function as backup
const FUNCTION_NAME = 'finnhub-data';

async function invokeEdgeFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) throw new Error(error.message);
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
    queryFn: () => invokeEdgeFunction(FUNCTION_NAME, { action: 'timeseries', symbol, range }),
    enabled: !!symbol,
    staleTime: 300000, // 5 min - Alpha Vantage has strict rate limits
    refetchInterval: 300000,
    retry: 2,
    retryDelay: 15000, // Wait 15s before retry to let rate limit reset
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
