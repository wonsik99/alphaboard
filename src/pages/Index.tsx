import { DashboardHeader } from '@/components/DashboardHeader';
import { MarketIndexCard } from '@/components/MarketIndexCard';
import { StockChart } from '@/components/StockChart';
import { Watchlist } from '@/components/Watchlist';
import { NewsFeed } from '@/components/NewsFeed';
import { useMarketIndices } from '@/hooks/useStockData';
import { useI18n } from '@/hooks/useI18n';

const Index = () => {
  const { data: indices, isLoading: indicesLoading } = useMarketIndices();
  const { t } = useI18n();

  const indexPlaceholders = [
    { symbol: 'SPY', name: 'S&P 500' },
    { symbol: 'QQQ', name: 'NASDAQ' },
    { symbol: 'DIA', name: 'DOW JONES' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('marketIndices')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {indicesLoading
              ? indexPlaceholders.map(p => <MarketIndexCard key={p.symbol} loading />)
              : indices?.map(idx => <MarketIndexCard key={idx.symbol} index={idx} />)
            }
          </div>
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <StockChart />
            <NewsFeed />
          </div>
          <div>
            <Watchlist />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
