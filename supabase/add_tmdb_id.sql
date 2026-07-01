-- Add tmdb_id to link TMDB API items with local DB overrides
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS tmdb_id integer UNIQUE;
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS tmdb_id integer UNIQUE;
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON public.movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_series_tmdb_id ON public.series(tmdb_id);
