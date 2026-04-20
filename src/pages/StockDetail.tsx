import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockQuote, useStockTimeSeries, useCompanyNews } from '@/hooks/useStockData';
import { useNewsAnalysis, useRefreshAnalysis } from '@/hooks/useNewsAnalysis';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useI18n } from '@/hooks/useI18n';
import { buildChartTicks, formatChartAxisLabel, formatChartPrice, formatChartTooltipLabel, getChartDirection, padIntradayTimeline } from '@/lib/chart';
import type { TimeRange } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, Star, TrendingUp, TrendingDown, ExternalLink, LineChart, BarChart3, Brain, RefreshCw, Loader2 } from 'lucide-react';
import { SentimentChart } from '@/components/SentimentChart';
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
  const {
    data: timeseries,
    isLoading: tsLoading,
    isError: tsError,
    refetch: refetchTimeseries,
  } = useStockTimeSeries(symbol || '', range);
  const { data: companyNews } = useCompanyNews(symbol || '');
  const { data: newsAnalysis, isLoading: analysisLoading } = useNewsAnalysis(symbol || '');
  const refreshAnalysis = useRefreshAnalysis();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { locale, t } = useI18n();
  const dateLocale = locale === 'ko' ? ko : enUS;

  const inWatchlist = symbol ? isInWatchlist(symbol) : false;
  const chartData = padIntradayTimeline(timeseries, range);
  const quoteIsPositive = quote ? quote.change >= 0 : true;
  const chartIsPositive = getChartDirection(chartData, quote?.change ?? 0);
  const strokeColor = chartIsPositive ? 'hsl(152, 69%, 40%)' : 'hsl(0, 72%, 55%)';
  const fillColor = chartIsPositive ? 'hsl(152, 69%, 40%)' : 'hsl(0, 72%, 55%)';
  const xAxisTicks = buildChartTicks(chartData, range);

  const relatedNews = companyNews?.slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3 animate-enter stagger-1">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {quoteLoading ? (
            <Skeleton className="h-8 w-48 rounded-full" />
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-semibold">{symbol}</h1>
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
          <div className="animate-enter stagger-2">
            <p className="text-4xl font-semibold font-mono tracking-tight">${quote.price.toFixed(2)}</p>
            <div className={cn('flex items-center gap-2 mt-1.5', quoteIsPositive ? 'text-gain' : 'text-loss')}>
              <div className={cn('flex items-center justify-center h-6 w-6 rounded-full', quoteIsPositive ? 'bg-gain/15' : 'bg-loss/15')}>
                {quoteIsPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
              <span className="text-lg font-mono font-medium">
                {quoteIsPositive ? '+' : ''}{quote.change.toFixed(2)} ({quoteIsPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}

        <Card className="animate-enter stagger-3">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-1">
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
            ) : tsError ? (
              <div className="h-[350px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <span className="text-sm">{t('chartLoadError')}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => refetchTimeseries()}
                >
                  {t('retry')}
                </Button>
              </div>
            ) : chartData && chartData.length > 0 ? (
              chartType === 'candle' ? (
                <CandlestickChart data={chartData} range={range} locale={locale} height={350} emptyLabel={t('noChartData')} />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={fillColor} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value: string) => formatChartAxisLabel(value, range, locale)}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                      ticks={xAxisTicks}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) => formatChartPrice(value)}
                    />
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
                      labelFormatter={(label) => formatChartTooltipLabel(String(label), range, locale)}
                      formatter={(value: number | null) => [formatChartPrice(value), t('close')]}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke={strokeColor}
                      strokeWidth={2}
                      fill="url(#detailGradient)"
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">{t('noChartData')}</div>
            )}
          </CardContent>
        </Card>

        {quote && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-enter stagger-4">
            {[
              { label: t('open'), value: `$${quote.open.toFixed(2)}` },
              { label: t('high'), value: `$${quote.high.toFixed(2)}` },
              { label: t('low'), value: `$${quote.low.toFixed(2)}` },
              { label: t('prevClose'), value: `$${quote.previousClose.toFixed(2)}` },
              {
                label: t('volume'),
                // Finnhub's basic quote doesn't include volume; the edge
                // function fills it from Yahoo when available. If that fetch
                // fails or the source returns a bogus sub-100 value, show a
                // dash instead of a misleading tiny number like "6".
                value: quote.volume > 100 ? quote.volume.toLocaleString() : '—',
              },
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

        {/* AI Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-enter stagger-5">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  {t('aiAnalysis')}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full text-xs"
                  disabled={refreshAnalysis.isPending}
                  onClick={() => symbol && refreshAnalysis.mutate(symbol)}
                >
                  {refreshAnalysis.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {t('refreshAnalysis')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="h-4 w-3/4 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full mt-2" />
                </div>
              ) : newsAnalysis ? (
                <div className="space-y-4">
                  <p className="text-sm text-foreground leading-relaxed">{newsAnalysis.summary}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">{t('veryBearish')}</span>
                        <span className="text-xs text-muted-foreground">{t('veryBullish')}</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-loss via-muted-foreground/20 to-gain rounded-full" />
                        <div
                          className="absolute top-0 h-full w-3 bg-foreground rounded-full shadow-sm transition-all"
                          style={{ left: `calc(${((newsAnalysis.sentimentScore + 1) / 2) * 100}% - 6px)` }}
                        />
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-sm font-mono px-3 py-1 rounded-full border-0',
                        newsAnalysis.sentimentScore > 0.2 && 'bg-gain/15 text-gain',
                        newsAnalysis.sentimentScore < -0.2 && 'bg-loss/15 text-loss',
                      )}
                    >
                      {newsAnalysis.sentimentScore > 0 ? '+' : ''}{newsAnalysis.sentimentScore.toFixed(2)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {newsAnalysis.articleCount} {locale === 'ko' ? '개 기사 분석' : 'articles analyzed'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('noSentimentData')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('sentimentTrend')}</CardTitle>
            </CardHeader>
            <CardContent>
              <SentimentChart symbol={symbol || ''} height={200} />
            </CardContent>
          </Card>
        </div>

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
