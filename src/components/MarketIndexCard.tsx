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
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-7 w-28 mb-1" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = index.change >= 0;

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground font-medium">{index.name}</p>
        <p className="text-2xl font-bold font-mono mt-1">
          {index.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className={cn('flex items-center gap-1.5 mt-1', isPositive ? 'text-gain' : 'text-loss')}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span className="text-sm font-mono font-medium">
            {isPositive ? '+' : ''}{index.change.toFixed(2)}
          </span>
          <span className="text-sm font-mono">
            ({isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
