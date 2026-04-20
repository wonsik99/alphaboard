import { useSentimentHistory } from '@/hooks/useNewsAnalysis';
import { useI18n } from '@/hooks/useI18n';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface SentimentChartProps {
  symbol: string;
  height?: number;
}

export function SentimentChart({ symbol, height = 200 }: SentimentChartProps) {
  const { data: history, isLoading } = useSentimentHistory(symbol);
  const { locale } = useI18n();

  if (isLoading) {
    return <Skeleton className="w-full rounded-xl" style={{ height }} />;
  }

  if (!history || history.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-muted-foreground"
      >
        {locale === 'ko' ? '감성 분석 데이터가 없습니다' : 'No sentiment data available'}
      </div>
    );
  }

  const chartData = history.map(r => ({
    date: r.recorded_at,
    score: Number(r.score),
    articles: r.article_count,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`sentGradPos-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(152, 69%, 40%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(152, 69%, 40%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`sentGradNeg-${symbol}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="5%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => {
            const [, m, day] = d.split('-');
            return locale === 'ko' ? `${m}.${day}` : `${m}/${day}`;
          }}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          minTickGap={30}
        />
        <YAxis
          domain={[-1, 1]}
          ticks={[-1, -0.5, 0, 0.5, 1]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toFixed(1)}
          width={35}
        />
        <ReferenceLine
          y={0}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
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
          formatter={(value: number, name: string) => {
            if (name === 'score') {
              const label = locale === 'ko' ? '감성 점수' : 'Sentiment';
              return [value.toFixed(2), label];
            }
            return [value, name];
          }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="hsl(210, 100%, 50%)"
          strokeWidth={2}
          fill={`url(#sentGradPos-${symbol})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
