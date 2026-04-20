import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FINNHUB_KEY = Deno.env.get('FINNHUB_API_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

interface Article {
  headline: string;
  source: string;
  url: string;
  summary: string;
  datetime: number;
}

interface AnalysisResult {
  symbol: string;
  summary: string;
  sentimentScore: number;
  articleCount: number;
  articles: {
    title: string;
    source: string;
    url: string;
    summary: string;
    publishedAt: string;
    sentiment: string;
    sentimentScore: number;
  }[];
}

async function fetchFinnhubNews(symbol: string): Promise<Article[]> {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const url = new URL(`${FINNHUB_BASE}/company-news`);
  url.searchParams.set('token', FINNHUB_KEY);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('from', fmt(weekAgo));
  url.searchParams.set('to', fmt(today));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.slice(0, 15) : [];
}

async function analyzeWithAI(symbol: string, articles: Article[]): Promise<{
  overallSummary: string;
  overallScore: number;
  articleAnalysis: { index: number; sentiment: string; score: number }[];
}> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const articleList = articles
    .map((a, i) => `[${i}] "${a.headline}" — ${a.summary?.slice(0, 200) || 'No summary'}`)
    .join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a financial news analyst. Analyze news articles for a given stock and provide:
1. An overall summary (2-3 sentences) of the key themes and events
2. An overall sentiment score from -1.0 (very bearish) to +1.0 (very bullish)
3. Individual sentiment for each article

Respond in JSON format:
{
  "overallSummary": "...",
  "overallScore": 0.0,
  "articleAnalysis": [
    { "index": 0, "sentiment": "bullish|bearish|neutral", "score": 0.0 }
  ]
}

Be precise with scores. Use the full range: -1.0 for extremely negative, +1.0 for extremely positive.
Respond in the same language as the majority of the articles (English or Korean).`,
        },
        {
          role: 'user',
          content: `Analyze these ${articles.length} recent news articles for ${symbol}:\n\n${articleList}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function saveSentimentRecord(symbol: string, score: number, articleCount: number, summary: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  const today = new Date().toISOString().slice(0, 10);

  await fetch(`${SUPABASE_URL}/rest/v1/sentiment_records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      symbol,
      score,
      article_count: articleCount,
      summary,
      recorded_at: today,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, symbol, symbols } = await req.json();

    if (action === 'analyze' && symbol) {
      // Single symbol analysis
      const articles = await fetchFinnhubNews(symbol);
      if (articles.length === 0) {
        const emptyResult: AnalysisResult = {
          symbol,
          summary: 'No recent news articles found.',
          sentimentScore: 0,
          articleCount: 0,
          articles: [],
        };
        return new Response(JSON.stringify(emptyResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const ai = await analyzeWithAI(symbol, articles);

      // Save to DB
      await saveSentimentRecord(symbol, ai.overallScore, articles.length, ai.overallSummary);

      const result: AnalysisResult = {
        symbol,
        summary: ai.overallSummary,
        sentimentScore: ai.overallScore,
        articleCount: articles.length,
        articles: articles.map((a, i) => {
          const analysis = ai.articleAnalysis.find(aa => aa.index === i);
          return {
            title: a.headline,
            source: a.source,
            url: a.url,
            summary: a.summary?.slice(0, 300) || '',
            publishedAt: new Date(a.datetime * 1000).toISOString(),
            sentiment: analysis?.sentiment || 'neutral',
            sentimentScore: analysis?.score ?? 0,
          };
        }),
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'batch-analyze' && symbols?.length) {
      // Analyze multiple symbols (limit to 5 to avoid rate limits)
      const targetSymbols = (symbols as string[]).slice(0, 5);
      const results = await Promise.all(
        targetSymbols.map(async (sym: string) => {
          try {
            const articles = await fetchFinnhubNews(sym);
            if (articles.length === 0) {
              return { symbol: sym, summary: 'No recent news.', sentimentScore: 0, articleCount: 0 };
            }
            const ai = await analyzeWithAI(sym, articles);
            await saveSentimentRecord(sym, ai.overallScore, articles.length, ai.overallSummary);
            return {
              symbol: sym,
              summary: ai.overallSummary,
              sentimentScore: ai.overallScore,
              articleCount: articles.length,
            };
          } catch {
            return { symbol: sym, summary: 'Analysis failed.', sentimentScore: 0, articleCount: 0 };
          }
        }),
      );

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'history' && symbol) {
      // Fetch sentiment history from DB
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const url = `${SUPABASE_URL}/rest/v1/sentiment_records?symbol=eq.${encodeURIComponent(symbol)}&order=recorded_at.asc&limit=30`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      const data = await res.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('news-analysis error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
