import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALPHA_VANTAGE_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY') || 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';

interface RequestBody {
  action: string;
  symbol?: string;
  symbols?: string[];
  range?: string;
}

async function fetchAV(params: Record<string, string>) {
  const url = new URL(BASE_URL);
  url.searchParams.set('apikey', ALPHA_VANTAGE_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  return res.json();
}

function parseQuote(data: Record<string, unknown>) {
  const q = data['Global Quote'] as Record<string, string> | undefined;
  if (!q) return null;
  return {
    symbol: q['01. symbol'],
    name: q['01. symbol'],
    price: parseFloat(q['05. price']),
    change: parseFloat(q['09. change']),
    changePercent: parseFloat(q['10. change percent']?.replace('%', '') || '0'),
    volume: parseInt(q['06. volume']),
    high: parseFloat(q['03. high']),
    low: parseFloat(q['04. low']),
    open: parseFloat(q['02. open']),
    previousClose: parseFloat(q['08. previous close']),
  };
}

function functionForRange(range: string) {
  switch (range) {
    case '1D': return { fn: 'TIME_SERIES_INTRADAY', interval: '5min' };
    case '1W': return { fn: 'TIME_SERIES_INTRADAY', interval: '60min' };
    case '1M': return { fn: 'TIME_SERIES_DAILY', interval: '' };
    case '3M': return { fn: 'TIME_SERIES_DAILY', interval: '' };
    case '1Y': return { fn: 'TIME_SERIES_WEEKLY', interval: '' };
    default: return { fn: 'TIME_SERIES_DAILY', interval: '' };
  }
}

function limitForRange(range: string) {
  switch (range) {
    case '1D': return 78;
    case '1W': return 40;
    case '1M': return 22;
    case '3M': return 66;
    case '1Y': return 52;
    default: return 30;
  }
}

function parseTimeSeries(data: Record<string, unknown>, range: string) {
  const keys = Object.keys(data);
  const tsKey = keys.find(k => k.includes('Time Series'));
  if (!tsKey) return [];
  const ts = data[tsKey] as Record<string, Record<string, string>>;
  const limit = limitForRange(range);
  return Object.entries(ts)
    .slice(0, limit)
    .map(([date, values]) => ({
      date: range === '1D' || range === '1W' ? date.split(' ')[1]?.slice(0, 5) || date : date.slice(5),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume']),
    }))
    .reverse();
}

function parseNews(data: Record<string, unknown>) {
  const feed = (data as { feed?: Array<Record<string, unknown>> }).feed;
  if (!feed) return [];
  return feed.slice(0, 15).map((item) => ({
    title: item.title as string,
    url: item.url as string,
    source: item.source as string,
    publishedAt: (item.time_published as string)?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'),
    summary: item.summary as string,
    sentiment: mapSentiment(item.overall_sentiment_label as string),
    tickers: ((item.ticker_sentiment as Array<{ ticker: string }>) || []).map(t => t.ticker).slice(0, 5),
  }));
}

function mapSentiment(label: string): string {
  if (!label) return 'neutral';
  const l = label.toLowerCase();
  if (l.includes('bullish') || l.includes('positive')) return 'bullish';
  if (l.includes('bearish') || l.includes('negative')) return 'bearish';
  return 'neutral';
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
        const symbols = ['SPY', 'QQQ', 'DIA'];
        const names: Record<string, string> = { SPY: 'S&P 500', QQQ: 'NASDAQ 100', DIA: 'DOW JONES' };
        const promises = symbols.map(s => fetchAV({ function: 'GLOBAL_QUOTE', symbol: s }));
        const results = await Promise.all(promises);
        result = results.map((d, i) => {
          const q = parseQuote(d);
          return q ? { ...q, name: names[symbols[i]] } : { symbol: symbols[i], name: names[symbols[i]], price: 0, change: 0, changePercent: 0 };
        });
        break;
      }
      case 'quote': {
        const data = await fetchAV({ function: 'GLOBAL_QUOTE', symbol: body.symbol! });
        result = parseQuote(data) || { symbol: body.symbol, name: body.symbol, price: 0, change: 0, changePercent: 0, volume: 0, high: 0, low: 0, open: 0, previousClose: 0 };
        break;
      }
      case 'timeseries': {
        const { fn, interval } = functionForRange(body.range || '1M');
        const params: Record<string, string> = { function: fn, symbol: body.symbol!, outputsize: 'compact' };
        if (interval) params.interval = interval;
        const data = await fetchAV(params);
        result = parseTimeSeries(data, body.range || '1M');
        break;
      }
      case 'news': {
        const data = await fetchAV({ function: 'NEWS_SENTIMENT', topics: 'technology,finance', sort: 'LATEST' });
        result = parseNews(data);
        break;
      }
      case 'batch': {
        const symbols = body.symbols || [];
        const promises = symbols.map(s => fetchAV({ function: 'GLOBAL_QUOTE', symbol: s }));
        const results = await Promise.all(promises);
        result = results.map((d, i) => {
          const q = parseQuote(d);
          return q || { symbol: symbols[i], name: symbols[i], price: 0, change: 0, changePercent: 0, volume: 0, high: 0, low: 0, open: 0, previousClose: 0 };
        });
        break;
      }
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Edge function error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
