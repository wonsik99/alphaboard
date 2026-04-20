import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FINNHUB_KEY = Deno.env.get('FINNHUB_API_KEY') || '';
const BASE_URL = 'https://finnhub.io/api/v1';

// Yahoo Finance is picky about User-Agent. Use a realistic desktop browser UA
// so the chart endpoint returns full data instead of 401/429.
const YAHOO_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface RequestBody {
  action: string;
  symbol?: string;
  symbols?: string[];
  range?: string;
  keywords?: string;
}

interface ChartPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FinnhubQuoteResponse {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
}

async function fetchFH(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('token', FINNHUB_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);
  return res.json();
}

interface RangeConfig {
  yahooRange: string;
  yahooInterval: string;
  limit: number;
  intraday: boolean;
}

function rangeConfig(range: string): RangeConfig {
  switch (range) {
    case '1D':
      // 6.5h trading day, 5-min bars -> 78 points
      return { yahooRange: '1d', yahooInterval: '5m', limit: 78, intraday: true };
    case '1W':
      // 5 trading days, 30-min bars -> ~65 points
      return { yahooRange: '5d', yahooInterval: '30m', limit: 65, intraday: true };
    case '1M':
      return { yahooRange: '1mo', yahooInterval: '1d', limit: 22, intraday: false };
    case '3M':
      return { yahooRange: '3mo', yahooInterval: '1d', limit: 66, intraday: false };
    case '1Y':
      // Weekly bars keep the chart readable (52 points instead of ~252)
      return { yahooRange: '1y', yahooInterval: '1wk', limit: 52, intraday: false };
    default:
      return { yahooRange: '1mo', yahooInterval: '1d', limit: 22, intraday: false };
  }
}

