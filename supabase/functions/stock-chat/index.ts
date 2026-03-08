import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';
const FINNHUB_KEY = Deno.env.get('FINNHUB_API_KEY') || '';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// Tool definitions for the AI agent
const tools = [
  {
    type: "function",
    function: {
      name: "get_stock_quote",
      description: "Get current stock quote (price, change, high, low, volume) for a given symbol.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Stock ticker symbol, e.g. AAPL, TSLA" }
        },
        required: ["symbol"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_stock",
      description: "Search for stocks by name or ticker symbol.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords" }
        },
        required: ["query"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_company_news",
      description: "Get recent news articles for a specific company.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Stock ticker symbol" }
        },
        required: ["symbol"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "manage_watchlist",
      description: "Add or remove a stock from the user's watchlist. Returns an instruction for the frontend to execute.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "remove"], description: "Whether to add or remove" },
          symbol: { type: "string", description: "Stock ticker symbol" },
          name: { type: "string", description: "Company name" }
        },
        required: ["action", "symbol"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compare_stocks",
      description: "Compare quotes for multiple stocks side by side.",
      parameters: {
        type: "object",
        properties: {
          symbols: { type: "array", items: { type: "string" }, description: "Array of stock ticker symbols to compare" }
        },
        required: ["symbols"],
        additionalProperties: false,
      }
    }
  }
];

async function fetchFinnhub(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${FINNHUB_BASE}${path}`);
  url.searchParams.set('token', FINNHUB_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  return res.json();
}

// Execute tool calls
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'get_stock_quote': {
      const sym = (args.symbol as string).toUpperCase();
      const [q, profile] = await Promise.all([
        fetchFinnhub('/quote', { symbol: sym }),
        fetchFinnhub('/stock/profile2', { symbol: sym }).catch(() => null),
      ]);
      return JSON.stringify({
        symbol: sym,
        name: profile?.name || sym,
        price: q.c, change: q.d, changePercent: q.dp,
        open: q.o, high: q.h, low: q.l, previousClose: q.pc,
      });
    }
    case 'search_stock': {
      const data = await fetchFinnhub('/search', { q: args.query as string });
      const matches = (data.result || []).slice(0, 5);
      return JSON.stringify(matches.map((m: Record<string, string>) => ({
        symbol: m.symbol, name: m.description, type: m.type,
      })));
    }
    case 'get_company_news': {
      const sym = (args.symbol as string).toUpperCase();
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 86400000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const data = await fetchFinnhub('/company-news', { symbol: sym, from: fmt(weekAgo), to: fmt(today) });
      const articles = (Array.isArray(data) ? data : []).slice(0, 5);
      return JSON.stringify(articles.map((a: Record<string, unknown>) => ({
        title: a.headline, source: a.source,
        date: new Date((a.datetime as number) * 1000).toISOString().slice(0, 10),
        summary: (a.summary as string)?.slice(0, 200),
      })));
    }
    case 'manage_watchlist': {
      // Return instruction for frontend to execute
      return JSON.stringify({
        __watchlist_action: true,
        action: args.action,
        symbol: (args.symbol as string).toUpperCase(),
        name: args.name || (args.symbol as string).toUpperCase(),
      });
    }
    case 'compare_stocks': {
      const syms = (args.symbols as string[]).map(s => s.toUpperCase());
      const quotes = await Promise.all(
        syms.map(s => fetchFinnhub('/quote', { symbol: s }).then(q => ({
          symbol: s, price: q.c, change: q.d, changePercent: q.dp,
          open: q.o, high: q.h, low: q.l,
        })).catch(() => ({ symbol: s, error: 'Failed to fetch' })))
      );
      return JSON.stringify(quotes);
    }
    default:
      return JSON.stringify({ error: 'Unknown tool' });
  }
}

const SYSTEM_PROMPT = `You are a helpful US stock market assistant embedded in a stock dashboard app. You can look up real-time stock quotes, search for stocks, get company news, manage the user's watchlist, and compare stocks.

Rules:
- Always use tools to get real data. Never make up stock prices.
- Respond in the same language as the user (Korean or English).
- When showing stock data, format it nicely with markdown tables or lists.
- For watchlist management, always confirm the action to the user.
- Include a disclaimer that this is not investment advice when giving opinions.
- Be concise but informative.
- Use emoji sparingly for visual clarity (📈📉⚠️).`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, watchlist } = await req.json();
    
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Build context-aware system message
    const watchlistContext = watchlist?.length > 0
      ? `\n\nUser's current watchlist: ${watchlist.map((w: { symbol: string; name: string }) => `${w.symbol} (${w.name})`).join(', ')}`
      : '\n\nUser has no stocks in their watchlist.';

    const systemMessage = { role: 'system', content: SYSTEM_PROMPT + watchlistContext };

    // Initial AI call with tools
    let aiMessages = [systemMessage, ...messages];
    let maxIterations = 5; // Prevent infinite loops

    while (maxIterations > 0) {
      maxIterations--;
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: aiMessages,
          tools,
          stream: false,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const text = await response.text();
        console.error('AI gateway error:', status, text);
        
        if (status === 429) {
          return new Response(JSON.stringify({ error: 'rate_limit', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: 'payment_required', message: 'AI 크레딧이 부족합니다.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI error: ${status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      
      if (!choice) throw new Error('No response from AI');

      const assistantMessage = choice.message;
      aiMessages.push(assistantMessage);

      // Check if AI wants to call tools
      if (assistantMessage.tool_calls?.length > 0) {
        const toolResults = await Promise.all(
          assistantMessage.tool_calls.map(async (tc: { id: string; function: { name: string; arguments: string } }) => {
            const args = JSON.parse(tc.function.arguments);
            console.log(`Tool call: ${tc.function.name}`, args);
            const result = await executeTool(tc.function.name, args);
            return {
              role: 'tool',
              tool_call_id: tc.id,
              content: result,
            };
          })
        );
        aiMessages.push(...toolResults);
        
        // Check for watchlist actions in tool results
        const watchlistActions = toolResults
          .map(r => { try { return JSON.parse(r.content); } catch { return null; } })
          .filter(r => r?.__watchlist_action);

        // Continue loop to get AI's response after tool execution
        continue;
      }

      // No tool calls - we have the final response
      // Check if any watchlist actions were triggered
      const allWatchlistActions: unknown[] = [];
      for (const msg of aiMessages) {
        if (msg.role === 'tool') {
          try {
            const parsed = JSON.parse(msg.content);
            if (parsed.__watchlist_action) allWatchlistActions.push(parsed);
          } catch { /* ignore */ }
        }
      }

      return new Response(JSON.stringify({
        content: assistantMessage.content || '',
        watchlistActions: allWatchlistActions,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ content: '처리 중 오류가 발생했습니다. 다시 시도해주세요.', watchlistActions: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('stock-chat error:', message);
    return new Response(JSON.stringify({ error: 'server_error', message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
