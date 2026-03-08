import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useStockSearch } from '@/hooks/useStockData';
import { useI18n } from '@/hooks/useI18n';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockSearchProps {
  onSelect: (symbol: string, name: string) => void;
  className?: string;
}

export function StockSearch({ onSelect, className }: StockSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useStockSearch(debouncedQuery);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (symbol: string, name: string) => {
    onSelect(symbol, name);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {isLoading && debouncedQuery && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        <Input
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          className="pl-9 pr-9 glass-subtle border-0 h-9 text-sm rounded-xl"
        />
      </div>

      {open && debouncedQuery && results && results.length > 0 && (
        <div className="absolute z-50 top-full mt-2 w-full min-w-[280px] glass-strong rounded-2xl overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => handleSelect(r.symbol, r.name)}
              className="w-full text-left px-4 py-3 hover:bg-secondary/40 transition-all duration-200 flex items-center justify-between gap-2 border-b border-border/20 last:border-0"
            >
              <div className="min-w-0">
                <span className="font-mono font-semibold text-sm text-foreground">{r.symbol}</span>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{r.name}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 bg-secondary/50 px-2 py-0.5 rounded-full">
                {r.region}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && debouncedQuery && !isLoading && results && results.length === 0 && (
        <div className="absolute z-50 top-full mt-2 w-full glass-strong rounded-2xl p-4 text-center text-sm text-muted-foreground">
          {t('noResults')}
        </div>
      )}
    </div>
  );
}
