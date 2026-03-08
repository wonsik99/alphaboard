import { BarChart3, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';

export function DashboardHeader() {
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">StockPulse</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            {t('subtitle')}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === 'ko' ? 'EN' : '한국어'}
          </Button>
        </div>
      </div>
    </header>
  );
}
