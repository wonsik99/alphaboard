import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { WatchlistItem } from '@/lib/types';

const STORAGE_KEY = 'stock-watchlist';
const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
];

function loadLocalWatchlist(): WatchlistItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

export function useWatchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(loadLocalWatchlist);
  const [loading, setLoading] = useState(false);

  // Load from DB when logged in
  useEffect(() => {
    if (!user) {
      setWatchlist(loadLocalWatchlist());
      return;
    }
    setLoading(true);
    supabase
      .from('watchlists')
      .select('symbol, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setWatchlist(data);
        } else if (!error && data && data.length === 0) {
          // First login: migrate localStorage to DB
          const local = loadLocalWatchlist();
          if (local.length > 0) {
            const rows = local.map(w => ({ user_id: user.id, symbol: w.symbol, name: w.name }));
            supabase.from('watchlists').insert(rows).then(() => {
              setWatchlist(local);
            });
          }
        }
        setLoading(false);
      });
  }, [user]);

  const addToWatchlist = useCallback((item: WatchlistItem) => {
    setWatchlist(prev => {
      if (prev.some(w => w.symbol === item.symbol)) return prev;
      const next = [...prev, item];

      if (user) {
        supabase.from('watchlists').insert({ user_id: user.id, symbol: item.symbol, name: item.name });
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, [user]);

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => {
      const next = prev.filter(w => w.symbol !== symbol);

      if (user) {
        supabase.from('watchlists').delete().eq('user_id', user.id).eq('symbol', symbol).then();
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, [user]);

  const isInWatchlist = useCallback((symbol: string) => {
    return watchlist.some(w => w.symbol === symbol);
  }, [watchlist]);

  return { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, loading };
}
