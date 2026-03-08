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
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2 rounded-full" />
          <Skeleton className="h-7 w-28 mb-1 rounded-full" />
          <Skeleton className="h-4 w-24 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = index.change >= 0;

  return (
    <Card className="hover:scale-[1.02] hover:shadow-lg transition-all duration-300 cursor-default">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground font-medium">{index.name}</p>
        <p className="text-2xl font-semibold font-mono mt-1.5 tracking-tight">
          {index.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className={cn('flex items-center gap-1.5 mt-1.5', isPositive ? 'text-gain' : 'text-loss')}>
          <div className={cn('flex items-center justify-center h-5 w-5 rounded-full', isPositive ? 'bg-gain/15' : 'bg-loss/15')}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          </div>
          <span className="text-sm font-mono font-medium">
            {isPositive ? '+' : ''}{index.change.toFixed(2)}
          </span>
          <span className="text-sm font-mono text-muted-foreground">
            ({isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
