import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { WatchlistItem } from '@/lib/types';

const STORAGE_KEY = 'stock-watchlist';
// Per-user flag that marks "this account has been initialized in Supabase".
// Once set, an empty response from the `watchlists` table is treated as an
// intentional empty state instead of triggering a re-seed from the local
// DEFAULT_WATCHLIST. Without this flag, a user who deletes every entry would
// see the default five stocks reappear on every refresh.
const MIGRATED_KEY_PREFIX = 'stock-watchlist-migrated:';
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

function hasMigrated(userId: string): boolean {
  try {
    return localStorage.getItem(`${MIGRATED_KEY_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

function markMigrated(userId: string) {
  try {
    localStorage.setItem(`${MIGRATED_KEY_PREFIX}${userId}`, '1');
  } catch {
    /* ignore quota errors */
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
        if (error) {
          setLoading(false);
          return;
        }
        if (data && data.length > 0) {
          setWatchlist(data);
          markMigrated(user.id);
          setLoading(false);
          return;
        }
        // DB is empty. If we've already migrated this account once, the user
        // intentionally cleared their list — respect that and show empty.
        if (hasMigrated(user.id)) {
          setWatchlist([]);
          setLoading(false);
          return;
        }
        // First login: migrate any anonymous localStorage entries to the DB.
        const local = loadLocalWatchlist();
        if (local.length > 0) {
          const rows = local.map(w => ({ user_id: user.id, symbol: w.symbol, name: w.name }));
          supabase.from('watchlists').insert(rows).then(() => {
            setWatchlist(local);
            markMigrated(user.id);
            setLoading(false);
          });
        } else {
          setWatchlist([]);
          markMigrated(user.id);
          setLoading(false);
        }
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
