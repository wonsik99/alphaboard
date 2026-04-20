# AlphaBoard

Real-time U.S. stock market dashboard with portfolio management and AI-powered analysis.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

## Features

### Dashboard
- **Market Indices** — S&P 500, NASDAQ, DOW JONES live quotes
- **Interactive Charts** — Line & candlestick charts with 1D / 1W / 1M / 3M / 1Y timeframes
- **Stock Search** — Autocomplete search powered by Finnhub symbol lookup
- **Watchlist** — Track favorite stocks with real-time price updates

### Portfolio Management
- **Holdings Tracker** — Add stocks with purchase price, quantity, and date
- **Real-time P&L** — Gain/loss calculated from live market prices
- **Allocation Chart** — Pie chart visualization of portfolio distribution
- **Day Change** — Track daily performance across all holdings

### AI & News
- **AI Chatbot** — Natural language queries about your portfolio and market data (OpenAI Function Calling)
- **News Feed** — Latest market news with sentiment badges (bullish / bearish / neutral)
- **AI Sentiment Analysis** — Automated news sentiment scoring per stock (-1.0 to +1.0)

### General
- **Authentication** — Email/password and Google OAuth via Supabase Auth
- **Dark / Light Mode** — System-aware theme toggle
- **i18n** — Korean and English language support
- **Responsive** — Mobile-first design with desktop table layouts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Recharts |
| Backend | Supabase (Auth, Database, Edge Functions) |
| Market Data | Finnhub (quotes, news, search), Yahoo Finance (intraday charts), Alpha Vantage (daily/weekly charts) |
| AI | OpenAI GPT-4.1-mini with Function Calling |
| State | TanStack React Query, React Context |

## Architecture

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   React App  │────▶│  Supabase Edge Fns   │────▶│  External APIs   │
│  (Vite SPA)  │◀────│  - finnhub-data       │◀────│  - Finnhub       │
│              │     │  - stock-chat         │     │  - Yahoo Finance │
│              │     │  - news-analysis      │     │  - Alpha Vantage │
│              │     │  - stock-data         │     │  - OpenAI        │
└─────────────┘     └──────────────────────┘     └──────────────────┘
       │                      │
       └──────────┬───────────┘
                  ▼
          ┌──────────────┐
          │   Supabase   │
          │  - Auth      │
          │  - PostgreSQL │
          └──────────────┘
```

API keys are kept server-side in Edge Functions — never exposed to the client.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/wonsik99/alphaboard.git
cd alphaboard
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Development

```bash
npm run dev          # Start dev server (localhost:8080)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm test             # Run tests
```

### Supabase Edge Functions

Edge Functions require the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase functions deploy finnhub-data --no-verify-jwt
supabase functions deploy stock-chat --no-verify-jwt
supabase functions deploy news-analysis --no-verify-jwt
```

Edge Function secrets (set via Supabase dashboard or CLI):

| Secret | Description |
|--------|-------------|
| `FINNHUB_API_KEY` | Stock quotes, news, and symbol search |
| `ALPHA_VANTAGE_API_KEY` | Daily/weekly historical chart data |
| `OPENAI_API_KEY` | AI chatbot and sentiment analysis |
| `OPENAI_MODEL` | Optional — defaults to `gpt-4.1-mini` |

## Deployment

Deploy the frontend to **Vercel**:

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Set environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Deploy — Vercel auto-detects Vite and configures the build

## Project Structure

```
src/
├── components/         # UI components
│   ├── ui/             # shadcn/ui primitives
│   ├── StockChart.tsx  # Price chart (line + candlestick)
│   ├── StockSearch.tsx # Autocomplete stock search
│   ├── StockChatbot.tsx# AI chatbot panel
│   ├── Watchlist.tsx   # Watchlist sidebar
│   └── NewsFeed.tsx    # News with sentiment badges
├── hooks/              # Custom React hooks
│   ├── useStockData.ts # Market data queries (React Query)
│   ├── usePortfolio.ts # Portfolio CRUD
│   ├── useWatchlist.ts # Watchlist management
│   ├── useAuth.tsx     # Authentication context
│   ├── useI18n.tsx     # Internationalization (ko/en)
│   └── useTheme.tsx    # Dark/light mode
├── pages/              # Route pages
│   ├── Index.tsx       # Dashboard
│   ├── Portfolio.tsx   # Portfolio management
│   ├── StockDetail.tsx # Individual stock view
│   └── Auth.tsx        # Login / signup
├── integrations/       # Supabase client config
└── lib/                # Utilities, types, chart helpers

supabase/
├── functions/          # Edge Functions (serverless backend)
│   ├── finnhub-data/   # Market data proxy
│   ├── stock-chat/     # AI chatbot (Function Calling)
│   ├── news-analysis/  # AI sentiment analysis
│   └── stock-data/     # Additional data endpoints
└── migrations/         # Database schema
```

## License

MIT
