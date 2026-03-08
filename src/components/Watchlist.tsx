import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useBatchQuotes } from '@/hooks/useStockData';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { X, Plus, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Watchlist() {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const symbols = watchlist.map(w => w.symbol);
  const { data: quotes, isLoading } = useBatchQuotes(symbols);
  const [newSymbol, setNewSymbol] = useState('');
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol.trim()) {
      addToWatchlist({ symbol: newSymbol.trim().toUpperCase(), name: newSymbol.trim().toUpperCase() });
      setNewSymbol('');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
              <Star className="h-4 w-4 text-primary" />
            </div>
            {t('watchlist')}
          </CardTitle>
        </div>
        <form onSubmit={handleAdd} className="flex gap-2 mt-2">
          <Input
            placeholder={t('addStock')}
            value={newSymbol}
            onChange={e => setNewSymbol(e.target.value)}
            className="glass-subtle border-0 text-sm rounded-xl h-9"
          />
          <Button type="submit" size="icon" variant="secondary" className="shrink-0 rounded-xl h-9 w-9 glass-subtle border-0">
            <Plus className="h-4 w-4" />
          </Button>
        </form>
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
          <p className="text-sm text-muted-foreground py-6 text-center">{t('emptyWatchlist')}</p>
        ) : (
          watchlist.map(item => {
            const quote = quotes?.find(q => q.symbol === item.symbol);
            const isPositive = quote ? quote.change >= 0 : true;
            return (
              <div
                key={item.symbol}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-secondary/40 cursor-pointer transition-all duration-200 group"
                onClick={() => navigate(`/stock/${item.symbol}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{item.symbol}</p>
                  <p className="text-xs text-muted-foreground truncate">{quote?.name || item.name}</p>
                </div>
                <div className="text-right mx-2">
                  {quote ? (
                    <>
                      <p className="text-sm font-mono font-medium">${quote.price.toFixed(2)}</p>
                      <p className={cn('text-xs font-mono flex items-center justify-end gap-0.5', isPositive ? 'text-gain' : 'text-loss')}>
                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
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
                  className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.symbol); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
