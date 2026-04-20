import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ArticleAnalysis {
  title: string;
  source: string;
  url: string;
  summary: string;
  publishedAt: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
}

export interface NewsAnalysisResult {
  symbol: string;
  summary: string;
  sentimentScore: number;
  articleCount: number;
  articles: ArticleAnalysis[];
}

export interface SentimentSummary {
  symbol: string;
  summary: string;
  sentimentScore: number;
  articleCount: number;
}

export interface SentimentRecord {
  id: string;
  symbol: string;
  score: number;
  article_count: number;
  summary: string | null;
  recorded_at: string;
}

async function invokeAnalysis<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('news-analysis', { body });
  if (error) throw new Error(error.message);
  return data as T;
}

export function useNewsAnalysis(symbol: string) {
  return useQuery<NewsAnalysisResult>({
    queryKey: ['news-analysis', symbol],
    queryFn: () => invokeAnalysis({ action: 'analyze', symbol }),
    enabled: !!symbol,
    staleTime: 600000, // 10 min — AI analysis is expensive
    refetchInterval: 600000,
    retry: 1,
  });
}

export function useBatchNewsAnalysis(symbols: string[]) {
  return useQuery<SentimentSummary[]>({
    queryKey: ['batch-news-analysis', symbols.join(',')],
    queryFn: () => invokeAnalysis({ action: 'batch-analyze', symbols }),
    enabled: symbols.length > 0,
    staleTime: 600000,
    retry: 1,
  });
}

export function useSentimentHistory(symbol: string) {
  return useQuery<SentimentRecord[]>({
    queryKey: ['sentiment-history', symbol],
    queryFn: () => invokeAnalysis({ action: 'history', symbol }),
    enabled: !!symbol,
    staleTime: 300000,
  });
}

export function useRefreshAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (symbol: string) =>
      invokeAnalysis<NewsAnalysisResult>({ action: 'analyze', symbol }),
    onSuccess: (data) => {
      queryClient.setQueryData(['news-analysis', data.symbol], data);
      queryClient.invalidateQueries({ queryKey: ['sentiment-history', data.symbol] });
      queryClient.invalidateQueries({ queryKey: ['batch-news-analysis'] });
    },
  });
}
