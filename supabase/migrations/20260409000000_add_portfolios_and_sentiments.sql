-- Portfolio holdings table
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  purchase_price numeric NOT NULL,
  quantity numeric NOT NULL,
  purchased_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, symbol, purchased_at)
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own portfolio"
  ON public.portfolios FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio"
  ON public.portfolios FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio"
  ON public.portfolios FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio"
  ON public.portfolios FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Sentiment analysis records
CREATE TABLE public.sentiment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  score numeric NOT NULL,
  article_count integer DEFAULT 0,
  summary text,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(symbol, recorded_at)
);

ALTER TABLE public.sentiment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sentiment"
  ON public.sentiment_records FOR SELECT USING (true);
