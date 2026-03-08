import { BarChart3 } from 'lucide-react';

export function DashboardHeader() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">StockPulse</h1>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          US Market Dashboard · Real-time Data
        </p>
      </div>
    </header>
  );
}
