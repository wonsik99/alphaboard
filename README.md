# AlphaBoard

US stock dashboard built with Vite, React, TypeScript, Tailwind CSS, shadcn-ui, and Supabase.

## Local development

Requirements:

- Node.js 18+
- npm

Run locally:

```sh
npm install
npm run dev
```

The app starts on [http://localhost:8080](http://localhost:8080).

## Environment variables

Create a `.env` file with:

```sh
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id
```

## Supabase requirements

This project depends on Supabase Auth, database tables, and Edge Functions.

Required Edge Function secrets:

- `FINNHUB_API_KEY`
- `ALPHA_VANTAGE_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, defaults to `gpt-4.1-mini`)

This project is fully standalone.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm test`
