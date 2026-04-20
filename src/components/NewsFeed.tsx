import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWatchlistNews, useMarketNews } from '@/hooks/useStockData';
import { useBatchNewsAnalysis } from '@/hooks/useNewsAnalysis';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { Newspaper, ExternalLink, Brain } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

export function NewsFeed() {
  const navigate = useNavigate();
  const { watchlist } = useWatchlist();
  const symbols = watchlist.map(w => w.symbol);
  const { data: watchlistNews, isLoading: wlLoading } = useWatchlistNews(symbols);
  const { data: generalNews, isLoading: gnLoading } = useMarketNews();
  const { data: sentimentData } = useBatchNewsAnalysis(symbols);
  const { locale, t } = useI18n();
  const dateLocale = locale === 'ko' ? ko : enUS;

  // Use watchlist news if available, fall back to general
  const news = watchlistNews && watchlistNews.length > 0 ? watchlistNews : generalNews;
  const isLoading = wlLoading || ((!watchlistNews || watchlistNews.length === 0) && gnLoading);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Newspaper className="h-3.5 w-3.5 text-primary" />
          </div>
          {t('marketNews')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {/* AI Sentiment Overview */}
        {sentimentData && sentimentData.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-secondary/30 space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">{t('aiAnalysis')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sentimentData.map(s => {
                const isPos = s.sentimentScore > 0.2;
                const isNeg = s.sentimentScore < -0.2;
                return (
                  <button
                    key={s.symbol}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/60 hover:bg-background transition-colors text-left"
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                  >
                    <span className="text-xs font-semibold">{s.symbol}</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded-full',
                        isPos && 'bg-gain/15 text-gain',
                        isNeg && 'bg-loss/15 text-loss',
                        !isPos && !isNeg && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {s.sentimentScore > 0 ? '+' : ''}{s.sentimentScore.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2 pb-3 border-b border-border/30 last:border-0">
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-3 w-3/4 rounded-full" />
              <Skeleton className="h-3 w-1/2 rounded-full" />
            </div>
          ))
        ) : news && news.length > 0 ? (
          news.slice(0, 10).map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "block pb-3 border-b border-border/30 last:border-0 hover:bg-secondary/30 -mx-2 px-3 py-2.5 rounded-xl transition-all duration-200 group animate-enter-fast",
                i < 8 && `stagger-${i + 1}`
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </h4>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{article.source}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: dateLocale })}
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full border-0',
                    article.sentiment === 'bullish' && 'bg-gain/15 text-gain',
                    article.sentiment === 'bearish' && 'bg-loss/15 text-loss',
                    article.sentiment === 'neutral' && 'bg-muted text-muted-foreground',
                  )}
                >
                  {article.sentiment === 'bullish' ? t('bullish') : article.sentiment === 'bearish' ? t('bearish') : t('neutral')}
                </Badge>
                {article.tickers.slice(0, 3).map(ticker => (
                  <Badge key={ticker} variant="outline" className="text-[10px] px-2 py-0.5 rounded-full border-border/50">{ticker}</Badge>
                ))}
              </div>
            </a>
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">{t('noNews')}</p>
        )}
      </CardContent>
    </Card>
  );
}
