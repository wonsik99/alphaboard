-- Repair drift between the remote `portfolios` table and the app code:
-- an earlier version of the table was provisioned without the `quantity`
-- column, so inserts from the Portfolio page fail with
--   "could not find the 'quantity' column of 'portfolios' in the schema cache"
-- This migration is idempotent: safe to re-run and safe on databases where
-- the column is already present.
ALTER TABLE IF EXISTS public.portfolios
  ADD COLUMN IF NOT EXISTS quantity numeric NOT NULL DEFAULT 0;

-- Historical rows (if any) won't have a sensible quantity. Keep the default
-- (0) but drop the DEFAULT going forward so new inserts are forced to
-- provide it, matching the original migration's intent.
ALTER TABLE IF EXISTS public.portfolios
  ALTER COLUMN quantity DROP DEFAULT;

-- Ask PostgREST to reload its schema cache immediately so the new column is
-- visible to the REST API without waiting for the next periodic refresh.
NOTIFY pgrst, 'reload schema';
