import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockQuote, useStockTimeSeries, useCompanyNews } from '@/hooks/useStockData';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useI18n } from '@/hooks/useI18n';
import type { TimeRange } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, Star, TrendingUp, TrendingDown, ExternalLink, LineChart, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { CandlestickChart } from '@/components/CandlestickChart';
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
type ChartType = 'line' | 'candle';

const StockDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<TimeRange>('1M');
  const [chartType, setChartType] = useState<ChartType>('line');
  const { data: quote, isLoading: quoteLoading } = useStockQuote(symbol || '');
  const { data: timeseries, isLoading: tsLoading } = useStockTimeSeries(symbol || '', range);
  const { data: companyNews } = useCompanyNews(symbol || '');
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { locale, t } = useI18n();
  const dateLocale = locale === 'ko' ? ko : enUS;

  const inWatchlist = symbol ? isInWatchlist(symbol) : false;
  const isPositive = quote ? quote.change >= 0 : true;
  const strokeColor = isPositive ? 'hsl(152, 69%, 40%)' : 'hsl(0, 72%, 55%)';
  const fillColor = isPositive ? 'hsl(152, 69%, 40%)' : 'hsl(0, 72%, 55%)';

  const relatedNews = news?.filter(a => a.tickers.includes(symbol || ''))?.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {quoteLoading ? (
            <Skeleton className="h-8 w-48 rounded-full" />
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold">{symbol}</h1>
              <span className="text-muted-foreground">{quote?.name}</span>
              <Button
                variant={inWatchlist ? 'default' : 'outline'}
                size="sm"
                className={cn('rounded-full', inWatchlist && 'shadow-md shadow-primary/20')}
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

        {quoteLoading ? (
          <Skeleton className="h-16 w-48 rounded-2xl" />
        ) : quote && (
          <div>
            <p className="text-4xl font-semibold font-mono tracking-tight">${quote.price.toFixed(2)}</p>
            <div className={cn('flex items-center gap-2 mt-1.5', isPositive ? 'text-gain' : 'text-loss')}>
              <div className={cn('flex items-center justify-center h-6 w-6 rounded-full', isPositive ? 'bg-gain/15' : 'bg-loss/15')}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
              <span className="text-lg font-mono font-medium">
                {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {TIME_RANGES.map(r => (
                  <Button
                    key={r}
                    size="sm"
                    variant={range === r ? 'default' : 'ghost'}
                    className={cn('text-xs px-3.5 h-7 rounded-full', range === r && 'shadow-md shadow-primary/20')}
                    onClick={() => setRange(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
              <div className="flex gap-0.5 bg-muted rounded-full p-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn('h-6 w-7 p-0 rounded-full', chartType === 'line' && 'bg-background shadow-sm')}
                  onClick={() => setChartType('line')}
                  title={t('chartLine')}
                >
                  <LineChart className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn('h-6 w-7 p-0 rounded-full', chartType === 'candle' && 'bg-background shadow-sm')}
                  onClick={() => setChartType('candle')}
                  title={t('chartCandle')}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tsLoading ? (
              <Skeleton className="h-[350px] w-full rounded-xl" />
            ) : timeseries && timeseries.length > 0 ? (
              chartType === 'candle' ? (
                <CandlestickChart data={timeseries} height={350} />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={timeseries}>
                    <defs>
                      <linearGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={fillColor} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--glass-bg))',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid hsl(var(--glass-border))',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                        boxShadow: 'var(--glass-shadow)',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, t('close')]}
                    />
                    <Area type="monotone" dataKey="close" stroke={strokeColor} strokeWidth={2} fill="url(#detailGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">{t('noChartData')}</div>
            )}
          </CardContent>
        </Card>

        {quote && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: t('open'), value: `$${quote.open.toFixed(2)}` },
              { label: t('high'), value: `$${quote.high.toFixed(2)}` },
              { label: t('low'), value: `$${quote.low.toFixed(2)}` },
              { label: t('prevClose'), value: `$${quote.previousClose.toFixed(2)}` },
              { label: t('volume'), value: quote.volume.toLocaleString() },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-mono font-medium mt-1">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {relatedNews && relatedNews.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">{t('relatedNews')}</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {relatedNews.map((article, i) => (
                <a key={i} href={article.url} target="_blank" rel="noopener noreferrer" className="block pb-3 border-b border-border/30 last:border-0 hover:bg-secondary/30 -mx-2 px-3 py-2.5 rounded-xl transition-all duration-200 group">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">{article.title}</h4>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted-foreground">{article.source}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: dateLocale })}</span>
                    <Badge variant="secondary" className={cn('text-[10px] px-2 py-0.5 rounded-full border-0', article.sentiment === 'bullish' && 'bg-gain/15 text-gain', article.sentiment === 'bearish' && 'bg-loss/15 text-loss')}>
                      {article.sentiment === 'bullish' ? t('bullish') : article.sentiment === 'bearish' ? t('bearish') : t('neutral')}
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
