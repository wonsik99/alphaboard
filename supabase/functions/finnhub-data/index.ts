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

function resolutionForRange(range: string): { resolution: string; fromDays: number } {
  switch (range) {
    case '1D': return { resolution: '5', fromDays: 1 };
    case '1W': return { resolution: '60', fromDays: 7 };
    case '1M': return { resolution: 'D', fromDays: 30 };
    case '3M': return { resolution: 'D', fromDays: 90 };
    case '1Y': return { resolution: 'W', fromDays: 365 };
    default: return { resolution: 'D', fromDays: 30 };
  }
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
        const { resolution, fromDays } = resolutionForRange(range);
        const to = Math.floor(Date.now() / 1000);
        const from = to - fromDays * 86400;
        const data = await fetchFH('/stock/candle', {
          symbol: sym,
          resolution,
          from: String(from),
          to: String(to),
        });

        if (data.s === 'no_data' || !data.t) {
          result = [];
          break;
        }

        result = data.t.map((ts: number, i: number) => {
          const d = new Date(ts * 1000);
          let dateStr: string;
          if (range === '1D' || range === '1W') {
            dateStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          } else {
            dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }
          return {
            date: dateStr,
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
            volume: data.v[i],
          };
        });
        break;
      }

      case 'news': {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 86400000);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
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
