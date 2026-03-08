import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketNews } from '@/hooks/useStockData';
import { cn } from '@/lib/utils';
import { Newspaper, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function NewsFeed() {
  const { data: news, isLoading } = useMarketNews();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          시장 뉴스
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2 pb-3 border-b border-border last:border-0">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : news && news.length > 0 ? (
          news.slice(0, 10).map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block pb-3 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 py-2 rounded-md transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </h4>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">{article.source}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] px-1.5 py-0',
                    article.sentiment === 'bullish' && 'bg-gain/10 text-gain border-gain/20',
                    article.sentiment === 'bearish' && 'bg-loss/10 text-loss border-loss/20',
                    article.sentiment === 'neutral' && 'bg-muted text-muted-foreground',
                  )}
                >
                  {article.sentiment === 'bullish' ? '긍정' : article.sentiment === 'bearish' ? '부정' : '중립'}
                </Badge>
                {article.tickers.slice(0, 3).map(t => (
                  <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                ))}
              </div>
            </a>
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">뉴스를 불러올 수 없습니다</p>
        )}
      </CardContent>
    </Card>
  );
}
