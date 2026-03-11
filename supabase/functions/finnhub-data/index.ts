import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FINNHUB_KEY = Deno.env.get('FINNHUB_API_KEY') || '';
const ALPHA_VANTAGE_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY') || 'demo';
const BASE_URL = 'https://finnhub.io/api/v1';
const AV_BASE_URL = 'https://www.alphavantage.co/query';

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

function timeSeriesConfig(range: string) {
  switch (range) {
    case '1D':
      return { fn: 'TIME_SERIES_INTRADAY', interval: '15min', limit: 26, intraday: true };
    case '1W':
      return { fn: 'TIME_SERIES_INTRADAY', interval: '60min', limit: 35, intraday: true };
    case '1M':
      return { fn: 'TIME_SERIES_DAILY', interval: null, limit: 22, intraday: false };
    case '3M':
      return { fn: 'TIME_SERIES_DAILY', interval: null, limit: 66, intraday: false };
    case '1Y':
      return { fn: 'TIME_SERIES_WEEKLY', interval: null, limit: 52, intraday: false };
    default:
      return { fn: 'TIME_SERIES_DAILY', interval: null, limit: 22, intraday: false };
  }
}

function parseTimeSeries(
  timeSeries: Record<string, Record<string, string>>,
  limit: number,
): ChartPoint[] {
  return Object.entries(timeSeries)
    .slice(0, limit)
    .map(([date, values]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume']),
    }))
    .reverse();
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
    const liveWeeklyPoint: ChartPoint = {
      date: liveDate,
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
        const [q, profile] = await Promise.all([
          fetchFH('/quote', { symbol: sym }),
          fetchFH('/stock/profile2', { symbol: sym }).catch(() => null),
        ]);
        result = {
          symbol: sym,
          name: profile?.name || sym,
          price: q.c || 0,
          change: q.d || 0,
          changePercent: q.dp || 0,
          volume: q.v || 0, // Finnhub doesn't have volume in quote, but we try
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
        const { fn, interval, limit, intraday } = timeSeriesConfig(range);

        async function fetchAV(params: Record<string, string>): Promise<Record<string, unknown>> {
          const url = new URL(AV_BASE_URL);
          for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
          const res = await fetch(url.toString());
          const data = await res.json() as Record<string, unknown>;
          if (data['Note'] || data['Information']) {
            console.log('AV rate limited, waiting 12s and retrying...');
            await new Promise(r => setTimeout(r, 12000));
            const res2 = await fetch(url.toString());
            return res2.json() as Promise<Record<string, unknown>>;
          }
          return data;
        }

        const avParams: Record<string, string> = {
          function: fn,
          symbol: sym,
          outputsize: 'compact',
          apikey: ALPHA_VANTAGE_KEY,
        };

        if (interval) {
          avParams.interval = interval;
        }

        const [avData, liveQuote] = await Promise.all([
          fetchAV(avParams),
          fetchFH('/quote', { symbol: sym }).catch(() => null),
        ]);
        const tsKey = Object.keys(avData).find(k => k.includes('Time Series'));

        let parsed: ChartPoint[] = [];
        if (tsKey) {
          const tsData = avData[tsKey] as Record<string, Record<string, string>>;
          parsed = parseTimeSeries(tsData, limit);

          if (intraday && parsed.length < Math.min(limit, 4)) {
            const fallbackData = await fetchAV({
              function: 'TIME_SERIES_DAILY',
              symbol: sym,
              outputsize: 'compact',
              apikey: ALPHA_VANTAGE_KEY,
            });
            const fallbackKey = Object.keys(fallbackData).find(k => k.includes('Time Series'));
            if (fallbackKey) {
              parsed = parseTimeSeries(
                fallbackData[fallbackKey] as Record<string, Record<string, string>>,
                range === '1D' ? 2 : 5,
              );
            }
          }
        }

        result = reconcileLivePoint(parsed, liveQuote as FinnhubQuoteResponse | null, range, limit);
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
