import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StockSearch } from '@/components/StockSearch';
import { useBatchQuotes } from '@/hooks/useStockData';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { X, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Watchlist() {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const symbols = watchlist.map(w => w.symbol);
  const { data: quotes, isLoading } = useBatchQuotes(symbols);
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
              <Star className="h-3.5 w-3.5 text-accent" />
            </div>
            {t('watchlist')}
          </CardTitle>
        </div>
        <div className="mt-2">
          <StockSearch
            onSelect={(symbol, name) => addToWatchlist({ symbol, name })}
            className="w-full"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-0.5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          ))
        ) : watchlist.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('emptyWatchlist')}</p>
        ) : (
          watchlist.map((item, idx) => {
            const quote = quotes?.find(q => q.symbol === item.symbol);
            const isPositive = quote ? quote.change >= 0 : true;
            return (
              <div
                key={item.symbol}
                className={cn(
                  "flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-secondary/40 cursor-pointer transition-all duration-200 group animate-enter-fast",
                  idx < 8 && `stagger-${idx + 1}`
                )}
                onClick={() => navigate(`/stock/${item.symbol}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      isPositive ? 'bg-gain' : 'bg-loss',
                    )} />
                    <p className="font-semibold text-sm">{item.symbol}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate ml-3">{item.name || quote?.name}</p>
                </div>
                <div className="text-right mx-2">
                  {quote ? (
                    <>
                      <p className="text-sm font-mono font-medium">${quote.price.toFixed(2)}</p>
                      <p className={cn('text-[11px] font-mono flex items-center justify-end gap-0.5', isPositive ? 'text-gain' : 'text-loss')}>
                        {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
                      </p>
                    </>
                  ) : (
                    <Skeleton className="h-4 w-16 rounded-full" />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.symbol); }}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
