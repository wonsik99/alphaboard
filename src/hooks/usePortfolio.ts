import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PortfolioHolding } from '@/lib/types';

const STORAGE_KEY = 'stock-portfolio';

interface DbRow {
  id: string;
  symbol: string;
  name: string;
  purchase_price: number;
  quantity: number;
  purchased_at: string;
  notes: string | null;
}

function toHolding(row: DbRow): PortfolioHolding {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    purchasePrice: row.purchase_price,
    quantity: row.quantity,
    purchasedAt: row.purchased_at,
    notes: row.notes,
  };
}

function loadLocal(): PortfolioHolding[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocal(holdings: PortfolioHolding[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
}

export function usePortfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>(loadLocal);
  const [loading, setLoading] = useState(false);

  // Load from DB when logged in
  useEffect(() => {
    if (!user) {
      setPortfolio(loadLocal());
      return;
    }
    setLoading(true);
    supabase
      .from('portfolios')
      .select('id, symbol, name, purchase_price, quantity, purchased_at, notes')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setPortfolio(data.map(toHolding));
        } else if (!error && data && data.length === 0) {
          // First login: migrate localStorage to DB
          const local = loadLocal();
          if (local.length > 0) {
            const rows = local.map(h => ({
              user_id: user.id,
              symbol: h.symbol,
              name: h.name,
              purchase_price: h.purchasePrice,
              quantity: h.quantity,
              purchased_at: h.purchasedAt,
              notes: h.notes || null,
            }));
            supabase.from('portfolios').insert(rows).then(({ data: inserted }) => {
              if (inserted) {
                setPortfolio(inserted.map(toHolding));
              }
            });
          }
        }
        setLoading(false);
      });
  }, [user]);

  const addHolding = useCallback(
    async (holding: Omit<PortfolioHolding, 'id'>): Promise<{ error: Error | null }> => {
      if (user) {
        const { data, error } = await supabase
          .from('portfolios')
          .insert({
            user_id: user.id,
            symbol: holding.symbol,
            name: holding.name,
            purchase_price: holding.purchasePrice,
            quantity: holding.quantity,
            purchased_at: holding.purchasedAt,
            notes: holding.notes || null,
          })
          .select('id, symbol, name, purchase_price, quantity, purchased_at, notes')
          .single();
        if (error) {
          console.error('Failed to add holding:', error);
          return { error: new Error(error.message) };
        }
        if (data) {
          setPortfolio(prev => [...prev, toHolding(data)]);
        }
        return { error: null };
      }

      const newHolding: PortfolioHolding = {
        ...holding,
        id: crypto.randomUUID(),
      };
      setPortfolio(prev => {
        const next = [...prev, newHolding];
        saveLocal(next);
        return next;
      });
      return { error: null };
    },
    [user],
  );

  const updateHolding = useCallback(
    async (
      id: string,
      updates: Partial<Omit<PortfolioHolding, 'id'>>,
    ): Promise<{ error: Error | null }> => {
      if (user) {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.symbol !== undefined) dbUpdates.symbol = updates.symbol;
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.purchasedAt !== undefined) dbUpdates.purchased_at = updates.purchasedAt;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

        const { error } = await supabase
          .from('portfolios')
          .update(dbUpdates)
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) {
          console.error('Failed to update holding:', error);
          return { error: new Error(error.message) };
        }
      }

      setPortfolio(prev => {
        const next = prev.map(h => (h.id === id ? { ...h, ...updates } : h));
        if (!user) saveLocal(next);
        return next;
      });
      return { error: null };
    },
    [user],
  );

  const removeHolding = useCallback(
    async (id: string) => {
      if (user) {
        await supabase.from('portfolios').delete().eq('id', id).eq('user_id', user.id);
      }

      setPortfolio(prev => {
        const next = prev.filter(h => h.id !== id);
        if (!user) saveLocal(next);
        return next;
      });
    },
    [user],
  );

  const symbols = [...new Set(portfolio.map(h => h.symbol))];

  const totalInvested = portfolio.reduce((sum, h) => sum + h.purchasePrice * h.quantity, 0);

  return {
    portfolio,
    symbols,
    totalInvested,
    loading,
    addHolding,
    updateHolding,
    removeHolding,
  };
}
