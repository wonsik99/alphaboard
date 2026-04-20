import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useBatchQuotes } from '@/hooks/useStockData';
import { useBatchNewsAnalysis } from '@/hooks/useNewsAnalysis';
import { useI18n } from '@/hooks/useI18n';
import { StockSearch } from '@/components/StockSearch';
import { StockChatbot } from '@/components/StockChatbot';
import { cn } from '@/lib/utils';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  Briefcase,
  DollarSign,
  BarChart3,
  Brain,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';
import type { PortfolioHolding } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type AddHoldingResult = { error: Error | null };

function AddHoldingDialog({
  onAdd,
}: {
  onAdd: (h: Omit<PortfolioHolding, 'id'>) => Promise<AddHoldingResult>;
}) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setSymbol('');
    setName('');
    setPrice('');
    setQty('');
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !price || !qty || submitting) return;
    setSubmitting(true);
    const { error } = await onAdd({
      symbol: symbol.toUpperCase(),
      name: name || symbol.toUpperCase(),
      purchasePrice: parseFloat(price),
      quantity: parseFloat(qty),
      purchasedAt: date,
      notes: notes || null,
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: locale === 'ko' ? '저장 실패' : 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2">
          <Plus className="h-4 w-4" />
          {t('addHolding')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t('addHolding')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('symbol')}</Label>
            <StockSearch
              onSelect={(sym, n) => {
                setSymbol(sym);
                setName(n);
              }}
              className="w-full"
            />
            {symbol && (
              <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                <div>
                  <span className="font-semibold text-sm">{symbol}</span>
                  <span className="text-xs text-muted-foreground ml-2">{name}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setSymbol(''); setName(''); }}>
                  {t('cancel')}
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('purchasePrice')} ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="150.00"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('quantity')}</Label>
              <Input
                type="number"
                step="1"
                min="1"
                required
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="1"
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('purchaseDate')}</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('notes')}</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional"
              className="rounded-xl"
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-xl"
            disabled={!symbol || !price || !qty || submitting}
          >
            {t('save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditHoldingDialog({
  holding,
  onSave,
}: {
  holding: PortfolioHolding;
  onSave: (
    id: string,
    updates: Partial<Omit<PortfolioHolding, 'id'>>,
  ) => Promise<AddHoldingResult>;
}) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(holding.purchasePrice));
  const [qty, setQty] = useState(String(holding.quantity));
  const [date, setDate] = useState(holding.purchasedAt);
  const [notes, setNotes] = useState(holding.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const { error } = await onSave(holding.id, {
      purchasePrice: parseFloat(price),
      quantity: parseFloat(qty),
      purchasedAt: date,
      notes: notes || null,
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: locale === 'ko' ? '저장 실패' : 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {t('editHolding')} — {holding.symbol}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('purchasePrice')} ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('quantity')}</Label>
              <Input
                type="number"
                step="1"
                min="1"
                required
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('purchaseDate')}</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('notes')}</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
            {t('save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Portfolio() {
  const navigate = useNavigate();
  const { portfolio, symbols, totalInvested, addHolding, updateHolding, removeHolding } =
    usePortfolio();
  const { data: quotes, isLoading: quotesLoading } = useBatchQuotes(symbols);
  const { data: sentimentData } = useBatchNewsAnalysis(symbols);
  const { t, locale } = useI18n();

  const [sortBy, setSortBy] = useState<'gain' | 'value' | 'name'>('value');

  const getQuote = (symbol: string) => quotes?.find(q => q.symbol === symbol);

  const holdingsWithCalc = portfolio.map(h => {
    const quote = getQuote(h.symbol);
    const currentPrice = quote?.price ?? h.purchasePrice;
    const marketValue = currentPrice * h.quantity;
    const costBasis = h.purchasePrice * h.quantity;
    const gain = marketValue - costBasis;
    const gainPct = costBasis > 0 ? (gain / costBasis) * 100 : 0;
    const dayChange = (quote?.change ?? 0) * h.quantity;
    const dayChangePct = quote?.changePercent ?? 0;
    return { ...h, currentPrice, marketValue, costBasis, gain, gainPct, dayChange, dayChangePct };
  });

  const totalCurrentValue = holdingsWithCalc.reduce((s, h) => s + h.marketValue, 0);
  const totalGain = totalCurrentValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const totalDayChange = holdingsWithCalc.reduce((s, h) => s + h.dayChange, 0);
  const isPositive = totalGain >= 0;
  const isDayPositive = totalDayChange >= 0;

  const sortedHoldings = [...holdingsWithCalc].sort((a, b) => {
    if (sortBy === 'gain') return b.gainPct - a.gainPct;
    if (sortBy === 'value') return b.marketValue - a.marketValue;
    return a.symbol.localeCompare(b.symbol);
  });

  const COLORS = ['hsl(210,100%,50%)', 'hsl(152,69%,40%)', 'hsl(40,95%,55%)', 'hsl(280,70%,55%)', 'hsl(0,72%,55%)', 'hsl(180,60%,45%)', 'hsl(320,70%,50%)', 'hsl(60,80%,45%)'];
  const pieData = holdingsWithCalc.map(h => ({
    name: h.symbol,
    value: h.marketValue,
    pct: totalCurrentValue > 0 ? (h.marketValue / totalCurrentValue) * 100 : 0,
  }));

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="animate-enter stagger-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{t('totalValue')}</p>
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              {quotesLoading && portfolio.length > 0 ? (
                <Skeleton className="h-8 w-32 rounded-lg" />
              ) : (
                <p className="text-2xl font-semibold font-mono tracking-tight">
                  ${totalCurrentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {portfolio.length} {t('holdingsSummary')}
              </p>
            </CardContent>
          </Card>
          <Card className="animate-enter stagger-2">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{t('totalInvested')}</p>
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <p className="text-2xl font-semibold font-mono tracking-tight">
                ${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card className={cn("animate-enter stagger-3", isPositive ? 'glow-gain' : 'glow-loss')}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{t('totalGain')}</p>
                {isPositive ? <TrendingUp className="h-3.5 w-3.5 text-gain" /> : <TrendingDown className="h-3.5 w-3.5 text-loss" />}
              </div>
              {quotesLoading && portfolio.length > 0 ? (
                <Skeleton className="h-8 w-28 rounded-lg" />
              ) : (
                <>
                  <p className={cn('text-2xl font-semibold font-mono tracking-tight', isPositive ? 'text-gain' : 'text-loss')}>
                    {isPositive ? '+' : ''}${totalGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={cn('text-xs font-mono mt-1', isPositive ? 'text-gain' : 'text-loss')}>
                    {isPositive ? '+' : ''}{totalGainPercent.toFixed(2)}%
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="animate-enter stagger-4">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{t('dayChange')}</p>
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              {quotesLoading && portfolio.length > 0 ? (
                <Skeleton className="h-8 w-24 rounded-lg" />
              ) : (
                <>
                  <p className={cn('text-2xl font-semibold font-mono tracking-tight', isDayPositive ? 'text-gain' : 'text-loss')}>
                    {isDayPositive ? '+' : ''}${totalDayChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className={cn('flex items-center gap-1 mt-1', isDayPositive ? 'text-gain' : 'text-loss')}>
                    {isDayPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span className="text-xs font-mono">{locale === 'ko' ? '오늘' : 'Today'}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Allocation Chart — only useful with 2+ holdings */}
        {pieData.length > 1 && (
          <Card className="animate-enter stagger-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                </div>
                {t('allocation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-48 h-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="hsl(var(--background))" strokeWidth={2}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          background: 'hsl(var(--glass-bg))',
                          backdropFilter: 'blur(24px)',
                          border: '1px solid hsl(var(--glass-border))',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontFamily: 'JetBrains Mono',
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, t('marketValue')]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium">{d.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{d.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Holdings */}
        <Card className="animate-enter stagger-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                {t('holdingsSummary')}
              </CardTitle>
              <div className="flex items-center gap-2">
                {portfolio.length > 1 && (
                  <div className="flex gap-0.5 bg-muted rounded-full p-0.5">
                    {(['value', 'gain', 'name'] as const).map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant="ghost"
                        className={cn('h-6 px-2.5 text-[10px] rounded-full', sortBy === s && 'bg-background shadow-sm')}
                        onClick={() => setSortBy(s)}
                      >
                        {t(s === 'value' ? 'sortByValue' : s === 'gain' ? 'sortByGain' : 'sortByName')}
                      </Button>
                    ))}
                  </div>
                )}
                <AddHoldingDialog onAdd={addHolding} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {portfolio.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Briefcase className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground">{t('portfolioEmpty1')}</p>
                <p className="text-xs text-muted-foreground">{t('portfolioEmpty2')}</p>
                <AddHoldingDialog onAdd={addHolding} />
              </div>
            ) : (
              <div className="space-y-1">
                {/* Desktop table header */}
                <div className="hidden lg:grid grid-cols-[2fr_1fr_1.2fr_1fr_1fr_1fr_56px] gap-2 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border/50">
                  <span>{t('symbol')}</span>
                  <span className="text-right">{t('currentPrice')}</span>
                  <span className="text-right">{t('marketValue')}</span>
                  <span className="text-right">{t('gainLoss')}</span>
                  <span className="text-right">{t('dayChange')}</span>
                  <span className="text-right">{t('allocation')}</span>
                  <span />
                </div>

                {sortedHoldings.map(h => {
                  const pos = h.gain >= 0;
                  const dayPos = h.dayChange >= 0;
                  const allocPct = totalCurrentValue > 0 ? (h.marketValue / totalCurrentValue) * 100 : 0;

                  const actionButtons = (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <EditHoldingDialog holding={h} onSave={updateHolding} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                            <AlertDialogDescription>{h.symbol} — {h.quantity} {t('shares')}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction className="rounded-xl" onClick={() => removeHolding(h.id)}>{t('deleteHolding')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );

                  return (
                    <div key={h.id} className="[&:not(:last-child)]:lg:border-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/30 lg:border-0">
                      {/* === Mobile card layout === */}
                      <div
                        className="lg:hidden px-3 py-3 rounded-xl hover:bg-secondary/40 transition-all cursor-pointer"
                        onClick={() => navigate(`/stock/${h.symbol}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{h.symbol}</span>
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{h.quantity} {t('shares')}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{h.name}</p>
                          </div>
                          {actionButtons}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground">{t('currentPrice')}</p>
                            {quotesLoading ? (
                              <Skeleton className="h-4 w-14 rounded-full mt-0.5" />
                            ) : (
                              <p className="text-sm font-mono">${h.currentPrice.toFixed(2)}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">{t('marketValue')}</p>
                            <p className="text-sm font-mono">${h.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{t('purchasePrice')}: ${h.purchasePrice.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">{t('gainLoss')}</p>
                            <p className={cn('text-sm font-mono font-medium', pos ? 'text-gain' : 'text-loss')}>
                              {pos ? '+' : ''}{h.gainPct.toFixed(2)}%
                            </p>
                            <p className={cn('text-[10px] font-mono', pos ? 'text-gain' : 'text-loss')}>
                              {pos ? '+' : ''}${h.gain.toFixed(0)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                          <div className="flex items-center gap-1">
                            {dayPos ? <ArrowUpRight className="h-3 w-3 text-gain" /> : <ArrowDownRight className="h-3 w-3 text-loss" />}
                            <span className={cn('text-xs font-mono', dayPos ? 'text-gain' : 'text-loss')}>
                              {dayPos ? '+' : ''}{h.dayChangePct.toFixed(2)}%
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-1">{locale === 'ko' ? '오늘' : 'today'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(allocPct, 100)}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">{allocPct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* === Desktop table row === */}
                      <div
                        className="hidden lg:grid grid-cols-[2fr_1fr_1.2fr_1fr_1fr_1fr_56px] gap-2 items-center px-3 py-3 rounded-xl hover:bg-secondary/40 transition-all duration-200 group cursor-pointer"
                        onClick={() => navigate(`/stock/${h.symbol}`)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{h.symbol}</p>
                            <span className="text-xs text-muted-foreground font-mono">{h.quantity} {t('shares')}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{h.name}</p>
                        </div>

                        <div className="text-right">
                          {quotesLoading ? (
                            <Skeleton className="h-4 w-16 ml-auto rounded-full" />
                          ) : (
                            <p className="text-sm font-mono">${h.currentPrice.toFixed(2)}</p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-mono">${h.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {t('purchasePrice')}: ${h.purchasePrice.toFixed(2)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className={cn('text-sm font-mono font-medium', pos ? 'text-gain' : 'text-loss')}>
                            {pos ? '+' : ''}{h.gainPct.toFixed(2)}%
                          </p>
                          <p className={cn('text-[10px] font-mono', pos ? 'text-gain' : 'text-loss')}>
                            {pos ? '+' : ''}${h.gain.toFixed(2)}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {dayPos ? <ArrowUpRight className="h-3 w-3 text-gain" /> : <ArrowDownRight className="h-3 w-3 text-loss" />}
                            <span className={cn('text-sm font-mono', dayPos ? 'text-gain' : 'text-loss')}>
                              {dayPos ? '+' : ''}{h.dayChangePct.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(allocPct, 100)}%` }} />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-10 text-right">{allocPct.toFixed(1)}%</span>
                          </div>
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          {actionButtons}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        {/* AI Sentiment Summary */}
        {sentimentData && sentimentData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                {t('aiAnalysis')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sentimentData.map(s => {
                const isPos = s.sentimentScore > 0;
                const isNeg = s.sentimentScore < 0;
                return (
                  <div
                    key={s.symbol}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-all cursor-pointer"
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{s.symbol}</span>
                        <span
                          className={cn(
                            'text-xs font-mono px-2 py-0.5 rounded-full',
                            isPos && 'bg-gain/15 text-gain',
                            isNeg && 'bg-loss/15 text-loss',
                            !isPos && !isNeg && 'bg-muted text-muted-foreground',
                          )}
                        >
                          {isPos ? '+' : ''}{s.sentimentScore.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {s.summary}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {s.articleCount} {locale === 'ko' ? '기사' : 'articles'}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </main>
      <StockChatbot />
    </div>
  );
}
