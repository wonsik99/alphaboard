import { DashboardHeader } from '@/components/DashboardHeader';
import { MarketIndexCard } from '@/components/MarketIndexCard';
import { StockChart } from '@/components/StockChart';
import { Watchlist } from '@/components/Watchlist';
import { NewsFeed } from '@/components/NewsFeed';
import { StockChatbot } from '@/components/StockChatbot';
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
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3 animate-fade">
            {t('marketIndices')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {indicesLoading
              ? indexPlaceholders.map((p, i) => (
                  <div key={p.symbol} className={`animate-enter stagger-${i + 1}`}>
                    <MarketIndexCard loading />
                  </div>
                ))
              : indices?.map((idx, i) => (
                  <div key={idx.symbol} className={`animate-enter stagger-${i + 1}`}>
                    <MarketIndexCard index={idx} />
                  </div>
                ))
            }
          </div>
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="animate-enter stagger-4">
              <StockChart />
            </div>
            <div className="animate-enter stagger-6">
              <NewsFeed />
            </div>
          </div>
          <div className="animate-enter stagger-5">
            <Watchlist />
          </div>
        </div>
      </main>
      <StockChatbot />
    </div>
  );
};

export default Index;
