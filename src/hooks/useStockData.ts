import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarketIndex, StockQuote, StockTimeSeriesPoint, NewsArticle, TimeRange } from '@/lib/types';

async function invokeEdgeFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) throw new Error(error.message);
  return data as T;
}

export function useMarketIndices() {
  return useQuery<MarketIndex[]>({
    queryKey: ['market-indices'],
    queryFn: () => invokeEdgeFunction('stock-data', { action: 'indices' }),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useStockQuote(symbol: string) {
  return useQuery<StockQuote>({
    queryKey: ['stock-quote', symbol],
    queryFn: () => invokeEdgeFunction('stock-data', { action: 'quote', symbol }),
    enabled: !!symbol,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useStockTimeSeries(symbol: string, range: TimeRange) {
  return useQuery<StockTimeSeriesPoint[]>({
    queryKey: ['stock-timeseries', symbol, range],
    queryFn: () => invokeEdgeFunction('stock-data', { action: 'timeseries', symbol, range }),
    enabled: !!symbol,
    staleTime: 60000,
  });
}

export function useMarketNews() {
  return useQuery<NewsArticle[]>({
    queryKey: ['market-news'],
    queryFn: () => invokeEdgeFunction('stock-data', { action: 'news' }),
    refetchInterval: 300000,
    staleTime: 120000,
  });
}

export function useBatchQuotes(symbols: string[]) {
  return useQuery<StockQuote[]>({
    queryKey: ['batch-quotes', symbols.join(',')],
    queryFn: () => invokeEdgeFunction('stock-data', { action: 'batch', symbols }),
    enabled: symbols.length > 0,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
