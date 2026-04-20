import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { MarketIndex } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface MarketIndexCardProps {
  index?: MarketIndex;
  loading?: boolean;
}

export function MarketIndexCard({ index, loading }: MarketIndexCardProps) {
  if (loading || !index) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-20 mb-3 rounded-full" />
          <Skeleton className="h-8 w-28 mb-2 rounded-full" />
          <Skeleton className="h-4 w-24 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = index.change >= 0;

  return (
    <Card className={cn(
      "group hover:-translate-y-0.5 transition-all duration-300 cursor-default overflow-hidden relative",
      isPositive ? 'hover:glow-gain' : 'hover:glow-loss'
    )}>
      <div className={cn(
        'absolute inset-x-0 top-0 h-[2px] transition-opacity',
        isPositive ? 'bg-gradient-to-r from-transparent via-gain to-transparent' : 'bg-gradient-to-r from-transparent via-loss to-transparent',
        'opacity-0 group-hover:opacity-100'
      )} />
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{index.name}</p>
        <p className="text-2xl font-bold font-mono mt-2 tracking-tight">
          {index.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className={cn('flex items-center gap-2 mt-2', isPositive ? 'text-gain' : 'text-loss')}>
          <div className={cn(
            'flex items-center justify-center h-5 w-5 rounded-md',
            isPositive ? 'bg-gain/10' : 'bg-loss/10'
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          </div>
          <span className="text-sm font-mono font-semibold">
            {isPositive ? '+' : ''}{index.change.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            ({isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
