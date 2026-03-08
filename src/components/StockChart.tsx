import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStockTimeSeries, useStockQuote } from '@/hooks/useStockData';
import { StockSearch } from '@/components/StockSearch';
import { useI18n } from '@/hooks/useI18n';
import type { TimeRange } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';
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

export function StockChart() {
  const [symbol, setSymbol] = useState('AAPL');
  const [range, setRange] = useState<TimeRange>('1M');
  const { t } = useI18n();

  const { data: timeseries, isLoading: tsLoading } = useStockTimeSeries(symbol, range);
  const { data: quote } = useStockQuote(symbol);

  const isPositive = quote ? quote.change >= 0 : true;
  const strokeColor = isPositive ? 'hsl(152, 69%, 40%)' : 'hsl(0, 72%, 55%)';
  const fillColor = isPositive ? 'hsl(152, 69%, 40%)' : 'hsl(0, 72%, 55%)';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {symbol}
              {quote && (
                <span className="text-sm text-muted-foreground font-normal">{quote.name}</span>
              )}
            </CardTitle>
            {quote && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-semibold font-mono tracking-tight">
                  ${quote.price.toFixed(2)}
                </span>
                <span className={cn('flex items-center gap-1 text-sm font-mono font-medium', isPositive ? 'text-gain' : 'text-loss')}>
                  <div className={cn('flex items-center justify-center h-5 w-5 rounded-full', isPositive ? 'bg-gain/15' : 'bg-loss/15')}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  </div>
                  {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
          <StockSearch
            onSelect={(sym) => setSymbol(sym)}
            className="w-56"
          />
        </div>
        <div className="flex gap-1 mt-3">
          {TIME_RANGES.map(r => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? 'default' : 'ghost'}
              className={cn(
                'text-xs px-3.5 h-7 rounded-full transition-all',
                range === r && 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              )}
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {tsLoading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : timeseries && timeseries.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeseries}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={fillColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `$${v}`}
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
                itemStyle={{ color: strokeColor }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, t('close')]}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={strokeColor}
                strokeWidth={2}
                fill="url(#chartGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {t('noData')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
