ALTER TABLE public.books ADD COLUMN IF NOT EXISTS google_books_id text UNIQUE;
