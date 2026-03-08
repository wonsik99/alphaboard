import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useStockSearch } from '@/hooks/useStockData';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface StockSearchProps {
  onSelect: (symbol: string, name: string) => void;
  className?: string;
}

export function StockSearch({ onSelect, className }: StockSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isLoading } = useStockSearch(debouncedQuery);

  // Close on outside click
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
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {isLoading && debouncedQuery && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        <Input
          placeholder="종목 검색 (예: AAPL, Tesla)"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          className="pl-9 pr-9 bg-secondary border-border h-9 text-sm"
        />
      </div>

      {open && debouncedQuery && results && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[280px] bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => handleSelect(r.symbol, r.name)}
              className="w-full text-left px-3 py-2.5 hover:bg-secondary/60 transition-colors flex items-center justify-between gap-2 border-b border-border/50 last:border-0"
            >
              <div className="min-w-0">
                <span className="font-mono font-semibold text-sm text-foreground">{r.symbol}</span>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{r.name}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 bg-secondary px-1.5 py-0.5 rounded">
                {r.region}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && debouncedQuery && !isLoading && results && results.length === 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl p-3 text-center text-sm text-muted-foreground">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
}