async function fetchYahooChart(
  symbol: string,
  yahooRange: string,
  yahooInterval: string,
): Promise<ChartPoint[]> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${yahooRange}&interval=${yahooInterval}&includePrePost=false`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': YAHOO_UA,
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result?.timestamp?.length) return [];

  const ts: number[] = result.timestamp;
  const q = result.indicators?.quote?.[0] || {};
  const isIntraday = /[mh]/.test(yahooInterval); // 5m, 15m, 30m, 60m, 1h, ...

  return ts
    .map((t: number, i: number): ChartPoint => ({
      date: formatInNewYork(t, isIntraday),
      open: q.open?.[i] ?? 0,
      high: q.high?.[i] ?? 0,
      low: q.low?.[i] ?? 0,
      close: q.close?.[i] ?? 0,
      volume: q.volume?.[i] ?? 0,
    }))
    .filter((p: ChartPoint) => p.close > 0);
}

/**
 * Fetch intraday candles with a weekend/holiday fallback.
 * When `range=1d` is requested outside regular trading days, Yahoo can return
 * zero candles. In that case we fetch the last 5 days and keep only the most
 * recent trading day so the chart is never empty.
 */
async function fetchIntraday(symbol: string, config: RangeConfig): Promise<ChartPoint[]> {
  let candles = await fetchYahooChart(symbol, config.yahooRange, config.yahooInterval);

  if (candles.length === 0 && config.yahooRange === '1d') {
    const fallback = await fetchYahooChart(symbol, '5d', config.yahooInterval);
    if (fallback.length > 0) {
      const lastTradingDay = fallback[fallback.length - 1].date.slice(0, 10);
      candles = fallback.filter((c) => c.date.startsWith(lastTradingDay));
    }
  }

  return candles.slice(-config.limit);
}

function formatInNewYork(unixSeconds: number, intraday: boolean) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(intraday
      ? {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23' as const,
        }
      : {}),
  }).formatToParts(new Date(unixSeconds * 1000));

  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const date = `${get('year')}-${get('month')}-${get('day')}`;

  if (!intraday) return date;

  return `${date} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function reconcileLivePoint(
  points: ChartPoint[],
  quote: FinnhubQuoteResponse | null,
  range: string,
  limit: number,
): ChartPoint[] {
  if (!points.length || !quote?.c || !quote.t) return points;

  const lastPoint = points[points.length - 1];
  const liveDate = formatInNewYork(quote.t, range === '1D' || range === '1W');

  if (range === '1Y') {
    // Keep the weekly bar's original date so spacing on the X-axis stays even.
    // Only the OHLC values are updated with the live quote.
    const liveWeeklyPoint: ChartPoint = {
      date: lastPoint.date,
      open: lastPoint.open,
      high: quote.h ? Math.max(lastPoint.high, quote.h) : Math.max(lastPoint.high, quote.c),
      low: quote.l ? Math.min(lastPoint.low, quote.l) : Math.min(lastPoint.low, quote.c),
      close: quote.c,
      volume: lastPoint.volume,
    };

    return [...points.slice(0, -1), liveWeeklyPoint];
  }

  if (range === '1D' || range === '1W') {
    if (lastPoint.date === liveDate) {
      const liveIntradayPoint: ChartPoint = {
        ...lastPoint,
        date: liveDate,
        high: Math.max(lastPoint.high, quote.c),
        low: Math.min(lastPoint.low, quote.c),
        close: quote.c,
      };

      return [...points.slice(0, -1), liveIntradayPoint];
    }

    const syntheticIntradayPoint: ChartPoint = {
      date: liveDate,
      open: lastPoint.close,
      high: Math.max(lastPoint.close, quote.c),
      low: Math.min(lastPoint.close, quote.c),
      close: quote.c,
      volume: 0,
    };

    if (liveDate > lastPoint.date) {
      return [...points, syntheticIntradayPoint].slice(-limit);
    }

    return points;
  }

  const liveDailyPoint: ChartPoint = {
    date: liveDate,
    open: quote.o || lastPoint.close,
    high: quote.h ? Math.max(quote.h, quote.c) : quote.c,
    low: quote.l ? Math.min(quote.l, quote.c) : quote.c,
    close: quote.c,
    volume: lastPoint.volume,
  };

  if (lastPoint.date === liveDate) {
    return [...points.slice(0, -1), liveDailyPoint];
  }

  if (liveDate > lastPoint.date) {
    return [...points, liveDailyPoint].slice(-limit);
  }

  return points;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { action } = body;
    let result: unknown;

    switch (action) {
      case 'indices': {
        const symbols = [
          { symbol: 'SPY', name: 'S&P 500' },
          { symbol: 'QQQ', name: 'NASDAQ 100' },
          { symbol: 'DIA', name: 'DOW JONES' },
        ];
        const promises = symbols.map(s => fetchFH('/quote', { symbol: s.symbol }));
        const results = await Promise.all(promises);
        result = results.map((q, i) => ({
          symbol: symbols[i].symbol,
          name: symbols[i].name,
          price: q.c || 0,
          change: q.d || 0,
          changePercent: q.dp || 0,
        }));
        break;
      }

      case 'quote': {
        const sym = body.symbol!;
        // Finnhub `/quote` returns price info but no volume. Pull the latest
        // daily bar from Yahoo to surface a realistic volume number. The
        // 5d/1d range gives us a handful of recent sessions and we pick the
        // most recent one so weekends/holidays still show the last trading
        // day's volume instead of zero.
        const [q, profile, yahooDaily] = await Promise.all([
          fetchFH('/quote', { symbol: sym }),
          fetchFH('/stock/profile2', { symbol: sym }).catch(() => null),
          fetchYahooChart(sym, '5d', '1d').catch(() => [] as ChartPoint[]),
        ]);
        const lastDaily = yahooDaily[yahooDaily.length - 1];
        result = {
          symbol: sym,
          name: profile?.name || sym,
          price: q.c || 0,
          change: q.d || 0,
          changePercent: q.dp || 0,
          volume: lastDaily?.volume || 0,
          high: q.h || 0,
          low: q.l || 0,
          open: q.o || 0,
          previousClose: q.pc || 0,
        };
        break;
      }

      case 'timeseries': {
        const sym = body.symbol!;
        const range = body.range || '1M';
        const config = rangeConfig(range);

        const [rawPoints, liveQuote] = await Promise.all([
          config.intraday
            ? fetchIntraday(sym, config)
            : fetchYahooChart(sym, config.yahooRange, config.yahooInterval).then((pts) =>
                pts.slice(-config.limit),
              ),
          fetchFH('/quote', { symbol: sym }).catch(() => null),
        ]);

        if (rawPoints.length === 0) {
          // Yahoo failed AND intraday fallback found nothing. Surface an
          // explicit error so the client can show a proper message instead of
          // silently rendering an empty chart.
          return new Response(
            JSON.stringify({ error: 'no-data', message: `No chart data for ${sym}` }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        result = reconcileLivePoint(
          rawPoints,
          liveQuote as FinnhubQuoteResponse | null,
          range,
          config.limit,
        );
        break;
      }

      case 'news': {
        const category = body.symbol ? undefined : 'general';
        
        if (body.symbol) {
          // Company-specific news
          const today = new Date();
          const monthAgo = new Date(today.getTime() - 30 * 86400000);
          const fmt = (d: Date) => d.toISOString().slice(0, 10);
          const data = await fetchFH('/company-news', { 
            symbol: body.symbol, 
            from: fmt(monthAgo), 
            to: fmt(today) 
          });
          const articles = Array.isArray(data) ? data : [];
          result = articles.slice(0, 20).map((item: Record<string, unknown>) => ({
            title: item.headline as string,
            url: item.url as string,
            source: item.source as string,
            publishedAt: new Date((item.datetime as number) * 1000).toISOString(),
            summary: item.summary as string,
            sentiment: 'neutral',
            tickers: [body.symbol!],
          }));
        } else {
          // General market news
          const data = await fetchFH('/news', { category: 'general', minId: '0' });
          const articles = Array.isArray(data) ? data : [];
          result = articles.slice(0, 15).map((item: Record<string, unknown>) => ({
            title: item.headline as string,
            url: item.url as string,
            source: item.source as string,
            publishedAt: new Date((item.datetime as number) * 1000).toISOString(),
            summary: item.summary as string,
            sentiment: 'neutral',
            tickers: ((item.related as string) || '').split(',').filter(Boolean).slice(0, 5),
          }));
        }
        break;
      }

      case 'batch': {
        const symbols = body.symbols || [];
        const promises = symbols.map(s =>
          fetchFH('/quote', { symbol: s }).then(q => ({
            symbol: s,
            name: s,
            price: q.c || 0,
            change: q.d || 0,
            changePercent: q.dp || 0,
            volume: q.v || 0,
            high: q.h || 0,
            low: q.l || 0,
            open: q.o || 0,
            previousClose: q.pc || 0,
          })).catch(() => ({
            symbol: s, name: s, price: 0, change: 0, changePercent: 0,
            volume: 0, high: 0, low: 0, open: 0, previousClose: 0,
          }))
        );
        result = await Promise.all(promises);
        break;
      }

      case 'search': {
        const keywords = (body.keywords || '').trim();
        if (!keywords) { result = []; break; }
        const data = await fetchFH('/search', { q: keywords });
        const matches = data.result || [];
        result = matches.slice(0, 8).map((m: Record<string, string>) => ({
          symbol: m.symbol,
          name: m.description,
          type: m.type,
          region: m.displaySymbol,
        }));
        break;
      }

      case 'watchlist-news': {
        const symbols = body.symbols || [];
        if (symbols.length === 0) { result = []; break; }
        
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 86400000);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        
        // Fetch company news for up to 5 symbols (to avoid rate limits)
        const targetSymbols = symbols.slice(0, 5);
        const promises = targetSymbols.map((sym: string) =>
          fetchFH('/company-news', { symbol: sym, from: fmt(weekAgo), to: fmt(today) })
            .then((data: unknown) => {
              const articles = Array.isArray(data) ? data : [];
              return articles.slice(0, 5).map((item: Record<string, unknown>) => ({
                title: item.headline as string,
                url: item.url as string,
                source: item.source as string,
                publishedAt: new Date((item.datetime as number) * 1000).toISOString(),
                summary: item.summary as string,
                sentiment: 'neutral',
                tickers: [sym],
              }));
            })
            .catch(() => [])
        );
        
        const allNews = (await Promise.all(promises)).flat();
        // Sort by date descending and deduplicate by URL
        const seen = new Set<string>();
        const unique = allNews
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .filter(a => {
            if (seen.has(a.url)) return false;
            seen.add(a.url);
            return true;
          });
        result = unique.slice(0, 15);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Finnhub edge function error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
