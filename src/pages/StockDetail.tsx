import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockQuote, useStockTimeSeries, useMarketNews } from '@/hooks/useStockData';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useI18n } from '@/hooks/useI18n';
import type { TimeRange } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, Star, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y'];

const StockDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<TimeRange>('1M');
  const { data: quote, isLoading: quoteLoading } = useStockQuote(symbol || '');
  const { data: timeseries, isLoading: tsLoading } = useStockTimeSeries(symbol || '', range);
  const { data: news } = useMarketNews();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { locale, t } = useI18n();
  const dateLocale = locale === 'ko' ? ko : enUS;

  const inWatchlist = symbol ? isInWatchlist(symbol) : false;
  const isPositive = quote ? quote.change >= 0 : true;
  const strokeColor = isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
  const fillColor = isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';

  const relatedNews = news?.filter(a => a.tickers.includes(symbol || ''))?.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {quoteLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{symbol}</h1>
              <span className="text-muted-foreground">{quote?.name}</span>
              <Button
                variant={inWatchlist ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (inWatchlist) removeFromWatchlist(symbol!);
                  else addToWatchlist({ symbol: symbol!, name: quote?.name || symbol! });
                }}
              >
                <Star className={cn('h-4 w-4 mr-1', inWatchlist && 'fill-current')} />
                {inWatchlist ? t('inWatchlist') : t('add')}
              </Button>
            </div>
          )}
        </div>

        {/* Price section */}
        {quoteLoading ? (
          <Skeleton className="h-16 w-48" />
        ) : quote && (
          <div>
            <p className="text-4xl font-bold font-mono">${quote.price.toFixed(2)}</p>
            <div className={cn('flex items-center gap-2 mt-1', isPositive ? 'text-gain' : 'text-loss')}>
              {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              <span className="text-lg font-mono font-medium">
                {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}

        {/* Chart */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex gap-1">
              {TIME_RANGES.map(r => (
                <Button
                  key={r}
                  size="sm"
                  variant={range === r ? 'default' : 'ghost'}
                  className={cn('text-xs px-3 h-7', range === r && 'bg-primary text-primary-foreground')}
                  onClick={() => setRange(r)}
                >
                  {r}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {tsLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : timeseries && timeseries.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timeseries}>
                  <defs>
                    <linearGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={fillColor} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(222, 47%, 9%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: '8px', fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                    labelStyle={{ color: 'hsl(210, 40%, 96%)' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, t('close')]}
                  />
                  <Area type="monotone" dataKey="close" stroke={strokeColor} strokeWidth={2} fill="url(#detailGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">{t('noChartData')}</div>
            )}
          </CardContent>
        </Card>

        {/* Quote details */}
        {quote && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: t('open'), value: `$${quote.open.toFixed(2)}` },
              { label: t('high'), value: `$${quote.high.toFixed(2)}` },
              { label: t('low'), value: `$${quote.low.toFixed(2)}` },
              { label: t('prevClose'), value: `$${quote.previousClose.toFixed(2)}` },
              { label: t('volume'), value: quote.volume.toLocaleString() },
            ].map(item => (
              <Card key={item.label} className="bg-card border-border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-mono font-medium mt-0.5">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Related news */}
        {relatedNews && relatedNews.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-lg">관련 뉴스</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {relatedNews.map((article, i) => (
                <a key={i} href={article.url} target="_blank" rel="noopener noreferrer" className="block pb-3 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 py-2 rounded-md transition-colors group">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">{article.title}</h4>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted-foreground">{article.source}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
                    <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', article.sentiment === 'bullish' && 'bg-gain/10 text-gain', article.sentiment === 'bearish' && 'bg-loss/10 text-loss')}>
                      {article.sentiment === 'bullish' ? '긍정' : article.sentiment === 'bearish' ? '부정' : '중립'}
                    </Badge>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default StockDetail;
